# 🌙 Jackal Atlas — Central Tática • A Guilda

Mapa tático e cartográfico colaborativo para o evento **Jackal Round 2** de Wurm Online (outubro de 2026).
Desenvolvido com o **Design System Swisstopo** oficial da guilda, arquitetura *event-sourced* no Supabase e suporte a operações de infraestrutura, controle de beacons de influência e objetivos prioritários (P1/P2/P3).

---

## 🗺️ Visão Geral

- **Base Cartográfica Leaflet**: Sistema `L.CRS.Jackal` em grade de 4096×4096 tiles com camadas completas de *Terrain*, *Topográfico* e *Isométrico*.
- **Controle de Influência & Beacons**: Radar em tempo real da ocupação do mapa (Freedom vs Jackal vs Neutro) com registro de reforço de beacons (até nível 2) e alertas de ataque.
- **Objetivos da Guilda (P1/P2/P3)**: Planejamento tático de estradas, pontes, limpeza de beacons e postos avançados com sistema de prioridades e foco de câmera no mapa.
- **Fluxo de Aprovação Rígido**: Usuários entram com Discord OAuth e aguardam aprovação de Oficiais/Admins. Pontos e eventos submetidos em campo entram na fila de validação militar.
- **Infraestrutura Pronta para Deploy**: Compatível com Cloudflare Pages e servidor local leve em Node.js.

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

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

Execute os scripts SQL da pasta `migrations/` em ordem no seu SQL Editor do Supabase:

1. `001_base_schema.sql` — Enums de cargos (`pending`, `member`, `officer`, `admin`), tabela de perfis e funções security definer.
2. `002_map_config.sql` — Configurações dinâmicas de mapas base e alternância de tiles.
3. `003_points_events.sql` — Beacons, cavernas, lodestones, histórico de guerra *event-sourced* e gatilhos de cálculo de influência.
4. `004_objectives_routes.sql` — Objetivos estratégicos P1/P2/P3 e traçados de estradas e pontes.
5. `005_config_seed.sql` — Tabelas editáveis de alcance de influência, marcos comunitários (Idols & Plinths) e slopes de montarias (Weta e Octopede).

Para conectar a aplicação ao Supabase:
1. Copie o arquivo `config.example.js` para `config.js`.
2. Insira sua `supabaseUrl` e `supabaseKey` (Anon Key pública).

---

## 📁 Estrutura de Arquivos

```
Jackal-Atlas/
├── index.html                  # Aplicação principal e mapa tático
├── login.html                  # Autenticação Discord e checagem de aprovação
├── admin.html                  # Painel de gestão de membros e fila de guerra
├── server.js                   # Servidor de desenvolvimento local (porta 3001)
├── Iniciar-Jackal-Atlas.bat     # Atalho executável para inicialização
├── config.example.js           # Template de credenciais Supabase
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
