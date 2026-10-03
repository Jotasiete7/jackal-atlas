#!/usr/bin/env python3
"""
build_jackal_map.py — Gerador de Mapas de Alta Precisão para o Servidor Jackal (Wurm Online)

Unifica e replica o sucesso do pipeline cartográfico Swisstopo/Goldfish do Harmony,
adaptado com precisão para as mecânicas do servidor Jackal:
  - Preservação da narrativa: Terras tomadas/corrompidas por Jackal (tons avermelhados nobres)
    vs Oásis de Beacons conquistados (círculos verdes com autorização de deeds).
  - Água plana, desanuviada e sem ruído (estilo cartográfico suíço).
  - Curvas de nível 1px vetorizadas (sépia alpino na terra, azul batimétrico na água).
  - Sombreamento de relevo 3D de alta precisão (Horn Ortogonal 315° NW ou Luminância Isométrica).
  - Fatiamento automático em pirâmide de tiles Leaflet (Zooms 0 a 4).
"""

import argparse
import io
import json
import math
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


# =============================================================================
# 1. CONVERSÃO PERCEPTUAL CIE L*a*b* E RECOLORAÇÃO
# =============================================================================

def parse_hex_color(hex_str: str) -> tuple[int, int, int]:
    s = hex_str.strip().lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def rgb_to_lab(rgb_array: np.ndarray) -> np.ndarray:
    rgb = np.asarray(rgb_array, dtype=np.float64) / 255.0
    mask = rgb > 0.04045
    rgb[mask] = ((rgb[mask] + 0.055) / 1.055) ** 2.4
    rgb[~mask] = rgb[~mask] / 12.92

    matrix = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041]
    ], dtype=np.float64)
    xyz = rgb @ matrix.T

    xyz[:, 0] /= 0.95047
    xyz[:, 1] /= 1.00000
    xyz[:, 2] /= 1.08883

    epsilon = 0.008856
    kappa = 903.3
    mask_xyz = xyz > epsilon
    f_xyz = np.where(mask_xyz, xyz ** (1.0 / 3.0), (kappa * xyz + 16.0) / 116.0)

    L = 116.0 * f_xyz[:, 1] - 16.0
    a = 500.0 * (f_xyz[:, 0] - f_xyz[:, 1])
    b = 200.0 * (f_xyz[:, 1] - f_xyz[:, 2])

    return np.column_stack((L, a, b))


def recolor_terrain(terrain_arr: np.ndarray, palette_map_path: str) -> np.ndarray:
    print(f"[*] Recoloração: Carregando paleta Jackal de: {palette_map_path}")
    with open(palette_map_path, "r", encoding="utf-8") as f:
        palette_map = json.load(f)

    sentinel_rgbs = set()
    for s in palette_map.get("sentinels", []):
        if "rgb" in s:
            sentinel_rgbs.add(tuple(s["rgb"]))
        elif "hex" in s:
            sentinel_rgbs.add(parse_hex_color(s["hex"]))

    mappings = palette_map.get("mappings", [])
    if not mappings:
        raise ValueError("Nenhum mapeamento encontrado no palette_map!")

    src_rgbs = []
    dst_rgbs = []
    for m in mappings:
        s_rgb = tuple(m["source_rgb"]) if "source_rgb" in m else parse_hex_color(m["source_hex"])
        d_rgb = tuple(m["target_rgb"]) if "target_rgb" in m else parse_hex_color(m["target_hex"])
        src_rgbs.append(s_rgb)
        dst_rgbs.append(d_rgb)

    src_lab = rgb_to_lab(np.array(src_rgbs, dtype=np.float64))
    dst_arr = np.array(dst_rgbs, dtype=np.uint8)

    h, w, _ = terrain_arr.shape
    flat = terrain_arr.reshape(-1, 3)

    flat_u32 = (flat[:, 0].astype(np.uint32) << 16) | \
               (flat[:, 1].astype(np.uint32) << 8) | \
                flat[:, 2].astype(np.uint32)

    unq_u32, inverse_indices = np.unique(flat_u32, return_inverse=True)
    num_unique = len(unq_u32)
    print(f"[*] {num_unique} cores únicas identificadas em {w}x{h} ({w*h:,} px)...")

    unq_r = (unq_u32 >> 16) & 0xFF
    unq_g = (unq_u32 >> 8) & 0xFF
    unq_b = unq_u32 & 0xFF
    unq_rgb = np.column_stack((unq_r, unq_g, unq_b))

    lut = np.zeros((num_unique, 3), dtype=np.uint8)
    unq_lab = rgb_to_lab(unq_rgb)

    sentinels_preserved = 0
    for i in range(num_unique):
        cur_rgb = (int(unq_r[i]), int(unq_g[i]), int(unq_b[i]))
        if cur_rgb in sentinel_rgbs:
            lut[i] = unq_rgb[i]
            sentinels_preserved += 1
            continue

        diffs = src_lab - unq_lab[i]
        dists_sq = np.sum(diffs ** 2, axis=1)
        best_idx = int(np.argmin(dists_sq))
        lut[i] = dst_arr[best_idx]

    print(f"[OK] LUT calculada: {num_unique - sentinels_preserved} cores remapeadas, {sentinels_preserved} sentinelas protegidas.")
    recolored = lut[inverse_indices].reshape((h, w, 3))
    return recolored


