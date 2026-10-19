import os
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Caminhos
DIR_ATLAS = r"D:\Projetos\Wurm-Online\Jackal-Atlas"
PROCESSED_MAP = os.path.join(DIR_ATLAS, "maps", "processed", "jackal_swisstopo_4096.png")
TERRAIN_PATH = os.path.join(DIR_ATLAS, "maps", "raw", "jackal_original_terrain_4096.png")
TOPO_PATH = os.path.join(DIR_ATLAS, "maps", "raw", "jackal_original_topo_4096.png")
ISO_PATH = os.path.join(DIR_ATLAS, "maps", "raw", "jackal_original_iso_4096.png")
PALETTE_MAP_PATH = os.path.join(DIR_ATLAS, "maps", "palettes", "palette_jackal_swisstopo.json")

ARTIFACT_DIR = r"C:\Users\Metalgear\.gemini\antigravity\brain\f21ca79e-00d2-4895-acf7-32f6ca31011a"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

# 1. Carregar recortes (800x800) da região rica: Y=1700:2500, X=2500:3300
Y0, Y1, X0, X1 = 1700, 2500, 2500, 3300

print("[*] Carregando mapas base para o recorte...")
proc_full = np.array(Image.open(PROCESSED_MAP).convert("RGB"))
terrain_full = np.array(Image.open(TERRAIN_PATH).convert("RGB"))
topo_full = np.array(Image.open(TOPO_PATH).convert("RGB"))
iso_full = np.array(Image.open(ISO_PATH).convert("RGB"))

proc_crop = proc_full[Y0:Y1, X0:X1]
terrain_crop = terrain_full[Y0:Y1, X0:X1]
topo_crop = topo_full[Y0:Y1, X0:X1]
iso_crop = iso_full[Y0:Y1, X0:X1]

# 2. Paleta Calibrada para Jackal
# Definir nova tabela de mapeamento com alto contraste
calibrated_mappings = [
    # Água
    {"source_rgb": [60, 88, 84],  "target_rgb": [125, 168, 190]}, # Oceano
    {"source_rgb": [76, 102, 98], "target_rgb": [155, 195, 215]}, # Água rasa
    {"source_rgb": [55, 63, 111], "target_rgb": [105, 148, 175]}, # Fossa marinha
    {"source_rgb": [51, 71, 103], "target_rgb": [115, 158, 182]}, # Canal
    # Corrupção Jackal (mais rica e contrastada)
    {"source_rgb": [88, 61, 39],  "target_rgb": [172, 108, 80]},  # Corrupção avermelhada viva
    {"source_rgb": [52, 32, 24],  "target_rgb": [105, 64, 48]},   # Corrupção profunda / cinzas (escuro mineral)
    {"source_rgb": [69, 55, 62],  "target_rgb": [138, 102, 112]}, # Corrupção arroxeada encosta
    {"source_rgb": [113, 89, 88], "target_rgb": [168, 126, 114]}, # Solo avermelhado médio
    {"source_rgb": [153, 128, 134],"target_rgb": [205, 168, 172]},# Solo rosado claro
    {"source_rgb": [75, 63, 47],  "target_rgb": [128, 92, 72]},   # Cluster 14 antes não mapeado
    {"source_rgb": [60, 86, 76],  "target_rgb": [140, 155, 130]}, # Solo úmido transição
    # Rocha / Montanhas (clareada para saltar da terra corrompida)
    {"source_rgb": [112, 109, 111],"target_rgb": [215, 210, 202]}, # Rocha alpina clara
    {"source_rgb": [160, 147, 109],"target_rgb": [240, 230, 210]}, # Areia dunas
    # Oásis de Beacon (verdes vívidos com contraste claro)
    {"source_rgb": [54, 101, 3],  "target_rgb": [162, 212, 105]}, # Pradaria beacon liberada
    {"source_rgb": [41, 58, 2],   "target_rgb": [85, 135, 58]},   # Floresta beacon recuperada
    {"source_rgb": [114, 117, 67], "target_rgb": [185, 195, 120]}  # Cluster 15 transição verde
]

def rgb_to_lab(rgb_array):
    rgb = np.asarray(rgb_array, dtype=np.float64) / 255.0
    mask = rgb > 0.04045
    rgb[mask] = ((rgb[mask] + 0.055) / 1.055) ** 2.4
    rgb[~mask] = rgb[~mask] / 12.92
    matrix = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041]
    ], dtype=np.float64)
    xyz = rgb @ matrix.T / np.array([0.95047, 1.00000, 1.08883])
    mask_xyz = xyz > 0.008856
    xyz[mask_xyz] = np.cbrt(xyz[mask_xyz])
    xyz[~mask_xyz] = (7.787 * xyz[~mask_xyz]) + (16.0 / 116.0)
    L = 116.0 * xyz[:, 1] - 16.0
    a = 500.0 * (xyz[:, 0] - xyz[:, 1])
    b = 200.0 * (xyz[:, 1] - xyz[:, 2])
    return np.column_stack((L, a, b))

# 3. Aplicar recoloração calibrada
src_rgbs = np.array([m["source_rgb"] for m in calibrated_mappings], dtype=np.float64)
dst_rgbs = np.array([m["target_rgb"] for m in calibrated_mappings], dtype=np.uint8)
src_lab = rgb_to_lab(src_rgbs)

h, w, _ = terrain_crop.shape
flat = terrain_crop.reshape(-1, 3)
flat_u32 = (flat[:, 0].astype(np.uint32) << 16) | (flat[:, 1].astype(np.uint32) << 8) | flat[:, 2].astype(np.uint32)
unq_u32, inverse_indices = np.unique(flat_u32, return_inverse=True)
unq_rgb = np.column_stack([(unq_u32 >> 16) & 0xFF, (unq_u32 >> 8) & 0xFF, unq_u32 & 0xFF])
unq_lab = rgb_to_lab(unq_rgb)

