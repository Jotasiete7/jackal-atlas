# Jackal Sandbox — Caixa de Areia Colaborativa de Relevo (Round 2)

Aplicação web independente de cartografia e modelagem colaborativa de relevo 3D para a guilda em **Wurm Online (Jackal Round 2)**, com foco em alta performance (≥ 30 fps), transparência epistêmica (mapa de confiança visível) e arquitetura *Local-First*.

---

## 1. Parâmetros e Decisões Confirmadas com o Usuário

Em conformidade com a seção 7 da especificação e as respostas do usuário:

| Parâmetro | Valor Configurado | Justificativa / Comportamento |
|---|---|---|
| **`MAP_SIZE_TILES`** | **4096 × 4096 tiles** | Padrão herdado do Jackal Round 1 (-2048 a +2048 centrado no spawn). Parametrizável em `src/config.ts`. |
| **Resolução da Grade** | **5 tiles por célula** (20m) | Padrão do MVP, permitindo pincel mínimo de 5 tiles com encaixe exato. |
| **Tamanho do Bloco/Chunk** | **64 × 64 células** (320 × 320 tiles = 1280m) | Otimizado para alocação sob demanda e rendering Three.js incremental. |
| **Raio da Estação de Visita** | **100 tiles** (~400 metros) | Definido pelo usuário. Pinceladas têm peso decrescente até zero no limite do raio para evitar invenção de relevo à distância. |
| **Papel de Cartógrafo** | **Controle dedicado (`is_cartographer`)** | Controle de permissão independente para validação de pinos com restrição forte e gerenciamento de snapshots. |
| **Estratégia Supabase** | **Local-First & Isolado** | Opera localmente (IndexedDB + Web Workers + JSON) para testes e estresse. Quando conectado ao Supabase existente (`ndeepjongrkeldzrssis`), utilizará estritamente tabelas prefixadas `sandbox_*` sem alterar tabelas legadas (`sketch_strokes`, etc.). |

---

## 2. Invariantes Físicas do Jogo (Regras Invioláveis)

1. **Escala Cartográfica:** 1 tile = 4 metros.
2. **Nível do Mar Absoluto:** Toda água (mar, rio, lago) possui altitude **estritamente 0.0 metros**. Nenhuma célula de água pode ser elevada ou rebaixada.
3. **Piso de Terra:** Células de terra **nunca ficam abaixo de 0 metros** (clamp em 0m). Não existe fundo submarino modelado nesta fase.
4. **Terra Incógnita Inicial:** O mapa abre **100% desconhecido** (`UNKNOWN`). Nenhuma ilha ou relevo é inferido automaticamente.
5. **Orientação dos Eixos:**
   - Origem `(0, 0)` no ponto central de spawn.
   - X cresce para Leste (+X = Leste, -X = Oeste).
   - Y cresce para Norte (+Y = Norte, -Y = Sul).
   - Convenção de quadrículas de 100 tiles: `N3-L5`, `S1-O2`, etc.
6. **Legenda de Confiança Permanente:** A legenda de confiabilidade (Medido, Estimado, Especulativo, Água, Desconhecido) é visível o tempo todo na tela.

---

## 3. Arquitetura da Solução

```
src/
├── config.ts                    # Constantes do mapa, resolução 5 tiles, chunks 64x64, conversões
├── core/
│   ├── types.ts                 # Tipos TypeScript, enums (CellState, ConfidenceLevel)
│   ├── heightfield.ts           # Gerenciador de relevo em blocos, ferramentas e Undo/Redo
│   ├── pins.ts                  # Pinos de evidência (marcos construídos, torres, costa, cumes)
│   ├── visits.ts                # Sessões de visita, estações e amortecimento por distância
│   └── storage.ts               # Armazenamento local IndexedDB, snapshots e backup JSON
├── renderer/
│   ├── scene.ts                 # Cena Three.js, iluminação hillshade (NW 315°), FPS monitor
│   ├── camera.ts                # Câmeras: Topo (Norte p/ cima), Isométrico (90° steps), Lateral e Livre
│   ├── terrain-mesh.ts          # Malhas dos chunks Three.js com paleta hipsométrica e overlay
│   ├── grid-mesh.ts             # Grade 100/10 tiles com nomes de folha e círculo da estação
│   ├── brush-cursor.ts          # Círculo 3D projetado sobre o terreno com raio real em tiles
│   ├── pin-mesh.ts              # Marcadores 3D para pinos e marcos geodésicos
│   └── contour-renderer.ts      # Curvas de nível 3D com curvas mestras a cada 5 intervalos
├── workers/
│   └── marching-squares.worker.ts # Extração de isolinhas em Web Worker assíncrono
└── ui/
    ├── icons.ts                 # Ícones vetoriais SVG
    ├── toolbar.ts               # Barra de ferramentas esquerda (pincéis, água, borracha, pinos)
    ├── brush-panel.ts           # Painel de presets (5, 10, 20, 50, 100), intensidade e queda
    ├── camera-bar.ts            # Barra superior (câmeras, rotação 90°, exagero vertical 1x-5x)
    ├── confidence-legend.ts     # Legenda permanente de confiança cartográfica
    ├── layers-panel.ts          # Camadas, exportação GeoJSON/SVG/PNG e snapshots
    ├── info-bar.ts              # Barra de status (Tile X/Y, Folha, Cota, Estado, FPS)
    └── pin-modal.ts             # Modal de criação, inspeção e validação de pinos
```

