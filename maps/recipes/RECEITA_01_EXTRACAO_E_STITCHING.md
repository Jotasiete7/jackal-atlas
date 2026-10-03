# 🧪 RECEITA 01: EXTRAÇÃO E COMPOSIÇÃO DE MATRIZES (STITCHING)

> **Objetivo:** Transformar os arquivos brutos recebidos (sejam imagens soltas ou pirâmides de tiles web do Wurmmaps) em imagens compostas canônicas de 4096x4096px prontas para processamento.

---

## 📥 Cenário A: Se o mapa vier como conjunto de tiles (Wurmmaps.xyz)

Quando os desenvolvedores ou a comunidade hospedam um mapa no formato Leaflet Web (pastas `z/x/y.png`):

1. Verifique os scripts em `Jackal-Atlas/scripts/download_jackal_tiles.js` ou execute o extrator Python:
```bash
python Jackal-Atlas/maps/tools/stitch_tiles.py \
  -i Jackal-Atlas/tiles_terrain \
  -o Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png \
  -z 4
```

2. Repita o procedimento para as camadas de relevo (`iso`) e curvas (`topo`):
```bash
python Jackal-Atlas/maps/tools/stitch_tiles.py \
  -i Jackal-Atlas/tiles_topo \
  -o Jackal-Atlas/maps/raw/jackal_original_topo_4096.png \
  -z 4

python Jackal-Atlas/maps/tools/stitch_tiles.py \
  -i Jackal-Atlas/tiles_iso \
  -o Jackal-Atlas/maps/raw/jackal_original_iso_4096.png \
  -z 4
```

---

## 🖼️ Cenário B: Se o mapa vier como dump oficial em arquivo único PNG

Se a desenvolvedora do Wurm Online (Code Club / Rolf / time oficial) liberar o download direto dos arquivos brutos (geralmente nomeados como `jackal-terrain.png`, `jackal-topographic.png`, `jackal-isometric.png`):

1. Basta copiar os 3 arquivos para a pasta:
   `Jackal-Atlas/maps/raw/`
2. Renomeie-os para:
   - `jackal_original_terrain_4096.png`
   - `jackal_original_topo_4096.png`
   - `jackal_original_iso_4096.png`

---

## 🛡️ Validação da Matriz
Antes de prosseguir para a próxima etapa, confira se as 3 imagens possuem:
- Dimensões idênticas: exatamente `4096 x 4096` pixels.
- Profundidade de cor de 24 bits (RGB sem alpha).