# =============================================================================
# 2. SOMBREAMENTO DE RELEVO (HILLSHADING)
# =============================================================================

def apply_relief_from_iso(
    base_arr: np.ndarray,
    terrain_path: str,
    iso_path: str,
    intensity: float = 55.0,
    water_mask_strict: bool = True
) -> np.ndarray:
    """
    Aplica relevo usando a luminância pré-calculada de iso.png,
    com neutralização estrita sobre os corpos d'água para evitar estrias de ondas.
    """
    if intensity <= 0 or not os.path.exists(iso_path):
        return base_arr

    print(f"[*] Aplicando relevo a partir de: {iso_path} (intensidade: {intensity}%)")
    terrain = np.array(Image.open(terrain_path).convert("RGB"), dtype=np.float32)
    iso = np.array(Image.open(iso_path).convert("RGB"), dtype=np.float32)

    t_lum = 0.299 * terrain[:, :, 0] + 0.587 * terrain[:, :, 1] + 0.114 * terrain[:, :, 2]
    i_lum = 0.299 * iso[:, :, 0] + 0.587 * iso[:, :, 1] + 0.114 * iso[:, :, 2]

    # Razão de shading isolada
    shading_ratio = np.clip(i_lum / np.maximum(t_lum, 1.0), 0.2, 1.8)

    # Identificar água para neutralizar
    # No Jackal, a água tem canais verdes e azuis mais altos que o vermelho (ex: #3c5854 = 60, 88, 84)
    # ou azul > vermelho
    is_water = (terrain[:, :, 1] > terrain[:, :, 0] + 10) & (terrain[:, :, 2] > terrain[:, :, 0] + 10)
    # Também considerar águas azuladas puras
    is_water |= (terrain[:, :, 2] > terrain[:, :, 0] + 15)

    if water_mask_strict:
        shading_ratio[is_water] = 1.0  # Neutro: sem ondas na água

    factor = float(intensity) / 100.0
    base_float = base_arr.astype(np.float32)
    shaded = base_float * (1.0 - factor + factor * shading_ratio[:, :, np.newaxis])
    shaded = np.clip(shaded, 0, 255).astype(np.uint8)
    print(f"[OK] Relevo aplicado com sucesso.")
    return shaded


# =============================================================================
# 3. EXTRAÇÃO E APLICAÇÃO DE CURVAS DE NÍVEL
# =============================================================================

