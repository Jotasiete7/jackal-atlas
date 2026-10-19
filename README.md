# 🌙 Jackal Atlas & Sandbox 3D — Central Tática • A Guilda

> 🇺🇸 English version: [README.en.md](README.en.md)

Mapa tático e cartográfico colaborativo completo para o evento **Jackal Round 2** de Wurm Online (outubro de 2026).
Desenvolvido com o **Design System Swisstopo (Dark Swiss)** oficial da guilda, arquitetura em tempo real com **Supabase** e integração entre duas ferramentas complementares de alta performance:

1. **Atlas Tático 2D & Esboço Colaborativo (`/`)**: Base cartográfica com visualização multiescala, desenho à mão com versionamento estilo Git (commits com revisão e reversão), infraestrutura viária e controle territorial.
2. **Caixa de Areia 3D de Relevo (Jackal Sandbox — `/sandbox`)**: Motor 3D em WebGL/Three.js a 60 FPS para captação de dados de campo, modelagem de elevações, curvas de nível dinâmicas e proteção de setores por travas cartográficas.

---

## 🗺️ Funcionalidades Principais do Atlas 2D

- **Base Cartográfica Leaflet Ágil**: Motor de renderização suave e direto (estilo Harmony Atlas), com grade de 4096×4096 tiles, alternância entre camadas *Terrain*, *Isométrico* e *Topográfico* e controle de zoom suíço.
- **Mira Tática Alvo Pulsante & URL Dinâmica**: Clique com botão esquerdo em qualquer ponto para cravar uma mira pulsante vermelha (`@keyframes sw-ping`) e atualizar o link do navegador instantaneamente (`#X,Y`) para compartilhamento rápido via Discord ou chat do Wurm.
- **Abertura Instantânea por Link (`#X,Y` ou `#X,Y,Z`)**: Links com coordenadas abrem a câmera diretamente nas coordenadas táticas com zoom 5.0x, economizando dezenas de downloads de tiles do centro.
- **Smart Paste de Coordenadas**: Reconhecimento automático de coordenadas copiadas do jogo (`2897,2845`, `/vamp 2897 2845`, etc.) com preenchimento automático nos modais de Deeds e anotações.
- **Pipeline de Moderação Colaborativa (Zero-Vandalismo)**:
  - Anotações de membros comuns entram como pendentes (`confirmed: false`) e só aparecem publicamente após aprovação de Oficiais/Admins.
  - Oficiais e Admins aprovam ou rejeitam propostas diretamente pelo mapa em 1-clique ou pelo painel administrativo.
  - Visitantes externos e deslogados têm acesso apenas aos pontos e rotas já confirmados.
- **Grade YAGA Wurm & Destaque de Quadrantes**: Visualização de quadrantes oficiais (`B7` a `Z26`), busca instantânea por quadrante (ex: `L17`) e cálculo de coordenadas com precisão milimétrica.
- **Modo Infraestrutura & Deed Sizer**:
  - Traçado de estradas e pontes retas (ortogonais 90° e diagonais 45° via Snap Wurm) com cálculo de tiles.
  - Medição de áreas para planejamento de deeds e terraplanagem em tempo real.
- **Radar de Influência & Beacons**: Monitoramento dinâmico da ocupação territorial (Freedom vs Jackal vs Neutro), reforços de beacon (+1, +2), alertas de ataque e Primeiro Marco da Guilda (Idols & Plinths).
- **Segurança Reforçada (RLS)**: Regras granulares no banco de dados com bloqueio de auto-aprovação, proteção contra escalação de privilégios e rate limiting.
- **Camada de Esboço (mapa desenhado à mão)** • *Sketch Layer*: Desenho estilo quadro branco para quando não houver dump do mapa: caneta com paleta de cores (12 cores + cor personalizada), opacidade e tamanho do pincel em tiles, setas, texto, ícones de acampamento / saída de túnel / perigo e borracha. Os traços ficam em coordenadas de tile do jogo, alinhados com a grade e os marcadores em qualquer zoom.
- **Commits do Esboço (versionamento estilo git)** • *Sketch commits*: Você desenha num rascunho privado e faz **commit** com uma mensagem. Commits de oficiais vão ao ar na hora; os de membros aguardam aprovação de um oficial (o commit inteiro). O **histórico** mostra cada commit (quem, quando, mensagem, traços adicionados/apagados), destaca o commit no mapa ao passar o mouse, mostra o **mapa como estava em qualquer commit** e permite a oficiais **reverter** (ocultar, nunca apagar) e restaurar. Enquanto alguém desenha, os outros veem o traço ao vivo com o nome da pessoa.
- **Pergaminho em Branco (Round 2)** • *Blank parchment base*: Base lisa para esboçar conforme os batedores exploram. O mapa antigo do Jackal (Round 1) continua disponível (Goldfish®, Terrain, Isométrico, Topo).
- **Copiar coordenadas** • *Copy X,Y*: Os popups agora copiam `X,Y` para o Discord (`/vamp` não é um comando disponível para jogadores comuns).

