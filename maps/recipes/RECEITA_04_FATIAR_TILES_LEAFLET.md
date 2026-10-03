# 🗺️ RECEITA 04: FATIAR TILES WEB LEAFLET (ZOOMS 0 A 4)

> **Objetivo:** Converter o mapa final composto de 4096x4096px na pirâmide de pirâmides de tiles padrão Web/Leaflet (`{z}/{x}/{y}.png`) e integrá-lo diretamente à interface web do Jackal Atlas.

---

## 🍕 1. O Formato de Tiles do Leaflet

O Leaflet divide o mapa de 4096px em uma grade de quadrículas de 256x256 pixels com diferentes níveis de aproximação:
- **Zoom 4:** 16 x 16 = 256 tiles (resolução nativa 1:1, 4096x4096px).
- **Zoom 3:** 8 x 8 = 64 tiles (resolução 2048x2048px).
- **Zoom 2:** 4 x 4 = 16 tiles (resolução 1024x1024px).
- **Zoom 1:** 2 x 2 = 4 tiles (resolução 512x512px).
- **Zoom 0:** 1 x 1 = 1 tile (resolução 256x256px, visão global da ilha).

Total por camada: **341 tiles**.

---

## ⚡ 2. Como Fatiar Automaticamente

Basta adicionar o parâmetro `--tiles-dir` ao rodar o script mestre:

```bash
python Jackal-Atlas/maps/tools/build_jackal_map.py \
  -i Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png \
  -t Jackal-Atlas/maps/raw/jackal_original_topo_4096.png \
  -s Jackal-Atlas/maps/raw/jackal_original_iso_4096.png \
  -p Jackal-Atlas/maps/palettes/palette_jackal_swisstopo.json \
  -o Jackal-Atlas/maps/processed/jackal_swisstopo_4096.png \
  -r 45 \
  --tiles-dir Jackal-Atlas/tiles_custom
```

Em poucos segundos, a pasta `Jackal-Atlas/tiles_custom/` conterá as subpastas `0`, `1`, `2`, `3`, `4` prontas para consumo web.

---

## 🌐 3. Como Habilitar a Camada no `Jackal-Atlas/index.html`

No arquivo `Jackal-Atlas/index.html`, onde as camadas do Leaflet são declaradas:

```javascript
// Exemplo de configuração da camada no Leaflet:
const swisstopoLayer = L.tileLayer('tiles_custom/{z}/{x}/{y}.png', {
    maxZoom: 5,
    minZoom: 0,
    tileSize: 256,
    attribution: 'Jackal Cartography © Guilda Harmony Sistems (Swisstopo Style)',
    noWrap: true
});

// Adicionar ao seletor de camadas (baseMaps):
const baseMaps = {
    "Swisstopo Custom (Relevo + Curvas)": swisstopoLayer,
    "Terreno Original": terrainLayer,
    "Topográfico": topoLayer,
    "Isométrico": isoLayer
};
```
Com isso, os jogadores e administradores podem alternar instantaneamente entre o mapa customizado de alta precisão e as camadas originais de referência.