---

## 4. Inspeção do Supabase Existente

Durante o levantamento de requisitos, inspecionamos o repositório existente `D:\Projetos\Wurm-Online\Jackal-Atlas`:
- O banco atual (`ndeepjongrkeldzrssis`) contém tabelas de produção como `profiles`, `map_config`, `points`, `sketch_strokes`, `sketch_commits` e `guilds`.
- **Garantia de Não-Interferência:** Nenhuma dessas tabelas foi alterada. Todas as novas entidades do Sandbox utilizam estritamente o prefixo `sandbox_` (`sandbox_visits`, `sandbox_strokes`, `sandbox_chunks`, `sandbox_pins`, `sandbox_snapshots`).
- A aplicação foi estruturada para operar em modo **Local-First**, testando e estressando todos os recursos no navegador antes de qualquer integração em nuvem.

---

## 5. Como Executar e Testar

### Desenvolvimento Local:
```powershell
# No diretório D:\Projetos\Wurm-Online\Jackal-Sandbox
npm run dev
```

### Executar Testes Automatizados (Vitest):
```powershell
npm run test
```
*Testa 100% das invariantes: água a zero, terra clamped em zero, mapa inicial desconhecido, trava de alcance de 100 tiles da estação, undo/redo e reconstrução idêntica de snapshots.*

### Compilar para Produção:
```powershell
npm run build
```
Os artefatos otimizados serão gerados na pasta `dist/`, prontos para deploy no Cloudflare Pages.

---

## 6. Objetos do Wurm (Placeables) • Wurm models (Placeables)

A ferramenta **🌲 Objetos** coloca modelos reais do Wurm no relevo (bétula, carvalho, torre de guarda Freedom, guarda da torre e pilar). Clique num modelo e depois no terreno para colocar; clique num objeto para selecionar, arraste para mover, **R / Shift+R** gira 15°, **Del** apaga, **Esc** solta. Os objetos acompanham o relevo quando ele é esculpido. O pilar de spawn também passa a usar o modelo real do jogo.

The **🌲 Placeables** tool puts real Wurm models on the relief (birch, oak, Freedom guard tower, tower guard and pillar). Pick a model, click the terrain to place it; click an object to select it, drag to move, **R / Shift+R** rotates 15°, **Del** deletes, **Esc** deselects. Objects ride the terrain as it is sculpted. Pillar pins also use the real in-game model.

**Os modelos não estão no repositório • The models are not in the repository.** Eles pertencem à Game Chest Group / Code Club AB e o repositório é público, então cada pessoa extrai do próprio cliente do Wurm: • They belong to Game Chest Group / Code Club AB and this repository is public, so each person extracts them from their own Wurm client:

```powershell
cd sandbox-src
npm run extract-wurm                      # procura/looks in %USERPROFILE%\wurm\packs\graphics.jar
npm run extract-wurm -- "D:/Games/wurm"   # ou a pasta do seu Wurm / or your Wurm folder
npm run dev
```

Os arquivos vão para `sandbox-src/public/wurm/` (e `sandbox/wurm/` no build), ambos no `.gitignore`: **não comite nem publique** sem permissão da Game Chest. Sem eles, o botão 🌲 fica oculto e o resto do Sandbox funciona normalmente. • Files go to `sandbox-src/public/wurm/` (and `sandbox/wurm/` when built), both git-ignored: **do not commit or deploy them** without Game Chest's permission. Without them the 🌲 button stays hidden and the rest of the Sandbox works as before.

Escala • Scale: modelos `.wom` estão em metros (cerca de 1 tile = 4 m); árvores são guardadas pequenas e o jogo as cresce com a idade, aqui ×8 ≈ 10 m. • `.wom` models are in metres (a fence section is exactly 4 = one tile); trees are stored small and grown with age in game, here ×8 ≈ 10 m. Objetos ficam salvos no navegador (localStorage) por enquanto. • Placements are saved in the browser (localStorage) for now.