---

## 🏔️ Caixa de Areia 3D de Relevo (Jackal Sandbox — `/sandbox`)

Uma ferramenta cartográfica 3D em tempo real desenvolvida para captar dados exploratórios e esculpir a topografia do mapa com precisão de jogo:

- **Malha 3D Contínua (Zero-Seams & 60 FPS)**: Malha única sem divisórias visíveis, com shader GLSL customizado para hipsometria (vales verdes, encostas ocres, picos rochosos), iluminação Hillshade direcional e hachura tática em áreas desconhecidas.
- **Modelo de Setores 100×100 & Cadeado do Cartógrafo**: 
  - O mapa é subdividido em Folhas Cartográficas de 100×100 tiles (20×20 células de 5×5 tiles).
  - Trava rápida no rodapé (`[🔓]/[🔒]`) para bloquear a folha atual inteira (`N0-L0`, etc.) ou via pincel de trava (`🔒 [K]`).
  - Áreas consolidadas/trancadas ficam 100% imunes a pinceladas acidentais de outros modeladores.
- **3 Papéis Operacionais (Permissions)**:
  - 🧭 **Batedor (Scout)**: Focado em registrar marcos, pilares e pinos no terreno sem risco de deformar o relevo (ferramentas de escultura bloqueadas).
  - ⛏️ **Modelador (Explorer)**: Esculpe montanhas, vales e costas (subir, descer, suavizar, aplainar, água) respeitando estritamente os setores e células trancadas.
  - 👑 **Cartógrafo (Cartographer)**: Permissão máxima de aprovação, fixação de cotas rígidas e trancamento de quadrantes.
- **Proteção Ativa de Água e Costa (`[x] Proteger Água / Costa existente`)**: Impede que pincéis de relevo (subir, descer, suavizar) alterem ou sequem rios, lagos ou costas marinhas já desenhadas, e impede que a ferramenta de água afogue terras consolidadas (> 0m).
- **Raymarch Analítico Anti-Paralaxe**: Algoritmo de busca binária em 14 passos direto na superfície interpolada do heightfield, eliminando completamente o deslocamento do cursor do mouse nas vistas Isométrica, Lateral e Livre. O anel do pincel segue com precisão milimétrica a superfície 3D real do relevo.
- **Curvas de Nível Dinâmicas 3D**: Cálculo em segundo plano via *Marching Squares* em *Web Worker*, com suavização anti-pontas (Chaikin / Bézier), espaçamento configurável (2m a 50m) e renderização sobreposta sem oclusão de texto.
- **Escala Real de Wurm Online**: Referência tática instantânea no terreno com escala comparativa: Boneco humano (1.8m) e Torre de Guarda (12m), com 1 tile = 4 metros e 10 dirts = 1 metro de elevação.
- **Sessões de Campo & Raio de Estação**: Simulação de estações de triangulação com anel de alcance tático de 100 tiles e limitação de pinceladas dentro do raio da estação.
- **Armazenamento Seguro Local-First (IndexedDB)**: Autosave contínuo, backups de segurança automáticos antes de restaurações ou limpezas, exportação/importação direta de arquivos `.json` e histórico de snapshots.
- **Navegação Multieixo Híbrida**: Controle simultâneo por Mouse (órbita, pan e zoom) e Teclado (`W`, `A`, `S`, `D`), com correção de inversão angular no modo Isométrico.
- **Suporte a Idiomas (i18n)**: Interface bilíngue completa com alternância instantânea entre Português (`PT-BR`) e Inglês (`EN`).

---

## 📖 Documentação & Guias

- 📘 **[Manual de Operações & Tutorial Completo](TUTORIAL.md)**: Guia passo a passo com fotos conceituais, atalhos de teclado e instruções para batedores e oficiais.
- 🗺️ **[Relatório de Engenharia Cartográfica & Calibração Swisstopo](docs/CARTOGRAFIA_CALIBRACAO_SWISSTOPO.md)**: Registro técnico do pipeline de alto contraste, sombreamento 3D limpo e resolução nativa 4096px.
- ⏱️ **[Especificação Arquitetural de Timelapse](docs/TIMELAPSE_SPEC.md)**: Planejamento técnico para reprodução temporal da evolução do território e gravação em vídeo WebM.

---

## 🚀 Como Executar Localmente

### 1. Início Rápido do Atlas 2D (Windows)
Basta dar dois cliques no arquivo:
```cmd
Iniciar-Jackal-Atlas.bat
```
Ele iniciará o servidor local na porta `3001` e abrirá seu navegador automaticamente em `http://localhost:3001/index.html`.

