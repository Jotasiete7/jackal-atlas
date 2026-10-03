#!/usr/bin/env python3
"""
build_jackal_map.py — Gerador Cartográfico de Ultra-Alta Precisão para Jackal (Wurm Online)
Pipeline SwissTopo Goldfish 2.0 (DEM & Horn Hillshading Ortogonal Puro)

Elimina 100% o erro clássico de "ruas fantasmas tortas":
  - O mapa isométrico (iso.png / classic.png) do Wurm projeta montanhas e estradas a 45° ao Norte,
    o que causava o "duplo traçado" (estrada reta do terreno misturada com estrada torta da sombra).
  - Este script gera o Modelo Digital de Elevação (DEM) matematicamente a partir de topo.png,
    calculando o sombreamento de Horn (315° NW, 45° Sol) em projeção 100% ortogonal (Nadir).
  - Ruas, cercas, deeds e minas ficam rigorosamente alinhadas pixel a pixel (1:1), sem estrias ou fantasmas.
"""

import argparse
import io
import json
import math
import os
import sys
import time
from collections import deque
from pathlib import Path

import cv2
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
    print(f"[*] Recoloração: Carregando paleta de: {palette_map_path}")
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
# 2. EXTRAÇÃO CIRÚRGICA DE CURVAS DE NÍVEL E IDENTIFICAÇÃO DE ÁGUA
# =============================================================================

def extract_contours(terrain_arr: np.ndarray, topo_arr: np.ndarray):
    """
    Isola a máscara binária exata das curvas de nível em 1 pixel.
    Para Jackal: identifica água real (mar e lago) sem confundir com depósitos de piche/tar (18, 21, 40).
    """
    is_black_topo = (topo_arr[:, :, 0] == 0) & (topo_arr[:, :, 1] == 0) & (topo_arr[:, :, 2] == 0)
    is_black_terrain = (terrain_arr[:, :, 0] == 0) & (terrain_arr[:, :, 1] == 0) & (terrain_arr[:, :, 2] == 0)
    contour_mask = is_black_topo & ~is_black_terrain

    r = terrain_arr[:, :, 0].astype(np.int32)
    g = terrain_arr[:, :, 1].astype(np.int32)
    b = terrain_arr[:, :, 2].astype(np.int32)

    # Assinatura de água em Jackal (inclui tons esverdeados/azulados de pântano e oceano profundo)
    # Exclui tar (b=40, g=21, r=18)
    is_water = ((b >= 75) & (b > r + 8) & (g > r + 8)) | ((b >= 90) & (b > r + 15))
    is_land = ~is_water

    c_land_count = int(np.sum(contour_mask & is_land))
    c_water_count = int(np.sum(contour_mask & is_water))
    print(f"[OK] Curvas isoladas: {c_land_count:,} px em terra, {c_water_count:,} px em água (Total: {c_land_count + c_water_count:,} px).")

    return contour_mask, is_water, is_land, is_black_terrain


# =============================================================================
# 3. ATRIBUIÇÃO DE ALTITUDES VIA GRAFO TOPOLÓGICO (RAG + BFS)
# =============================================================================