def apply_contours(
    base_arr: np.ndarray,
    terrain_path: str,
    topo_path: str,
    land_color: tuple[int, int, int] = (90, 70, 52),     # Sépia alpino
    water_color: tuple[int, int, int] = (86, 128, 158),  # Azul batimétrico
    opacity: float = 0.80
) -> np.ndarray:
    if not os.path.exists(topo_path):
        print("[-] Topo não encontrado. Pulando curvas.")
        return base_arr

    print(f"[*] Extraindo curvas de nível de 1px a partir de: {topo_path}")
    terrain = np.array(Image.open(terrain_path).convert("RGB"))
    topo = np.array(Image.open(topo_path).convert("RGB"))

    # Máscara exata de contornos: pixels pretos no topo que não eram pretos no terrain
    is_black_topo = (topo[:, :, 0] == 0) & (topo[:, :, 1] == 0) & (topo[:, :, 2] == 0)
    is_black_terrain = (terrain[:, :, 0] == 0) & (terrain[:, :, 1] == 0) & (terrain[:, :, 2] == 0)
    contour_mask = is_black_topo & ~is_black_terrain

    pixel_count = int(np.sum(contour_mask))
    print(f"[*] Curvas de nível identificadas: {pixel_count:,} pixels exatos (1px de espessura).")

    # Identificar se a curva passa por terra ou por água
    is_water = (terrain[:, :, 1] > terrain[:, :, 0] + 10) & (terrain[:, :, 2] > terrain[:, :, 0] + 10)
    is_water |= (terrain[:, :, 2] > terrain[:, :, 0] + 15)

    land_contour = contour_mask & ~is_water
    water_contour = contour_mask & is_water

    result = base_arr.copy()
    c_land = np.array(land_color, dtype=np.float32)
    c_water = np.array(water_color, dtype=np.float32)
    op = float(np.clip(opacity, 0.0, 1.0))

    result[land_contour] = ((1.0 - op) * result[land_contour].astype(np.float32) + op * c_land).astype(np.uint8)
    result[water_contour] = ((1.0 - op) * result[water_contour].astype(np.float32) + op * c_water).astype(np.uint8)

    # Preservar minas originais em preto puro
    result[is_black_terrain] = [0, 0, 0]

    print(f"[OK] Curvas de nível aplicadas (Opacidade: {int(opacity*100)}%).")
    return result


# =============================================================================
# 4. FATIADOR LEAFLET (PIRÂMIDE DE TILES ZOOMS 0 A 4)
# =============================================================================

def slice_leaflet_tiles(image_arr: np.ndarray, output_dir: str, max_zoom: int = 4, tile_size: int = 256):
    print(f"\n[*] Fatiando imagem em pirâmide de tiles Leaflet (Zooms 0 a {max_zoom})...")
    os.makedirs(output_dir, exist_ok=True)
    full_img = Image.fromarray(image_arr)
    base_dim = 2 ** max_zoom * tile_size

    if full_img.size != (base_dim, base_dim):
        print(f"[*] Redimensionando imagem de entrada para {base_dim}x{base_dim}px...")
        full_img = full_img.resize((base_dim, base_dim), Image.Resampling.LANCZOS)

    for z in range(max_zoom, -1, -1):
        num_tiles = 2 ** z
        current_dim = num_tiles * tile_size
        print(f"[*] Gerando Zoom {z} ({num_tiles}x{num_tiles} = {num_tiles*num_tiles} tiles)...")

        if z == max_zoom:
            zoom_img = full_img
        else:
            zoom_img = full_img.resize((current_dim, current_dim), Image.Resampling.LANCZOS)

        zoom_dir = os.path.join(output_dir, str(z))
        os.makedirs(zoom_dir, exist_ok=True)

        for x in range(num_tiles):
            x_dir = os.path.join(zoom_dir, str(x))
            os.makedirs(x_dir, exist_ok=True)
            for y in range(num_tiles):
                box = (x * tile_size, y * tile_size, (x + 1) * tile_size, (y + 1) * tile_size)
                tile = zoom_img.crop(box)
                tile_path = os.path.join(x_dir, f"{y}.png")
                tile.save(tile_path, "PNG", optimize=True)

    print(f"[OK] Pirâmide de tiles salva com sucesso em: {output_dir}")


