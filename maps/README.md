# 🗺️ CARTOGRAFIA JACKAL ATLAS — GUIA MESTRE & PIPELINE

> **Repositório Central de Mapas, Paletas e Receitas Cartográficas do Servidor Jackal**  
> *Baseado na tecnologia SwissTopo Goldfish desenvolvida para a Guilda Harmony Sistems.*

---

## 📌 1. Visão Geral e Propósito

Este diretório (`Jackal-Atlas/maps/`) foi criado para armazenar, processar e automatizar a geração do mapa oficial de **Jackal**, combinando:
1. **Rigor Geométrico 1:1:** Cada estrada, deed, cerca e mina permanece exatamente na coordenada real do jogo.
2. **Identidade Visual Narrativa de Jackal:**
   - **Território Corrompido:** Regiões sob domínio de Jackal possuem tons avermelhados, terrosos escuros e cinzas vulcânicos característicos. O algoritmo estiliza essas áreas em terracota nobre e tons minerais elegantes, sem poluição visual.
   - **Oásis de Beacons Conquistados:** Quando os jogadores capturam beacons e purificam a terra, formam-se **círculos verdes de proteção**, onde é autorizado construir deeds e vilas. A nossa paleta destaca esses círculos como refúgios civilizatórios verdejantes.
3. **Fusão em Mapa Único de Alta Fidelidade:**
   - **Curvas de Nível Vetorizadas:** 1 pixel de espessura exata extraído do `topo.png` (sépia alpino na terra e azul suave batimétrico na água).
   - **Relevo 3D Real (Hillshading):** Sombreamento de relevo aplicado com máscara estrita neutra nos oceanos e lagos (zero estrias de onda na água).

---

## 📂 2. Estrutura de Pastas

```text
Jackal-Atlas/maps/
├── README.md               <- Este Guia Mestre
├── raw/                    <- Imagens brutas originais (terrain, topo, iso em 4096px)
├── processed/              <- Mapas finais compostos em ultra-alta resolução (PNG)
├── palettes/               <- Definições JSON de cores e mapeamento CIE L*a*b*
│   ├── palette_jackal_raw.json       <- Relatório e amostragem de cores cruas
│   └── palette_jackal_swisstopo.json <- Mapeamento de paleta cartográfica Swisstopo
├── recipes/                <- Manuais passo a passo para cada fase do processo
│   ├── RECEITA_01_EXTRACAO_E_STITCHING.md
│   ├── RECEITA_02_CALIBRACAO_DE_PALETAS.md
│   ├── RECEITA_03_RELEVO_E_CURVAS_SEM_DISTORCAO.md
│   ├── RECEITA_04_FATIAR_TILES_LEAFLET.md
│   └── RECEITA_05_TRANSICAO_PARA_O_MAPA_FINAL.md
└── tools/                  <- Scripts executáveis em Python
    ├── build_jackal_map.py       <- Script mestre unificado (Recolore + Relevo + Curvas + Fatiador)
    ├── analyze_jackal_palette.py <- Analisador e agrupador de cores K-Means Lab
    └── stitch_tiles.py           <- Montador de 4096x4096px a partir de pirâmides de tiles
```

---

## 🚀 3. Como Gerar o Mapa em 1 Comando

Para gerar o mapa de alta resolução combinando terreno estilizado, relevo e curvas de nível:

```bash
python Jackal-Atlas/maps/tools/build_jackal_map.py \
  -i Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png \
  -t Jackal-Atlas/maps/raw/jackal_original_topo_4096.png \
  -s Jackal-Atlas/maps/raw/jackal_original_iso_4096.png \
  -p Jackal-Atlas/maps/palettes/palette_jackal_swisstopo.json \
  -o Jackal-Atlas/maps/processed/jackal_swisstopo_4096.png \
  -r 45
```

### Se quiser gerar e já fatiar os tiles web para o Leaflet:
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

---

## 🧭 4. O Mapa Atual de Referência vs Mapa do Lançamento

Atualmente estamos utilizando o dump extraído do servidor de testes do Jackal (`jackal_original_*_4096.png`).  
Ele serve como **laboratório de calibração**:
1. Permite treinar e ajustar menus, marcadores e coordenadas no `Jackal-Atlas/index.html`.
2. Permite validar visualmente a transição das áreas avermelhadas de Jackal para as clareiras verdes de Beacons.
3. No dia em que os desenvolvedores do Wurm publicarem o mapa definitivo oficial, basta executar a [Receita 05](file:///c:/Users/Metalgear/Documents/antigravity/fervent-lovelace/Jackal-Atlas/maps/recipes/RECEITA_05_TRANSICAO_PARA_O_MAPA_FINAL.md) para atualizar todo o sistema em menos de 1 minuto!