def assign_elevations(
    contour_mask: np.ndarray,
    is_water: np.ndarray,
    is_land: np.ndarray,
    elevation_step_land: float = 20.0,
    elevation_step_water: float = 10.0
):
    h, w = contour_mask.shape
    print("[*] Topologia: Segmentando regiões planares...")

    passable_land = (~contour_mask & is_land).astype(np.uint8)
    num_land, labels_land = cv2.connectedComponents(passable_land, connectivity=4)

    # Adjacência vertical e horizontal através de curvas
    top = labels_land[:-2, 1:-1]
    bot = labels_land[2:, 1:-1]
    mid_c = contour_mask[1:-1, 1:-1]
    left = labels_land[1:-1, :-2]
    right = labels_land[1:-1, 2:]

    v_mask = mid_c & (top > 0) & (bot > 0) & (top != bot)
    h_mask = mid_c & (left > 0) & (right > 0) & (left != right)

    pairs_v = np.column_stack((top[v_mask], bot[v_mask]))
    pairs_h = np.column_stack((left[h_mask], right[h_mask]))
    all_pairs = np.sort(np.vstack((pairs_v, pairs_h)), axis=1)
    unique_pairs = np.unique(all_pairs, axis=0)

    adj_land = {i: [] for i in range(1, num_land)}
    for u, v in unique_pairs:
        adj_land[u].append(v)
        adj_land[v].append(u)

    # Costa como âncora absoluta (Z = 0)
    coast_mask = cv2.dilate(is_water.astype(np.uint8), np.ones((3, 3))) & is_land.astype(np.uint8)
    coast_labels = set(np.unique(labels_land[coast_mask > 0]))
    coast_labels.discard(0)

    dist_land = {i: -1 for i in range(1, num_land)}
    q = deque()
    for c in coast_labels:
        dist_land[c] = 0
        q.append(c)

    while q:
        curr = q.popleft()
        d = dist_land[curr]
        for n in adj_land[curr]:
            if dist_land[n] == -1:
                dist_land[n] = d + 1
                q.append(n)

    for k, v in dist_land.items():
        if v == -1:
            dist_land[k] = 0

    # Reconhecer cumes locais
    is_peak_region = np.zeros(num_land, dtype=bool)
    for u in range(1, num_land):
        d_u = dist_land[u]
        if d_u > 0:
            higher = [v for v in adj_land[u] if dist_land[v] > d_u]
            if len(higher) == 0:
                is_peak_region[u] = True

    print(f"[OK] Topologia: {int(np.sum(is_peak_region)):,} cumes locais identificados.")

    # Regiões de água (Batimetria)
    passable_water = (~contour_mask & is_water).astype(np.uint8)
    num_water, labels_water = cv2.connectedComponents(passable_water, connectivity=4)

    top_w = labels_water[:-2, 1:-1]
    bot_w = labels_water[2:, 1:-1]
    left_w = labels_water[1:-1, :-2]
    right_w = labels_water[1:-1, 2:]

    v_mask_w = mid_c & (top_w > 0) & (bot_w > 0) & (top_w != bot_w)
    h_mask_w = mid_c & (left_w > 0) & (right_w > 0) & (left_w != right_w)

    pairs_vw = np.column_stack((top_w[v_mask_w], bot_w[v_mask_w]))
    pairs_hw = np.column_stack((left_w[h_mask_w], right_w[h_mask_w]))
    all_pairs_w = np.sort(np.vstack((pairs_vw, pairs_hw)), axis=1)
    unique_pairs_w = np.unique(all_pairs_w, axis=0)

    adj_water = {i: [] for i in range(1, num_water)}
    for u, v in unique_pairs_w:
        adj_water[u].append(v)
        adj_water[v].append(u)

    coast_water_mask = cv2.dilate(is_land.astype(np.uint8), np.ones((3, 3))) & is_water.astype(np.uint8)
    coast_water_labels = set(np.unique(labels_water[coast_water_mask > 0]))
    coast_water_labels.discard(0)

    dist_water = {i: -1 for i in range(1, num_water)}
    qw = deque()
    for cw in coast_water_labels:
        dist_water[cw] = 0
        qw.append(cw)

    while qw:
        curr = qw.popleft()
        d = dist_water[curr]
        for n in adj_water[curr]:
            if dist_water[n] == -1:
                dist_water[n] = d + 1
                qw.append(n)

    max_w_d = max(dist_water.values()) if dist_water else 4
    for k, v in dist_water.items():
        if v == -1:
            dist_water[k] = max_w_d

    lut_land = np.zeros(num_land, dtype=np.float32)
    for k, v in dist_land.items():
        lut_land[k] = v * elevation_step_land

    lut_water = np.zeros(num_water, dtype=np.float32)
    for k, v in dist_water.items():
        lut_water[k] = -(v * elevation_step_water)

    elev_raw = np.zeros((h, w), dtype=np.float32)
    elev_raw[is_land] = lut_land[labels_land[is_land]]
    elev_raw[is_water] = lut_water[labels_water[is_water]]

    c_land_mask = contour_mask & is_land
    c_water_mask = contour_mask & is_water
    kernel_c = np.ones((3, 3), dtype=np.uint8)

    dil_land = cv2.dilate(elev_raw, kernel_c)
    ero_water = cv2.erode(elev_raw, kernel_c)

    elev_raw[c_land_mask] = dil_land[c_land_mask]
    elev_raw[c_water_mask] = ero_water[c_water_mask]

    print(f"[OK] Relevo bruto: Mín={np.min(elev_raw):.1f}m, Máx={np.max(elev_raw):.1f}m.")
    return elev_raw, is_peak_region, labels_land


