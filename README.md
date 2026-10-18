# 🌙 Jackal Atlas — Central Tática • A Guilda

> 🇺🇸 English version: [README.en.md](README.en.md)

Mapa tático e cartográfico colaborativo para o evento **Jackal Round 2** de Wurm Online (outubro de 2026).
Desenvolvido com o **Design System Swisstopo (Dark Swiss)** oficial da guilda, arquitetura em tempo real com **Supabase** e suporte completo a infraestrutura viária, controle territorial de beacons e objetivos prioritários (P1/P2/P3).

---

## 🗺️ Funcionalidades Principais

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

## 📖 Documentação & Guias

- 📘 **[Manual de Operações & Tutorial Completo](TUTORIAL.md)**: Guia passo a passo com fotos conceituais, atalhos de teclado e instruções para batedores e oficiais.
- 🗺️ **[Relatório de Engenharia Cartográfica & Calibração Swisstopo](docs/CARTOGRAFIA_CALIBRACAO_SWISSTOPO.md)**: Registro técnico do pipeline de alto contraste, sombreamento 3D limpo e resolução nativa 4096px.
- ⏱️ **[Especificação Arquitetural de Timelapse](docs/TIMELAPSE_SPEC.md)**: Planejamento técnico para reprodução temporal da evolução do território e gravação em vídeo WebM.

---

## 🚀 Como Executar Localmente

### 1. Início Rápido (Windows)
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
- **Mapa Tático**: `http://localhost:3001/index.html`
- **Login Discord**: `http://localhost:3001/login.html`
- **Painel de Oficiais / Admin**: `http://localhost:3001/admin.html`

### 3. Bateria de Testes Automatizados
O projeto conta com uma suíte de testes com 42 verificações de sintaxe, DOM, cálculos cartográficos e conexão com o Supabase:
```bash
node test_suite.js
```

### 4. Deploy em Produção
O projeto está configurado para deploy contínuo no **Cloudflare Pages** conectado à branch `main`:
- **Produção**: [https://jackal-atlas.pages.dev](https://jackal-atlas.pages.dev)

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

> Rode as migrações de 001 a 017, em ordem. Depois, defina `sketchShared: true` no `config.js`. • Run migrations 001 to 017 in order, then set `sketchShared: true` in `config.js`.

---

## 📁 Estrutura do Repositório

```
Jackal-Atlas/
├── index.html                  # Aplicação principal e mapa tático
├── login.html                  # Autenticação Discord e checagem de aprovação
├── admin.html                  # Painel de gestão de membros e fila de moderação
├── TUTORIAL.md                 # Manual de operações e tutorial detalhado
├── README.md                   # Apresentação do projeto e guia técnico
├── test_suite.js               # Suíte de testes automatizados (42 verificações)
├── server.js                   # Servidor de desenvolvimento local (porta 3001)
├── Iniciar-Jackal-Atlas.bat     # Atalho executável para inicialização
├── config.example.js           # Template de credenciais Supabase
├── config.js                   # Configurações ativas do Supabase
├── swisstopo-ui.css            # Design System Swisstopo da Guilda
├── swiss-toponyms.css          # Estilização de toponímia e rótulos
├── _headers                    # Cabeçalhos CSP para deploy no Cloudflare Pages
├── robots.txt                  # Bloqueio de indexação pública
├── jackal_original_terrain_4096.png # Imagem mestre em alta definição
├── tiles_custom/               # Tiles personalizados ativos
├── tiles_terrain/              # Tiles locais de terreno (Zoom 0 ao 4)
├── tiles_topo/                 # Tiles locais de curvas de nível
├── tiles_iso/                  # Tiles locais em visão isométrica
├── migrations/                 # Migrações SQL numeradas (001 a 017)
└── scripts/                    # Utilitários de extração e fatiamento de tiles
```

---

## ⚡ Política de Cache de Tiles & Versionamento

Para garantir tempo de resposta de 60 FPS e carregamento sem travamentos de I/O de rede:
- As pirâmides de tiles (`/tiles_custom/*`, `/tiles_terrain/*`, `/tiles_iso/*`, `/tiles_topo/*`) são servidas no Cloudflare Pages com `Cache-Control: public, max-age=31536000, immutable`.
- **REGRA OBRIGATÓRIA**: Caso o mapa de terreno seja regerado ou atualizado no futuro, **NUNCA** substitua os arquivos diretamente nas mesmas pastas de tiles sem alterar o caminho. O cache imutável nos nós de borda da Cloudflare e nos navegadores dos oficiais manterá a versão antiga gravada. Crie sempre uma nova pasta versionada (exemplo: `tiles_terrain_v2/`, `tiles_custom_r2/`) e aponte no `index.html` ou nas configurações do mapa.

---

*Desenvolvido para A Guilda • Wurm Online Jackal Round 2 (2026).*