### 2. Manual via Node.js
```bash
# Iniciar o servidor HTTP
node server.js
```
Acesse:
- **Mapa Tático 2D**: `http://localhost:3001/index.html`
- **Caixa de Areia 3D (Sandbox)**: `http://localhost:3001/sandbox/`
- **Login Discord**: `http://localhost:3001/login.html`
- **Painel de Oficiais / Admin**: `http://localhost:3001/admin.html`

### 3. Desenvolvimento no Motor 3D (`sandbox-src`)
Para desenvolver, rodar testes ou modificar o Sandbox 3D:
```bash
cd sandbox-src
npm install

# Servidor de desenvolvimento com Hot-Reload (Three.js/Vite)
npm run dev

# Executar bateria de testes de invariantes e travas de relevo (Vitest)
npm test

# Compilar versão de produção estática (gera diretamente em ../sandbox)
npm run build
```

### 4. Bateria de Testes Automatizados do Atlas 2D
O projeto conta com uma suíte de testes com 42 verificações de sintaxe, DOM, cálculos cartográficos e conexão com o Supabase:
```bash
node test_suite.js
```

### 5. Deploy em Produção
O projeto está configurado para deploy contínuo no **Cloudflare Pages** conectado à branch `main`:
- **Atlas Principal**: [https://jackal-atlas.pages.dev](https://jackal-atlas.pages.dev)
- **Caixa de Areia 3D**: [https://jackal-atlas.pages.dev/sandbox](https://jackal-atlas.pages.dev/sandbox)

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

Scripts SQL na pasta `migrations/`:
1. `001_base_schema.sql` — Enums de cargos (`app_role`), tabela `profiles` e funções de autorização (`is_admin`, `is_officer`, `is_approved_member`).
2. `002_map_config.sql` — Configurações dinâmicas de mapas base.
3. `003_points_events.sql` — Tabela `points`, histórico `point_events` e gatilhos de cálculo de influência.
4. `004_objectives_routes.sql` — Tabela `objectives` (P1/P2/P3) e tabela `routes` (caminhos viários e pontes).
5. `005_config_seed.sql` — Tabelas de alcance de influência, marcos e fauna.
6. `006_security_hardening.sql` — Bloqueio de inserção direta de perfis, restrição de coordenadas geográficas e rate limit.
7. `007_fix_auth_and_permissions.sql` — Correção de provisionamento OAuth do Discord no login.
8. `008_point_management_policies.sql` — Políticas RLS para edição e exclusão de anotações pelos criadores e oficiais.
9. `009_admin_only_objectives.sql` — Restrição exclusiva para Administradores criarem Metas da Guilda e Topônimos.
10. `010_security_patches.sql` — Acesso público de leitura para visitantes (pontos confirmados e rotas) e bloqueio de auto-aprovação via UPDATE.
11. `011_sketch_strokes.sql` — Tabela `sketch_strokes` da camada de esboço (traços em coordenadas de tile, validação de caminho e limites). • Sketch strokes table.
12. `012_security_fixes.sql` — Perfis só podem ser criados pelo gatilho de cadastro (fim do INSERT anônimo), o último administrador não pode ser rebaixado nem apagado, eventos aprovados são aplicados uma única vez (sem reforço contado em dobro) e oficiais podem aprovar topônimos e registrar eventos neles (só administradores editam o conteúdo). • Profiles only via the sign-up trigger, last admin protected, approved events applied once, officers can approve landmarks.
13. `013_profile_discord_identity.sql` — Guarda nome e avatar do Discord no perfil (no cadastro, atualizado a cada login e preenchido para usuários existentes) para o painel admin mostrar nomes em vez de IDs; membros não podem alterá-los. • Stores Discord name and avatar so the admin panel shows names instead of IDs.
14. `014_sketch_commits.sql` — Versionamento estilo git: `sketch_commits` e `sketch_commit_erasures`, RPCs `sketch_commit_create` (atômica) e `sketch_commit_review` (aprovar, rejeitar, reverter, restaurar; só oficiais), histórico legível para "ver neste ponto", limites por commit para membros e tempo real. Só cadastros via Discord podem virar o primeiro admin. Depende de 011 e 013. • Git-style commits for sketches; depends on 011 and 013.
15. `015_sketch_colors.sql` — Tipo de traço `pen` com cor livre (hex) e opacidade por traço, imutáveis após o commit e gravados pela RPC de commit. • Free colours and per-stroke opacity for sketches.
16. `016_sketch_text_rotation.sql` — Rotação de textos (graus), imutável após o commit e gravada pela RPC; mover/redimensionar usam o caminho e a largura existentes. • Rotated text for sketches.
17. `017_guilds.sql` — Tabela `guilds` (nome, tag, cor) e `profiles.guild_id`; só administradores criam guildas e atribuem membros, e membros não podem trocar a própria guilda. • Guilds (name, tag, colour) and one guild per member; admins only.
18. `018_review_hardening.sql` — Nome, avatar e ID do Discord vêm da identidade do Discord (não dos metadados editáveis), só cadastros reais do Discord viram o primeiro admin, apagar um usuário mantém o trabalho dele no mapa, limites de commit sem corrida (2000 traços/hora, 2 MB) e travas extras no esboço. • Security hardening from code review.
19. `019_sandbox_3d_relief.sql` — Relevo 3D oficial do Sandbox (`relief_state`) e histórico de commits/snapshots. • Official 3D relief for the Sandbox and its history.
20. `020_identity_cleanup.sql` — Redefine nome, avatar e ID do Discord de todos os perfis a partir da identidade do Discord (apaga dados copiados de metadados antigos) e trava a exclusão de admins junto com o rebaixamento. • Identity cleanup and admin delete lock.
21. `021_sketch_commit_discard.sql` — RPC `sketch_commit_discard`: apaga de vez um commit fora do main (pendente, rejeitado ou revertido) com seus traços; autores descartam os próprios pendentes/rejeitados, oficiais qualquer um. • Discard unmerged sketch commits.

> Rode as migrações de 001 a 021, em ordem. Depois, defina `sketchShared: true` no `config.js`. • Run migrations 001 to 020 in order, then set `sketchShared: true` in `config.js`.

---

## 📁 Estrutura do Repositório

```
Jackal-Atlas/
├── index.html                  # Aplicação principal do Atlas 2D e mapa tático
├── login.html                  # Autenticação Discord e checagem de aprovação
├── admin.html                  # Painel de gestão de membros e fila de moderação
├── TUTORIAL.md                 # Manual de operações e tutorial detalhado
├── README.md                   # Apresentação do projeto e guia técnico (Português)
├── README.en.md                # English presentation & technical guide
├── test_suite.js               # Suíte de testes automatizados do Atlas 2D (42 verificações)
├── server.js                   # Servidor de desenvolvimento local (porta 3001)
├── Iniciar-Jackal-Atlas.bat     # Atalho executável para inicialização
├── config.example.js           # Template de credenciais Supabase
├── config.js                   # Configurações ativas do Supabase
├── swisstopo-ui.css            # Design System Swisstopo da Guilda
├── swiss-toponyms.css          # Estilização de toponímia e rótulos
├── _headers                    # Cabeçalhos CSP para deploy no Cloudflare Pages
├── robots.txt                  # Bloqueio de indexação pública
├── jackal_original_terrain_4096.png # Imagem mestre em alta definição
│
├── sandbox/                    # 🏔️ Bundle estático de produção da Caixa de Areia 3D (Cloudflare Pages)
│   ├── index.html              # Ponto de entrada do Sandbox 3D
│   └── assets/                 # Scripts JS minificados, Web Workers e folhas de estilo CSS
│
├── sandbox-src/                # 🛠️ Código-fonte TypeScript/Three.js do Sandbox 3D
│   ├── src/                    # Motor de relevo, shaders GLSL, Web Workers e interface UI
│   ├── tests/                  # Testes unitários de invariantes e travas de relevo (Vitest)
│   ├── package.json            # Dependências (Three.js, Lucide, Vitest, TypeScript)
│   └── vite.config.ts          # Configuração de build para compilar direto em ../sandbox
│
├── tiles_custom/               # Tiles personalizados ativos
├── tiles_terrain/              # Tiles locais de terreno (Zoom 0 ao 4)
├── tiles_topo/                 # Tiles locais de curvas de nível
├── tiles_iso/                  # Tiles locais em visão isométrica
├── migrations/                 # Migrações SQL numeradas (001 a 021)
└── scripts/                    # Utilitários de extração e fatiamento de tiles
```

---

## ⚡ Política de Cache de Tiles & Versionamento

Para garantir tempo de resposta de 60 FPS e carregamento sem travamentos de I/O de rede:
- As pirâmides de tiles (`/tiles_custom/*`, `/tiles_terrain/*`, `/tiles_iso/*`, `/tiles_topo/*`) e assets do sandbox são servidos no Cloudflare Pages com `Cache-Control: public, max-age=31536000, immutable`.
- **REGRA OBRIGATÓRIA**: Caso o mapa de terreno seja regerado ou atualizado no futuro, **NUNCA** substitua os arquivos diretamente nas mesmas pastas de tiles sem alterar o caminho. O cache imutável nos nós de borda da Cloudflare e nos navegadores dos oficiais manterá a versão antiga gravada. Crie sempre uma nova pasta versionada (exemplo: `tiles_terrain_v2/`, `tiles_custom_r2/`) e aponte no `index.html` ou nas configurações do mapa.

---

*Desenvolvido para A Guilda • Wurm Online Jackal Round 2 (2026).*