# =============================================================================
# 4. INTERPOLAÇÃO DA SUPERFÍCIE CONTÍNUA DO DEM (C1)
# =============================================================================

def build_continuous_dem(
    elev_raw: np.ndarray,
    is_water: np.ndarray,
    is_land: np.ndarray,
    is_peak_region: np.ndarray,
    labels_land: np.ndarray,
    elevation_step_land: float = 20.0,
    elevation_step_water: float = 10.0
) -> np.ndarray:
    print("[*] DEM: Interpolando superfície contínua C1 e cumes convexos...")
    dem = elev_raw.copy()

    # Cumes convexos naturais
    peak_pixels_mask = is_peak_region[labels_land] & is_land
    if np.any(peak_pixels_mask):
        dist_from_peak_border = cv2.distanceTransform(peak_pixels_mask.astype(np.uint8), cv2.DIST_L2, 3)
        dem[peak_pixels_mask] += (elevation_step_land * 0.75) * (
            dist_from_peak_border[peak_pixels_mask] / (dist_from_peak_border[peak_pixels_mask] + 8.0)
        )

    # Rampas entre curvas em terra
    max_land = int(np.max(elev_raw))
    step_l = int(elevation_step_land)
    for lvl in range(0, max_land, step_l):
        slope_mask = (elev_raw == lvl) & is_land & ~peak_pixels_mask
        higher_mask = (elev_raw > lvl) & is_land
        if np.any(slope_mask) and np.any(higher_mask):
            dist_to_higher = cv2.distanceTransform((~higher_mask).astype(np.uint8), cv2.DIST_L2, 3)
            lower_mask = (elev_raw < lvl) | is_water
            dist_to_lower = cv2.distanceTransform((~lower_mask).astype(np.uint8), cv2.DIST_L2, 3)

            d_up = dist_to_higher[slope_mask]
            d_dn = dist_to_lower[slope_mask]
            total_d = d_up + d_dn
            w_up = np.where(total_d > 0, d_dn / total_d, 0.5)
            dem[slope_mask] = lvl + elevation_step_land * w_up

    # Leito marinho contínuo
    min_water = int(np.min(elev_raw))
    step_w = int(elevation_step_water)
    for lvl_w in range(min_water, 0, step_w):
        w_mask = (elev_raw == lvl_w) & is_water
        higher_w = (elev_raw > lvl_w) | is_land
        if np.any(w_mask) and np.any(higher_w):
            d_to_higher_w = cv2.distanceTransform((~higher_w).astype(np.uint8), cv2.DIST_L2, 3)
            lower_w = (elev_raw < lvl_w) & is_water
            if np.any(lower_w):
                d_to_lower_w = cv2.distanceTransform((~lower_w).astype(np.uint8), cv2.DIST_L2, 3)
                total_w = d_to_higher_w[w_mask] + d_to_lower_w[w_mask]
                w_factor = np.where(total_w > 0, d_to_higher_w[w_mask] / total_w, 0.5)
                dem[w_mask] = (lvl_w + elevation_step_water) - elevation_step_water * w_factor

    dem_smooth = cv2.GaussianBlur(dem, (7, 7), 1.5)
    print(f"[OK] DEM Contínuo finalizado: Cota de {np.min(dem_smooth):.1f}m a {np.max(dem_smooth):.1f}m.")
    return dem_smooth


