#!/usr/bin/env python3
"""
analyze_jackal_palette.py — Analisador de Paleta do Mapa de Jackal
Mapeia todas as cores presentes no terreno original de Jackal,
identificando tons de corrupção avermelhada, áreas verdes de beacon,
corpos d'água e pixels sentinelas (como minas).
"""

import argparse
import json
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from sklearn.cluster import KMeans

def parse_hex_color(hex_str: str) -> tuple[int, int, int]:
    s = hex_str.strip().lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))

def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{int(r):02x}{int(g):02x}{int(b):02x}"

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
    
    white_point = np.array([0.95047, 1.00000, 1.08883], dtype=np.float64)
    xyz = xyz / white_point
    
    mask_xyz = xyz > 0.008856
    xyz[mask_xyz] = np.cbrt(xyz[mask_xyz])
    xyz[~mask_xyz] = (7.787 * xyz[~mask_xyz]) + (16.0 / 116.0)
    
    L = 116.0 * xyz[:, 1] - 16.0
    a = 500.0 * (xyz[:, 0] - xyz[:, 1])
    b = 200.0 * (xyz[:, 1] - xyz[:, 2])
    return np.column_stack([L, a, b])

def analyze_jackal_palette(image_path: str, k_clusters: int = 16, sentinel_hex_list: list = None):
    if sentinel_hex_list is None:
        sentinel_hex_list = ["#000000", "#fce303", "#d7331e"]
        
    sentinel_rgbs = [parse_hex_color(h) for h in sentinel_hex_list]
    
    print(f"[*] Carregando imagem de Jackal: {image_path}")
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    total_pixels = width * height
    print(f"[*] Resolução: {width}x{height} ({total_pixels:,} px)")
    
    arr = np.array(img, dtype=np.uint8)
    flat = arr.reshape(-1, 3)
    
    flat_u32 = (flat[:, 0].astype(np.uint32) << 16) | \
               (flat[:, 1].astype(np.uint32) << 8) | \
                flat[:, 2].astype(np.uint32)
                
    unq_u32, counts = np.unique(flat_u32, return_counts=True)
    num_unique = len(unq_u32)
    print(f"[*] Cores únicas no mapa de Jackal: {num_unique}")
    
    unq_r = (unq_u32 >> 16) & 0xFF
    unq_g = (unq_u32 >> 8) & 0xFF
    unq_b = unq_u32 & 0xFF
    unq_rgb = np.column_stack([unq_r, unq_g, unq_b])
    
    is_sentinel = np.zeros(num_unique, dtype=bool)
    for s_rgb in sentinel_rgbs:
        match = (unq_r == s_rgb[0]) & (unq_g == s_rgb[1]) & (unq_b == s_rgb[2])
        is_sentinel |= match
        
    sentinel_indices = np.where(is_sentinel)[0]
    train_indices = np.where(~is_sentinel)[0]
    
    train_rgb = unq_rgb[train_indices]
    train_counts = counts[train_indices]
    
    effective_k = min(k_clusters, len(train_rgb))
    print(f"[*] Agrupando em {effective_k} clusters perceptuais CIE L*a*b*...")
    
    train_lab = rgb_to_lab(train_rgb)
    kmeans = KMeans(n_clusters=effective_k, random_state=42, n_init=15)
    train_cluster_assignments = kmeans.fit_predict(train_lab, sample_weight=train_counts)
    
    clusters_info = []
    for c_id in range(effective_k):
        member_mask = (train_cluster_assignments == c_id)
        if not np.any(member_mask):
            continue
            
        m_orig = train_indices[member_mask]
        m_rgbs = unq_rgb[m_orig]
        m_cnts = counts[m_orig]
        total_c_pixels = int(np.sum(m_cnts))
        pct = (total_c_pixels / total_pixels) * 100.0
        
        mean_rgb = np.average(m_rgbs, axis=0, weights=m_cnts)
        mean_rgb_int = [int(round(x)) for x in mean_rgb]
        hex_color = rgb_to_hex(*mean_rgb_int)
        
        # Classificação semântica preliminar baseada nas características de Jackal
        r, g, b = mean_rgb_int
        category = "Outro"
        if r == 0 and g == 0 and b == 0:
            category = "Mina / Sentinela"
        elif g > r + 15 and g > b + 15:
            category = "Zona de Beacon / Conquistada (Verde)"
        elif b > r + 10 and b >= 80:
            category = "Água / Lago / Oceano"
        elif r > g + 15 or (r > 60 and g < 70 and b < 70):
            category = "Território Jackal / Corrupção Avermelhada"
        elif abs(r - g) < 15 and abs(g - b) < 15 and r > 80:
            category = "Rocha / Montanha"
        elif r > 120 and g > 110 and b < 100:
            category = "Areia / Praia"
            
        members_sorted = []
        for idx in np.argsort(-m_cnts):
            mo = m_orig[idx]
            mc = [int(x) for x in unq_rgb[mo]]
            cnt = int(counts[mo])
            members_sorted.append({
                "hex": rgb_to_hex(*mc),
                "rgb": mc,
                "pixel_count": cnt,
                "percentage": round((cnt / total_pixels) * 100.0, 4)
            })
            
        clusters_info.append({
            "cluster_id": c_id,
            "category": category,
            "mean_hex": hex_color,
            "mean_rgb": mean_rgb_int,
            "pixel_count": total_c_pixels,
            "percentage": round(pct, 3),
            "member_colors": members_sorted
        })
        
    clusters_info.sort(key=lambda x: x["pixel_count"], reverse=True)
    for new_id, c in enumerate(clusters_info):
        c["cluster_id"] = new_id
        
    sentinels_info = []
    for s_idx in sentinel_indices:
        s_rgb = [int(x) for x in unq_rgb[s_idx]]
        s_cnt = int(counts[s_idx])
        sentinels_info.append({
            "hex": rgb_to_hex(*s_rgb),
            "rgb": s_rgb,
            "pixel_count": s_cnt,
            "percentage": round((s_cnt / total_pixels) * 100.0, 4)
        })
        
    return {
        "width": width,
        "height": height,
        "total_pixels": total_pixels,
        "total_clusters": len(clusters_info),
        "sentinels": sentinels_info,
        "clusters": clusters_info
    }

def main():
    parser = argparse.ArgumentParser(description="Analisador de Paleta do Jackal")
    parser.add_argument("-i", "--input", default="Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png", help="Caminho do terreno")
    parser.add_argument("-o", "--output", default="Jackal-Atlas/maps/palettes/palette_jackal_raw.json", help="Arquivo JSON de saída")
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"[-] Arquivo não encontrado: {args.input}", file=sys.stderr)
        sys.exit(1)
        
    res = analyze_jackal_palette(args.input)
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
    print(f"[OK] Paleta analisada e salva com sucesso em: {args.output}")

if __name__ == "__main__":
    if sys.platform == "win32":
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    main()
