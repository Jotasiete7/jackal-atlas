# 🎨 RECEITA 02: CALIBRAÇÃO DE PALETAS E MECÂNICA DE JACKAL

> **Objetivo:** Compreender a estrutura de cores do servidor Jackal, analisar as cores dominantes e calibrar o mapeamento CIE L*a*b* para realçar a dualidade entre terra corrompida e zonas de beacons.

---

## 🩸 1. A Singularidade Visual de Jackal

Ao contrário de servidores PvE clássicos como Harmony (onde a terra é predominantemente grama verde suave e colinas de terra cultivável), **Jackal é dominado pelo conflito**:

1. **Território de Jackal (Corrupção Avermelhada / Terrosa):**
   - Cores de origem: `#583d27` (88, 61, 39), `#342018` (52, 32, 24), `#45373e` (69, 55, 62).
   - Ocupam mais de **35%** de toda a área do mapa.
   - **Tratamento:** Mapeamos para tons nobres de terracota (`#ba836c`), marrom escuro mineral (`#845e4d`) e cinza-malva (`#9c8189`). Isso preserva a sensação de "área corrompida / inóspita", mas com acabamento de cartografia suíça elegante e descansada para os olhos.

2. **Oásis de Beacons Conquistados (Zonas Verdes):**
   - Cores de origem: `#366503` (54, 101, 3 - Grama viva) e `#293a02` (41, 58, 2 - Floresta).
   - Quando jogadores conquistam os Beacons pelo mapa, essas áreas se transformam em **círculos verdes protetores**. É somente dentro dessas zonas que a construção de *deeds* (assentamentos) é autorizada.
   - **Tratamento:** Mapeamos para verde pradaria Swisstopo (`#b8cf96`) e verde florestal alpino (`#72925a`). Esses círculos saltam aos olhos no mapa como "portos seguros" de civilização.

3. **Águas e Oceanos:**
   - Cores de origem: `#3c5854` (60, 88, 84 - pântano/mar escuro) e `#4c6662` (76, 102, 98 - margem).
   - **Tratamento:** Substituímos o tom escuro e pantanoso original por azul batimétrico suave Swisstopo (`#88b2c8` em águas profundas e `#a5c8d8` em águas rasas), gerando contraste visual cristalino com as margens rochosas.

4. **Pixels Sentinelas Intocáveis:**
   - `#000000` (Preto puro): **Portas de mina**. Devem passar direto sem alteração (1:1), para que nenhuma entrada subterrânea desapareça.
   - `#fce303` (Amarelo puro): Marcadores de deeds, pontes ou tokens.
   - `#d7331e` (Vermelho puro): Pontos de interesse do sistema.

---

## 🔍 2. Como Analisar uma Nova Versão do Mapa

Se o mapa oficial final tiver pequenas variações de matiz ou novos tipos de terreno, execute o analisador:

```bash
python Jackal-Atlas/maps/tools/analyze_jackal_palette.py \
  -i Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png \
  -o Jackal-Atlas/maps/palettes/palette_jackal_raw.json
```

O script reportará:
- Total de cores únicas.
- Agrupamento em clusters perceptuais via K-Means no espaço CIE L*a*b*.
- Percentual de ocupação de cada cor no mapa.

---

## 🛠️ 3. Como Editar a Paleta Swisstopo

O arquivo de configuração está em:
`Jackal-Atlas/maps/palettes/palette_jackal_swisstopo.json`

Para alterar qualquer tom de destino, edite os campos `target_hex` e `target_rgb`:
```json
{
  "id": 1,
  "name": "Corrupção Avermelhada Principal de Jackal",
  "source_hex": "#583d27",
  "source_rgb": [88, 61, 39],
  "target_hex": "#ba836c",
  "target_rgb": [186, 131, 108]
}
```
O algoritmo encontra automaticamente qualquer cor de dither intermediária por menor distância $\Delta E$ perceptual e a converte sem quebras de gradiente.