lut = np.zeros((len(unq_u32), 3), dtype=np.uint8)
for i in range(len(unq_u32)):
    # Preservar minas (preto puro)
    if unq_rgb[i, 0] == 0 and unq_rgb[i, 1] == 0 and unq_rgb[i, 2] == 0:
        lut[i] = [0, 0, 0]
        continue
    diffs = src_lab - unq_lab[i]
    dists_sq = np.sum(diffs ** 2, axis=1)
    best = int(np.argmin(dists_sq))
    lut[i] = dst_rgbs[best]

recolored_crop = lut[inverse_indices].reshape((h, w, 3))

# 4. Sombras / Hillshading de Alta Nitidez com Máscara Neutra de Água
t_lum = 0.299 * terrain_crop[:, :, 0] + 0.587 * terrain_crop[:, :, 1] + 0.114 * terrain_crop[:, :, 2]
i_lum = 0.299 * iso_crop[:, :, 0] + 0.587 * iso_crop[:, :, 1] + 0.114 * iso_crop[:, :, 2]

# Assinatura de água em Jackal
r = terrain_crop[:, :, 0].astype(np.int32)
g = terrain_crop[:, :, 1].astype(np.int32)
b = terrain_crop[:, :, 2].astype(np.int32)
is_water = ((b >= 75) & (b > r + 8) & (g > r + 8)) | ((b >= 90) & (b > r + 15))
is_land = ~is_water

shading_ratio = np.clip(i_lum / np.maximum(t_lum, 1.0), 0.25, 1.80)
# Travar água em 1.0 puro para zero ruído de onda
shading_ratio[is_water] = 1.0

# Blend de relevo rico (intensidade 60%)
relief_factor = 0.60
shaded_crop = np.clip(
    recolored_crop.astype(np.float32) * ((1.0 - relief_factor) + relief_factor * shading_ratio[:, :, np.newaxis]),
    0, 255
).astype(np.uint8)

# 5. Curvas de nível em Grafite Mineral de Alto Contraste
is_black_topo = (topo_crop[:, :, 0] == 0) & (topo_crop[:, :, 1] == 0) & (topo_crop[:, :, 2] == 0)
is_black_terrain = (terrain_crop[:, :, 0] == 0) & (terrain_crop[:, :, 1] == 0) & (terrain_crop[:, :, 2] == 0)
contour_mask = is_black_topo & ~is_black_terrain

c_land = contour_mask & is_land
c_water = contour_mask & is_water

# Curva na terra: Grafite/Carvão profundo mineral [36, 26, 22] (#241a16), opacidade 90%
curve_land_rgb = np.array([36, 26, 22], dtype=np.float32)
# Curva na água: Azul ardósia batimétrico nítido [62, 105, 132], opacidade 85%
curve_water_rgb = np.array([62, 105, 132], dtype=np.float32)

new_crop = shaded_crop.copy()
op_land = 0.90
op_water = 0.85

new_crop[c_land] = ((1.0 - op_land) * new_crop[c_land].astype(np.float32) + op_land * curve_land_rgb).astype(np.uint8)
new_crop[c_water] = ((1.0 - op_water) * new_crop[c_water].astype(np.float32) + op_water * curve_water_rgb).astype(np.uint8)
new_crop[is_black_terrain] = [0, 0, 0] # Minas preservadas

# 6. Gerar Imagem Comparativa Lado a Lado (2 painéis + zoom 2x de detalhe)
panel_w, panel_h = 800, 800
header_h = 90
canvas_w = panel_w * 2 + 40
canvas_h = header_h + panel_h + 30

comparison = Image.new("RGB", (canvas_w, canvas_h), (24, 25, 27))
draw = ImageDraw.Draw(comparison)

# Desenhar títulos
try:
    font_title = ImageFont.truetype("arial.ttf", 26)
    font_sub = ImageFont.truetype("arial.ttf", 16)
except:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()

draw.text((30, 20), "VERSÃO ATUAL (tiles_custom / build_jackal_map)", fill=(220, 150, 150), font=font_title)
draw.text((30, 55), "Sombras lavadas por DEM artificial | Curvas sépia camufladas | Paleta desbotada", fill=(170, 170, 170), font=font_sub)

draw.text((panel_w + 50, 20), "VERSÃO CALIBRADA (Nova Proposta)", fill=(140, 220, 150), font=font_title)
draw.text((panel_w + 50, 55), "Relevo nítido 3D | Curvas carvão mineral (#241a16) 90% | Rocha clara & Beacons destacados", fill=(170, 170, 170), font=font_sub)

# Colar imagens
comparison.paste(Image.fromarray(proc_crop), (20, header_h))
comparison.paste(Image.fromarray(new_crop), (panel_w + 40, header_h))

# Salvar imagens individuais e o comparativo no diretório de artefatos
out_comparison = os.path.join(ARTIFACT_DIR, "comparativo_jackal_calibrado.png")
out_atual = os.path.join(ARTIFACT_DIR, "jackal_crop_atual.png")
out_novo = os.path.join(ARTIFACT_DIR, "jackal_crop_calibrado.png")

comparison.save(out_comparison, "PNG")
Image.fromarray(proc_crop).save(out_atual, "PNG")
Image.fromarray(new_crop).save(out_novo, "PNG")

print(f"[OK] Comparativo salvo em: {out_comparison}")
print(f"[OK] Amostra atual salva em: {out_atual}")
print(f"[OK] Amostra calibrada salva em: {out_novo}")
