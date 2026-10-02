# 🌙 Jackal Atlas — Central Tática • A Guilda

Mapa tático e cartográfico colaborativo para o evento **Jackal Round 2** de Wurm Online (outubro de 2026).
Desenvolvido com o **Design System Swisstopo (Dark Swiss)** oficial da guilda, arquitetura em tempo real com **Supabase** e suporte completo a infraestrutura viária, controle territorial de beacons e objetivos prioritários (P1/P2/P3).

---

## 🗺️ Funcionalidades Principais

- **Base Cartográfica Leaflet**: Sistema de coordenadas Wurm com grade de 4096×4096 tiles, alternância entre camadas *Terrain*, *Isométrico* e *Topográfico* e controle de zoom suíço no canto inferior direito.
- **Menu de Contexto Tático (Botão Direito)**: Clique em qualquer local do mapa para adicionar Deeds/pontos com coordenadas pré-preenchidas, copiar o comando `/vamp X Y` com 1 clique ou centralizar a visualização.
- **Modo Foco de Infraestrutura (`sw-focus-bar`)**: Ferramenta de traçado de estradas e pontes com cálculo dinâmico de tiles em tempo real, suporte a desfazimento de nós (`↩`) e gravação na tabela `routes` do Supabase.
- **Gestão de Deeds & Pontos**: Suporte completo a cadastro de vilas com atribuição de **Prefeito (Mayor)**, facções militares, popups interativos e botões de edição (`✏️`) e exclusão (`🗑️`) para criadores e oficiais.
- **Radar de Influência & Beacons**: Cálculo dinâmico da ocupação do mapa (Freedom vs Jackal vs Neutro), reforço até nível 2x, alertas ao vivo de ataque e monitoramento do Primeiro Marco Comunitário (Idols & Plinths).
- **Busca Inteligente com Autocomplete**: Localização instantânea por quadrantes Wurm (ex: `M15`, `k20` com destaque luminoso), nomes de Deeds, Prefeitos, Beacons e Cavernas com câmera guiada (`flyTo`).
- **Autenticação Discord & Controle de Acesso**: Permissões baseadas em cargos (`pending`, `member`, `officer`, `admin`) e painel administrativo (`admin.html`) para moderação de acessos e submissões.
- **Persistência Local**: Configurações de camadas ativas lembradas automaticamente no navegador do usuário via `localStorage`.

---

## 📖 Documentação & Guias

- 📘 **[Manual de Operações & Tutorial Completo](TUTORIAL.md)**: Guia passo a passo com fotos conceituais, atalhos de teclado e instruções para batedores e oficiais.

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

### 3. Deploy em Produção
O projeto está configurado para deploy contínuo no **Cloudflare Pages** conectado à branch `main`:
- **Produção**: [https://jackal-atlas.pages.dev](https://jackal-atlas.pages.dev)

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

Scripts SQL na pasta `migrations/`:
1. `001_base_schema.sql` — Enums de cargos, tabela `profiles` e funções de autorização.
2. `002_map_config.sql` — Configurações dinâmicas de mapas base.
3. `003_points_events.sql` — Tabela `points` (com `attrs jsonb`), histórico `point_events` e gatilhos de cálculo de influência.
4. `004_objectives_routes.sql` — Tabela `objectives` (P1/P2/P3) e tabela `routes` (caminhos viários e pontes).
5. `005_config_seed.sql` — Tabelas de alcance de influência, marcos e fauna.
6. `006_discord_auth_trigger.sql` — Gatilho automático de provisionamento de novos usuários Discord.
7. `007_admin_role_escalation.sql` — Funções para moderação de cargos no painel admin.
8. `008_point_management_policies.sql` — Políticas RLS para edição e exclusão de pontos por criadores e oficiais.

---

## 📁 Estrutura do Repositório

```
Jackal-Atlas/
├── index.html                  # Aplicação principal e mapa tático
├── login.html                  # Autenticação Discord e checagem de aprovação
├── admin.html                  # Painel de gestão de membros e fila de guerra
├── TUTORIAL.md                 # Manual de operações e tutorial detalhado
├── README.md                   # Apresentação do projeto e guia técnico
├── server.js                   # Servidor de desenvolvimento local (porta 3001)
├── Iniciar-Jackal-Atlas.bat     # Atalho executável para inicialização
├── config.example.js           # Template de credenciais Supabase
├── config.js                   # Configurações ativas do Supabase
├── swisstopo-ui.css            # Design System Swisstopo da Guilda
├── swiss-toponyms.css          # Estilização de toponímia e rótulos
├── _headers                    # Cabeçalhos CSP para deploy no Cloudflare Pages
├── robots.txt                  # Bloqueio de indexação pública
├── jackal_original_terrain_4096.png # Imagem mestre em alta definição
├── tiles_terrain/              # Tiles locais de terreno (Zoom 0 ao 4)
├── tiles_topo/                 # Tiles locais de curvas de nível
├── tiles_iso/                  # Tiles locais em visão isométrica
├── migrations/                 # Migrações SQL numeradas
└── scripts/                    # Utilitários de extração e fatiamento
```

---

*Desenvolvido para A Guilda • Wurm Online Jackal Round 2 (2026).*