# =============================================================================
# 5. EXECUÇÃO PRINCIPAL
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Gerador de Mapas Cartográficos de Jackal (Swisstopo Style)")
    parser.add_argument("-i", "--terrain", default="Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png", help="Caminho do terrain.png")
    parser.add_argument("-t", "--topo", default="Jackal-Atlas/maps/raw/jackal_original_topo_4096.png", help="Caminho do topo.png")
    parser.add_argument("-s", "--iso", default="Jackal-Atlas/maps/raw/jackal_original_iso_4096.png", help="Caminho do iso.png")
    parser.add_argument("-p", "--palette", default="Jackal-Atlas/maps/palettes/palette_jackal_swisstopo.json", help="Arquivo palette_map.json")
    parser.add_argument("-o", "--output", default="Jackal-Atlas/maps/processed/jackal_swisstopo_4096.png", help="Caminho do mapa final composto")
    parser.add_argument("-r", "--relief", type=float, default=50.0, help="Intensidade do relevo/sombreamento (0 a 100%%)")
    parser.add_argument("-c", "--contour-opacity", type=float, default=0.80, help="Opacidade das curvas de nível (0.0 a 1.0)")
    parser.add_argument("--tiles-dir", default=None, help="Diretório para salvar a pirâmide de tiles Leaflet (ex: Jackal-Atlas/tiles_custom)")
    args = parser.parse_args()

    start_time = time.time()
    print("======================================================================")
    print("  🗺️ PIPELINE CARTOGRÁFICO DE ALTA PRECISÃO — SERVIDOR JACKAL")
    print("======================================================================\n")

    if not os.path.exists(args.terrain):
        print(f"[-] Erro: Terreno original não encontrado em: {args.terrain}", file=sys.stderr)
        sys.exit(1)

    # 1. Carregar Terreno
    terrain_pil = Image.open(args.terrain).convert("RGB")
    terrain_arr = np.array(terrain_pil, dtype=np.uint8)

    # 2. Recoloração Cartográfica
    if os.path.exists(args.palette):
        current_map = recolor_terrain(terrain_arr, args.palette)
    else:
        print(f"[!] Paleta {args.palette} não encontrada. Usando cores originais.")
        current_map = terrain_arr.copy()

    # 3. Sombreamento Tridimensional de Relevo
    if args.relief > 0 and os.path.exists(args.iso):
        current_map = apply_relief_from_iso(
            base_arr=current_map,
            terrain_path=args.terrain,
            iso_path=args.iso,
            intensity=args.relief,
            water_mask_strict=True
        )

    # 4. Curvas de Nível Cartográficas
    if os.path.exists(args.topo):
        current_map = apply_contours(
            base_arr=current_map,
            terrain_path=args.terrain,
            topo_path=args.topo,
            opacity=args.contour_opacity
        )

    # 5. Salvar Imagem Composta Final 4096px
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    final_pil = Image.fromarray(current_map)
    final_pil.save(args.output, "PNG", optimize=True)
    elapsed = time.time() - start_time
    size_mb = os.path.getsize(args.output) / (1024 * 1024)
    print(f"\n[OK] Mapa de Jackal gerado com sucesso em: {args.output} ({size_mb:.2f} MB, {elapsed:.1f}s)")

    # 6. Fatiar Tiles Web Leaflet se solicitado
    if args.tiles_dir:
        slice_leaflet_tiles(current_map, args.tiles_dir)

    print("\n[✓] PROCESSO COMPLETO CONCLUÍDO COM SUCESSO!")


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    main()
