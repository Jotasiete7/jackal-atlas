#!/usr/bin/env python3
"""
build_jackal_map.py — Gerador Cartográfico de Alta Precisão para Jackal (Wurm Online)
Pipeline SwissTopo Jackal Calibrado:
  - Recoloração perceptual em espaço CIE L*a*b* via Look-Up Table (LUT)
  - Sombreamento tridimensional real calibrado com máscara estrita de água neutra
  - Curvas de nível e batimetria em carvão mineral e azul ardósia de alto contraste
  - Fatiador em pirâmide de tiles Leaflet (Zooms 0 a 4)
"""

import argparse
import io
import json
import math
import os
import sys
import time
from pathlib import Path
import numpy as np
from PIL import Image


# =============================================================================
# 1. UTILITÁRIOS DE COR E CONVERSÃO PERCEPTUAL CIE L*a*b*
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
    print(f"[*] Recoloração: Carregando paleta calibrada de: {palette_map_path}")
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
    return lut[inverse_indices].reshape((h, w, 3))


# =============================================================================
# 2. IDENTIFICAÇÃO DE ÁGUA E EXTRAÇÃO DE CURVAS DE NÍVEL
# =============================================================================

def extract_contours_and_water(terrain_arr: np.ndarray, topo_arr: np.ndarray):
    """
    Identifica água real e extrai curvas de nível com 1 pixel de fidelidade.
    """
    is_black_topo = (topo_arr[:, :, 0] == 0) & (topo_arr[:, :, 1] == 0) & (topo_arr[:, :, 2] == 0)
    is_black_terrain = (terrain_arr[:, :, 0] == 0) & (terrain_arr[:, :, 1] == 0) & (terrain_arr[:, :, 2] == 0)
    contour_mask = is_black_topo & ~is_black_terrain

    r = terrain_arr[:, :, 0].astype(np.int32)
    g = terrain_arr[:, :, 1].astype(np.int32)
    b = terrain_arr[:, :, 2].astype(np.int32)

    # Assinatura de água em Jackal (inclui pântanos, oceanos e lagos)
    is_water = ((b >= 75) & (b > r + 8) & (g > r + 8)) | ((b >= 90) & (b > r + 15))
    is_land = ~is_water

    c_land_count = int(np.sum(contour_mask & is_land))
    c_water_count = int(np.sum(contour_mask & is_water))
    print(f"[OK] Curvas isoladas: {c_land_count:,} px em terra, {c_water_count:,} px em água.")
    return contour_mask, is_water, is_land, is_black_terrain


# =============================================================================
# 3. SOMBREAMENTO TRIDIMENSIONAL (HILLSHADING) COM MÁSCARA NEUTRA DE ÁGUA
# =============================================================================

def apply_hillshading(
    recolored_base: np.ndarray,
    terrain_arr: np.ndarray,
    iso_arr: np.ndarray,
    is_water: np.ndarray,
    relief_intensity: float = 60.0
) -> np.ndarray:
    """
    Extrai a razão de iluminação pura do relevo nativo (iso / terrain)
    e aplica multiplicativamente com máscara de água neutra (zero ruído de ondas).
    """
    print(f"[*] Relevo 3D: Aplicando hillshading com intensidade de {relief_intensity}%...")
    t_lum = 0.299 * terrain_arr[:, :, 0] + 0.587 * terrain_arr[:, :, 1] + 0.114 * terrain_arr[:, :, 2]
    i_lum = 0.299 * iso_arr[:, :, 0] + 0.587 * iso_arr[:, :, 1] + 0.114 * iso_arr[:, :, 2]

    # Razão de luminância (valores > 1 iluminam encostas a noroeste, < 1 escurecem sombras a sudeste)
    shading_ratio = np.clip(i_lum / np.maximum(t_lum, 1.0), 0.25, 1.80)

    # Travar corpos d'água no valor 1.0 neutro absoluto
    shading_ratio[is_water] = 1.0

    factor = float(relief_intensity) / 100.0
    base_float = recolored_base.astype(np.float32)

    shaded = base_float * ((1.0 - factor) + factor * shading_ratio[:, :, np.newaxis])
    shaded_arr = np.clip(shaded, 0, 255).astype(np.uint8)
    print("[OK] Relevo 3D aplicado com sucesso.")
    return shaded_arr


# =============================================================================
# 4. COMPOSIÇÃO DE CURVAS DE NÍVEL EM ALTO CONTRASTE
# =============================================================================

def apply_contours(
    shaded_arr: np.ndarray,
    contour_mask: np.ndarray,
    is_water: np.ndarray,
    is_land: np.ndarray,
    is_black_terrain: np.ndarray,
    land_color_rgb: tuple[int, int, int] = (36, 26, 22),       # Carvão / grafite mineral
    water_color_rgb: tuple[int, int, int] = (62, 105, 132),    # Azul ardósia batimétrico
    land_opacity: float = 0.90,
    water_opacity: float = 0.85
) -> np.ndarray:
    print(f"[*] Curvas de Nível: Desenhando traçados (Terra: {land_color_rgb} {land_opacity*100:.0f}%, Água: {water_color_rgb})...")
    result = shaded_arr.copy()

    c_land = contour_mask & is_land
    c_water = contour_mask & is_water

    c_land_arr = np.array(land_color_rgb, dtype=np.float32)
    c_water_arr = np.array(water_color_rgb, dtype=np.float32)

    result[c_land] = (
        (1.0 - land_opacity) * result[c_land].astype(np.float32) + land_opacity * c_land_arr
    ).astype(np.uint8)

    result[c_water] = (
        (1.0 - water_opacity) * result[c_water].astype(np.float32) + water_opacity * c_water_arr
    ).astype(np.uint8)

    # Preservar minas e sentinelas em preto puro
    result[is_black_terrain] = [0, 0, 0]

    print("[OK] Curvas de nível integradas.")
    return result