# =============================================================================
# 5. HILLSHADING DE HORN ORTOGONAL (315° NW, SOL 45°)
# =============================================================================

def compute_horn_hillshading(
    dem: np.ndarray,
    is_water: np.ndarray,
    cell_size: float = 4.0,
    z_factor: float = 2.0,
    azimuth_deg: float = 315.0,
    elevation_deg: float = 45.0
) -> tuple[np.ndarray, float]:
    print(f"[*] Hillshading de Horn: Projeção ortogonal pura (Luz {azimuth_deg}° NW, Sol {elevation_deg}°)...")
    dz_dx = cv2.Sobel(dem, cv2.CV_32F, 1, 0, ksize=3) / (8.0 * cell_size) * z_factor
    dz_dy = cv2.Sobel(dem, cv2.CV_32F, 0, 1, ksize=3) / (8.0 * cell_size) * z_factor

    sun_azimuth = np.radians(azimuth_deg)
    sun_elevation = np.radians(elevation_deg)

    slope = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
    aspect = np.arctan2(dz_dy, -dz_dx)

    hillshade = np.sin(sun_elevation) * np.cos(slope) + np.cos(sun_elevation) * np.sin(slope) * np.cos(sun_azimuth - aspect)
    hillshade = np.clip(hillshade, 0.0, 1.0)

    # Água travada no valor neutro (zero estrias)
    neutral = float(np.sin(sun_elevation))
    hillshade[is_water] = neutral

    hillshade_8bit = (hillshade * 255.0).clip(0, 255).astype(np.uint8)
    print("[OK] Hillshading ortogonal concluído (sem interferência em estradas).")
    return hillshade_8bit, neutral


# =============================================================================
# 6. COMPOSIÇÃO FINAL SWISSTOPO
# =============================================================================

def compose_swisstopo_map(
    recolored_base: np.ndarray,
    hillshade_8bit: np.ndarray,
    neutral_value: float,
    contour_mask: np.ndarray,
    is_water: np.ndarray,
    is_land: np.ndarray,
    is_black_terrain: np.ndarray,
    relief_intensity: float = 50.0,
    land_curve_color: tuple[int, int, int] = (90, 70, 52),     # Sépia alpino
    water_curve_color: tuple[int, int, int] = (86, 128, 158),  # Azul batimétrico
    curve_opacity: float = 0.80
) -> np.ndarray:
    print(f"[*] Composição: Fundindo relevo Horn ({relief_intensity}%) e curvas de nível...")
    shading_ratio = hillshade_8bit.astype(np.float32) / (neutral_value * 255.0)
    shading_ratio[is_water] = 1.0

    factor = relief_intensity / 100.0
    base_float = recolored_base.astype(np.float32)
    shaded = np.clip(base_float * ((1.0 - factor) + factor * shading_ratio[:, :, np.newaxis]), 0, 255).astype(np.uint8)

    # Desenhar curvas de 1px
    c_land = contour_mask & is_land
    c_water = contour_mask & is_water

    c_land_arr = np.array(land_curve_color, dtype=np.float32)
    c_water_arr = np.array(water_curve_color, dtype=np.float32)

    result = shaded.copy()
    result[c_land] = (
        (1.0 - curve_opacity) * result[c_land].astype(np.float32) + curve_opacity * c_land_arr
    ).astype(np.uint8)

    result[c_water] = (
        (1.0 - curve_opacity) * result[c_water].astype(np.float32) + curve_opacity * c_water_arr
    ).astype(np.uint8)

    # Preservar minas originais em preto puro
    result[is_black_terrain] = [0, 0, 0]

    print("[OK] Composição final concluída.")
    return result