# =============================================================================
# 5. FATIADOR LEAFLET (ZOOMS 0 A 4)
# =============================================================================

def slice_leaflet_tiles(image_arr: np.ndarray, output_dir: str, max_zoom: int = 4, tile_size: int = 256):
    print(f"\n[*] Fatiando imagem em pirâmide de tiles Leaflet (Zooms 0 a {max_zoom})...")
    os.makedirs(output_dir, exist_ok=True)
    full_img = Image.fromarray(image_arr)
    base_dim = 2 ** max_zoom * tile_size

    if full_img.size != (base_dim, base_dim):
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

    print(f"[OK] Fatiamento Leaflet concluído em: {output_dir}")


# =============================================================================
# 6. EXECUÇÃO PRINCIPAL
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Gerador de Mapas de Jackal (Swisstopo Calibrado)")
    parser.add_argument("-i", "--terrain", default=r"D:\Projetos\Wurm-Online\Jackal-Atlas\maps\raw\jackal_original_terrain_4096.png", help="Caminho do terrain.png")
    parser.add_argument("-t", "--topo", default=r"D:\Projetos\Wurm-Online\Jackal-Atlas\maps\raw\jackal_original_topo_4096.png", help="Caminho do topo.png")
    parser.add_argument("-s", "--iso", default=r"D:\Projetos\Wurm-Online\Jackal-Atlas\maps\raw\jackal_original_iso_4096.png", help="Caminho do iso.png")
    parser.add_argument("-p", "--palette", default=r"D:\Projetos\Wurm-Online\Jackal-Atlas\maps\palettes\palette_jackal_swisstopo.json", help="Arquivo palette.json")
    parser.add_argument("-o", "--output", default=r"D:\Projetos\Wurm-Online\Jackal-Atlas\maps\processed\jackal_swisstopo_4096.png", help="Caminho do mapa final composto")
    parser.add_argument("-r", "--relief", type=float, default=60.0, help="Intensidade do relevo (0 a 100%%)")
    parser.add_argument("--tiles-dir", default=r"D:\Projetos\Wurm-Online\Jackal-Atlas\tiles_custom", help="Diretório dos tiles Leaflet")
    args = parser.parse_args()

    start_time = time.time()
    print("======================================================================")
    print("  🗺️ JACKAL ATLAS — PIPELINE SWISSTOPO CALIBRADO")
    print("======================================================================\n")

    if not os.path.exists(args.terrain) or not os.path.exists(args.topo) or not os.path.exists(args.iso):
        print("[-] Erro: Um ou mais arquivos de entrada (terrain, topo, iso) não foram encontrados.", file=sys.stderr)
        sys.exit(1)

    print(f"[*] Lendo terrain: {args.terrain}")
    terrain_arr = np.array(Image.open(args.terrain).convert("RGB"), dtype=np.uint8)
    print(f"[*] Lendo topo: {args.topo}")
    topo_arr = np.array(Image.open(args.topo).convert("RGB"), dtype=np.uint8)
    print(f"[*] Lendo iso: {args.iso}")
    iso_arr = np.array(Image.open(args.iso).convert("RGB"), dtype=np.uint8)

    # 1. Recoloração cartográfica calibrada
    if os.path.exists(args.palette):
        recolored_base = recolor_terrain(terrain_arr, args.palette)
    else:
        print("[!] Aviso: Paleta não encontrada. Usando terreno original.")
        recolored_base = terrain_arr.copy()

    # 2. Extração de curvas e detecção de água
    contour_mask, is_water, is_land, is_black_terrain = extract_contours_and_water(terrain_arr, topo_arr)

    # 3. Sombreamento 3D com máscara de água neutra
    shaded_arr = apply_hillshading(
        recolored_base=recolored_base,
        terrain_arr=terrain_arr,
        iso_arr=iso_arr,
        is_water=is_water,
        relief_intensity=args.relief
    )

    # 4. Curvas de nível em alto contraste mineral
    final_arr = apply_contours(
        shaded_arr=shaded_arr,
        contour_mask=contour_mask,
        is_water=is_water,
        is_land=is_land,
        is_black_terrain=is_black_terrain,
        land_color_rgb=(36, 26, 22),
        water_color_rgb=(62, 105, 132),
        land_opacity=0.90,
        water_opacity=0.85
    )

    # 5. Salvar mapa mestre composto
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    final_pil = Image.fromarray(final_arr)
    print(f"[*] Salvando mapa mestre PNG: {args.output}...")
    final_pil.save(args.output, "PNG", optimize=True)

    elapsed = time.time() - start_time
    size_mb = os.path.getsize(args.output) / (1024 * 1024)
    print(f"\n[OK] Mapa mestre gerado: {args.output} ({size_mb:.2f} MB em {elapsed:.1f}s)")

    # 6. Fatiar pirâmide de tiles Leaflet
    if args.tiles_dir:
        slice_leaflet_tiles(final_arr, args.tiles_dir)

    print("\n[✓] PROCESSO COMPLETO CONCLUÍDO COM SUCESSO!")


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    main()