# =============================================================================
# 7. FATIADOR LEAFLET (ZOOMS 0 A 4)
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

    print(f"[OK] Pirâmide de tiles salva com sucesso em: {output_dir}")


# =============================================================================
# 8. EXECUÇÃO PRINCIPAL
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Gerador de Mapas de Jackal (Swisstopo Goldfish 2.0)")
    parser.add_argument("-i", "--terrain", default="Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png", help="Caminho do terrain.png")
    parser.add_argument("-t", "--topo", default="Jackal-Atlas/maps/raw/jackal_original_topo_4096.png", help="Caminho do topo.png")
    parser.add_argument("-p", "--palette", default="Jackal-Atlas/maps/palettes/palette_jackal_swisstopo.json", help="Arquivo palette_map.json")
    parser.add_argument("-o", "--output", default="Jackal-Atlas/maps/processed/jackal_swisstopo_4096.png", help="Caminho do mapa final composto")
    parser.add_argument("-r", "--relief", type=float, default=50.0, help="Intensidade do relevo Horn (0 a 100%%)")
    parser.add_argument("-c", "--contour-opacity", type=float, default=0.80, help="Opacidade das curvas de nível (0.0 a 1.0)")
    parser.add_argument("--tiles-dir", default=None, help="Diretório para salvar a pirâmide de tiles Leaflet (ex: Jackal-Atlas/tiles_custom)")
    args = parser.parse_args()

    start_time = time.time()
    print("======================================================================")
    print("  🗺️ JACKAL ATLAS — PIPELINE SWISSTOPO GOLDFISH 2.0 (SEM ISOMETRIA)")
    print("======================================================================\n")

    if not os.path.exists(args.terrain) or not os.path.exists(args.topo):
        print(f"[-] Erro: terrain ou topo não encontrados.", file=sys.stderr)
        sys.exit(1)

    terrain_arr = np.array(Image.open(args.terrain).convert("RGB"), dtype=np.uint8)
    topo_arr = np.array(Image.open(args.topo).convert("RGB"), dtype=np.uint8)

    # 1. Recoloração cartográfica
    if os.path.exists(args.palette):
        recolored_base = recolor_terrain(terrain_arr, args.palette)
    else:
        recolored_base = terrain_arr.copy()

    # 2. Extração de curvas e detecção de água
    contour_mask, is_water, is_land, is_black_terrain = extract_contours(terrain_arr, topo_arr)

    # 3. Topologia RAG + BFS
    elev_raw, is_peak_region, labels_land = assign_elevations(contour_mask, is_water, is_land)

    # 4. Construção do DEM Contínuo C1
    dem = build_continuous_dem(elev_raw, is_water, is_land, is_peak_region, labels_land)

    # 5. Hillshading de Horn (Ortogonal Puro, Luz 315° NW)
    hillshade_8bit, neutral_val = compute_horn_hillshading(dem, is_water)

    # 6. Composição final
    final_arr = compose_swisstopo_map(
        recolored_base=recolored_base,
        hillshade_8bit=hillshade_8bit,
        neutral_value=neutral_val,
        contour_mask=contour_mask,
        is_water=is_water,
        is_land=is_land,
        is_black_terrain=is_black_terrain,
        relief_intensity=args.relief,
        curve_opacity=args.contour_opacity
    )

    # 7. Salvar imagem mestre 4096px
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    final_pil = Image.fromarray(final_arr)
    final_pil.save(args.output, "PNG", optimize=True)
    elapsed = time.time() - start_time
    size_mb = os.path.getsize(args.output) / (1024 * 1024)
    print(f"\n[OK] Mapa mestre gerado em: {args.output} ({size_mb:.2f} MB, {elapsed:.1f}s)")

    # 8. Fatiamento Leaflet
    if args.tiles_dir:
        slice_leaflet_tiles(final_arr, args.tiles_dir)

    print("\n[✓] CARTOGRAFIA PURA CONCLUÍDA: ZERO RUAS FANTASMAS!")


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    main()
