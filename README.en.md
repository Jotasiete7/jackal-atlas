# 🌙 Jackal Atlas & 3D Sandbox — Tactical HQ • The Guild

> Versão em português: [README.md](README.md) • This is the English version of the README.

Complete collaborative tactical and cartographic map for the Wurm Online **Jackal Round 2** event (October 2026).
Built on the guild's official **Swisstopo Design System (Dark Swiss)**, with a real-time **Supabase** backend and the seamless integration of two high-performance tools:

1. **Tactical 2D Atlas & Collaborative Sketch (`/`)**: Multi-scale cartographic base, whiteboard-style hand drawing with Git-style versioning (drafts, commits with officer review and atomic reverts), road infrastructure and territorial influence radar.
2. **3D Collaborative Relief Sandbox (Jackal Sandbox — `/sandbox`)**: Real-time WebGL/Three.js engine running at 60 FPS for exploratory data capture, terrain heightfield sculpting, dynamic contour generation, and sector-level cartographic locking.

---

## 🗺️ Main Features of the 2D Atlas

- **Fast Leaflet Map Base**: Smooth, direct rendering engine (Harmony Atlas style), with a 4096×4096 tile grid, switchable *Terrain*, *Isometric* and *Topographic* layers and Swiss-style zoom controls.
- **Pulsing Tactical Crosshair & Dynamic URL**: Left-click anywhere to drop a pulsing red crosshair (`@keyframes sw-ping`) and instantly update the browser link (`#X,Y`) for quick sharing on Discord or in Wurm chat.
- **Instant Open by Link (`#X,Y` or `#X,Y,Z`)**: Links with coordinates open the camera directly on the tactical coordinates at 5.0x zoom, saving dozens of tile downloads around the centre.
- **Smart Coordinate Paste**: Automatically recognises pasted coordinates (`2897,2845`, `2897 2845`, `X: 2897 Y: 2845`, etc.) and fills them into the Deed and annotation dialogs. Marker popups have a **📋 X,Y** button that copies a point's coordinates for Discord.
- **Sketch Layer (hand-drawn map)**: Whiteboard-style drawing for when there is no map dump: a pen with a colour palette and opacity, arrows, text labels and camp / tunnel exit / danger stamps, an adjustable brush size, an eraser, and a select tool to move, resize, rotate, recolour or delete what is drawn. Changes are committed like git, with a history view and officer review. Strokes are stored in game tile coordinates, so they line up with the grid and markers at every zoom. Sketches stay in the browser by default; with `sketchShared: true` in `config.js` and migrations 001 to 020 applied they are shared live.
- **Sketch Commits (git-style versioning)**: You sketch into a private draft, then **commit** it with a message. Officers' commits go live at once; members' commits wait for an officer to approve the whole commit. The **history panel** lists every commit (who, when, message, strokes added/erased), outlines a commit on the map when you hover it, can show the map **as it was at any commit**, and lets officers **revert** a commit (hidden, never deleted) or restore it. While someone is drawing, others see their in-progress stroke live with a name tag.
- **Blank Parchment Base (Round 2)**: A plain map sheet to sketch on as scouts explore. The old Jackal map (Round 1) stays available as Goldfish®, Terrain, Isometric and Topo.
- **Collaborative Moderation Pipeline (Zero Vandalism)**:
  - Annotations from regular members are created as pending (`confirmed: false`) and only appear publicly after an Officer/Admin approves them.
  - Officers and Admins approve or reject proposals directly on the map in one click, or from the admin panel.
  - External and logged-out visitors can only see points and routes that are already confirmed.
- **Wurm YAGA Grid & Quadrant Highlighting**: Shows the official quadrants (`B7` to `Z26`), instant quadrant search (e.g. `L17`) and precise coordinate calculation.
- **Infrastructure Mode & Deed Sizer**:
  - Draw straight roads and bridges (90° orthogonal and 45° diagonal via Wurm Snap) with tile counts.
  - Real-time area measurement for deed and terraforming planning.
- **Influence Radar & Beacons**: Live tracking of territorial control (Freedom vs Jackal vs Neutral), beacon reinforcements (+1, +2), attack alerts and the Guild's First Milestone (Idols & Plinths).
- **Hardened Security (RLS)**: Fine-grained database rules that block self-approval, prevent privilege escalation and apply rate limiting.

---

## 🏔️ 3D Collaborative Relief Sandbox (Jackal Sandbox — `/sandbox`)

A real-time 3D cartographic sculpting tool engineered to capture exploratory field observations and model terrain relief with game-accurate physics:

- **Continuous 3D Mesh (Zero-Seams & 60 FPS)**: Single seamless geometry with custom GLSL shaders for hypsometric elevation coloring (green valleys, ochre slopes, rocky peaks), directional hillshading, and tactical hatching for unexplored void.
- **100×100 Sector Locks & Cartographer Padlocks**:
  - The map is partitioned into cartographic sheets of 100×100 tiles (20×20 cells of 5×5 tiles each).
  - Quick footer toggle (`[🔓]/[🔒]`) to lock the entire active sheet (`N0-L0`, etc.) or lock specific cells using the Padlock Brush (`🔒 [K]`).
  - Consolidated and locked areas are 100% immune to accidental brush strokes by other modellers.
- **3 Operational Roles (Permissions)**:
  - 🧭 **Scout**: Focused on placing field pins, pillars, and landmarks without risk of deforming the 3D relief (sculpting tools disabled).
  - ⛏️ **Explorer / Modeller**: Sculpts terrain (raise, lower, smooth, flatten, water) strictly respecting sheet locks and locked cells.
  - 👑 **Cartographer**: Master authority for approving terrain, setting immutable benchmark pins, and locking quadrants.
- **Active Coastline & Water Protection (`[x] Protect Water / Coastline`)**: Prevents relief sculpting brushes (raise, lower, smooth) from inadvertently drying or modifying existing rivers, lakes, and oceans, while preventing the water tool from submerging terraformed land (> 0m).
- **Anti-Parallax Analytical Raymarch**: Fast 14-step binary search algorithm executed directly against the interpolated heightfield surface. Completely eliminates cursor parallax displacement in Isometric, Side, and Free 3D views. The brush ring locks onto the mouse pointer with sub-centimetre precision on any mountain slope.
- **Dynamic 3D Contour Lines**: Calculated asynchronously in a Web Worker using *Marching Squares* with Chaikin/Bézier anti-corner smoothing, configurable intervals (2m to 50m), and high-contrast layered rendering that never occludes text.
- **Real Wurm Online Scale Reference**: Real-time scale objects on the terrain: human character (1.8m) and Guard Tower (12m), respecting Wurm standards (1 tile = 4m, 10 dirts = 1m elevation).
- **Field Sessions & Station Range**: Triangulation station simulation with a 100-tile tactical range ring and optional brush constraint within the station radius.
- **Safe Local-First Storage (IndexedDB)**: Continuous autosave, automatic safety backups before destructive restores or map clears, direct JSON import/export, and snapshot versioning.
- **Hybrid Multi-Axis Navigation**: Simultaneous Orbit/Pan/Zoom via mouse and continuous `W`, `A`, `S`, `D` keyboard panning with angle inversion correction in Isometric mode.
- **Full Bilingual Support (i18n)**: Seamless instant switching between Portuguese (`PT-BR`) and English (`EN`).

---

## 📖 Documentation & Guides

- 📘 **[Operations Manual & Full Tutorial](TUTORIAL.en.md)**: Step-by-step guide with conceptual screenshots, keyboard shortcuts and instructions for scouts and officers.
- 🗺️ **[Cartographic Engineering & Swisstopo Calibration Report](docs/CARTOGRAFIA_CALIBRACAO_SWISSTOPO.md)**: Technical record of the high-contrast pipeline, clean 3D shading and native 4096px resolution.
- ⏱️ **[Timelapse Architecture Spec](docs/TIMELAPSE_SPEC.md)**: Technical plan for replaying the territory's evolution over time and recording it as WebM video.

---

## 🚀 Running Locally

### 1. 2D Atlas Quick Start (Windows)
Just double-click:
```cmd
Iniciar-Jackal-Atlas.bat
```
It starts the local server on port `3001` and automatically opens your browser at `http://localhost:3001/index.html`.

### 2. Manually with Node.js
```bash
# Start the HTTP server
node server.js
```
Then open:
- **Tactical 2D Map**: `http://localhost:3001/index.html`
- **3D Relief Sandbox**: `http://localhost:3001/sandbox/`
- **Discord Login**: `http://localhost:3001/login.html`
- **Officers / Admin Panel**: `http://localhost:3001/admin.html`

### 3. Developing the 3D Engine (`sandbox-src`)
To develop, run tests or modify the 3D Sandbox:
```bash
cd sandbox-src
npm install

# Vite development server with Hot-Reload (Three.js/Vite)
npm run dev

# Run Vitest test suite for terrain invariants and lock protection
npm test

# Build static production bundle (outputs directly into ../sandbox)
npm run build
```

### 4. Automated 2D Atlas Test Suite
The project ships with a test suite of 42 checks covering syntax, DOM, cartographic calculations and the Supabase connection:
```bash
node test_suite.js
```

### 5. Production Deploy
The project is set up for continuous deployment on **Cloudflare Pages**, connected to the `main` branch:
- **Main Atlas**: [https://jackal-atlas.pages.dev](https://jackal-atlas.pages.dev)
- **3D Relief Sandbox**: [https://jackal-atlas.pages.dev/sandbox](https://jackal-atlas.pages.dev/sandbox)

---

## 🗄️ Database Structure (Supabase)

SQL scripts in the `migrations/` folder:
1. `001_base_schema.sql` — Role enums (`app_role`), the `profiles` table and authorisation functions (`is_admin`, `is_officer`, `is_approved_member`).
2. `002_map_config.sql` — Dynamic base-map settings.
3. `003_points_events.sql` — The `points` table, `point_events` history and influence-calculation triggers.
4. `004_objectives_routes.sql` — The `objectives` table (P1/P2/P3) and the `routes` table (roads and bridges).
5. `005_config_seed.sql` — Influence-range, milestone and fauna tables.
6. `006_security_hardening.sql` — Blocks direct profile inserts, restricts coordinates and adds rate limiting.
7. `007_fix_auth_and_permissions.sql` — Fixes Discord OAuth provisioning on login.
8. `008_point_management_policies.sql` — RLS policies so creators and officers can edit and delete annotations.
9. `009_admin_only_objectives.sql` — Only Administrators can create Guild Goals and Toponyms.
10. `010_security_patches.sql` — Public read access for visitors (confirmed points and routes) and blocks self-approval via UPDATE.
11. `011_sketch_strokes.sql` — `sketch_strokes` table for the Sketch layer: tile-coordinate paths, officer approval for members' strokes, authors (or officers) erase, 300 strokes/hour rate limit, and live updates.
12. `012_security_fixes.sql` — Profiles can only be created by the sign-up trigger, the last admin cannot be demoted or deleted, approved events are applied exactly once (no double reinforcement), and officers can approve landmarks and log events on them while only admins edit landmark content.
13. `013_profile_discord_identity.sql` — Stores each member's Discord display name and avatar on their profile (at sign-up, refreshed on sign-in, backfilled for existing users) so the admin panel shows names instead of Discord ID numbers. Members cannot change these themselves.
14. `014_sketch_commits.sql` — Git-style versioning for the Sketch layer: `sketch_commits` (message, author, pending/approved/rejected/reverted) and `sketch_commit_erasures`, strokes linked to their commit, atomic `sketch_commit_create` and officer-only `sketch_commit_review` (approve, reject, revert, restore) RPCs, history readable for time travel, 30 commits/hour and 500 strokes per commit for members, live updates, and only Discord sign-ups can become the first admin.
15. `015_sketch_colors.sql` — `pen` stroke kind with a free hex colour and per-stroke opacity, fixed once committed and written by the commit RPC.
16. `016_sketch_text_rotation.sql` — Text rotation (degrees), fixed once committed and written by the commit RPC; move/resize use the existing path and width.
17. `017_guilds.sql` — `guilds` table (name, tag, colour) and `profiles.guild_id`; only admins create guilds and assign members, and members cannot change their own guild.
18. `018_review_hardening.sql` — Discord name, avatar and ID come from the Discord identity (not user-editable metadata), only real Discord sign-ups can become the first admin, deleting a user keeps their map work, race-free commit limits (2000 strokes/hour, 2 MB) and extra sketch guards.
19. `019_identity_cleanup.sql` — Resets every profile's Discord name, avatar and ID to exactly what the Discord identity says (clearing anything copied from old metadata), and locks admin deletion together with demotion.
20. `020_sketch_commit_discard.sql` — `sketch_commit_discard` RPC: permanently deletes a commit that is not on main (pending, rejected or reverted) with its strokes; authors can discard their own pending/rejected commits, officers any of them.

> Run migrations 001 to 020 in order, then set `sketchShared: true` in `config.js`.

---

## 📁 Repository Structure

```
Jackal-Atlas/
├── index.html                  # Main 2D Atlas application & tactical map
├── login.html                  # Discord OAuth login & approval verification
├── admin.html                  # Member management & proposal moderation panel
├── TUTORIAL.md                 # Operations manual & detailed tutorial (Portuguese)
├── TUTORIAL.en.md              # Operations manual & detailed tutorial (English)
├── README.md                   # Project presentation & technical guide (Portuguese)
├── README.en.md                # Project presentation & technical guide (English)
├── test_suite.js               # 2D Atlas automated test suite (42 checks)
├── server.js                   # Local development server (port 3001)
├── Iniciar-Jackal-Atlas.bat     # Windows batch launcher
├── config.example.js           # Supabase credentials template
├── config.js                   # Active Supabase configuration
├── swisstopo-ui.css            # Guild Swisstopo Design System
├── swiss-toponyms.css          # Toponym and label styling
├── _headers                    # CSP and security headers for Cloudflare Pages
├── robots.txt                  # Public crawler indexing disallow
├── jackal_original_terrain_4096.png # Master high-resolution image
│
├── sandbox/                    # 🏔️ Production static bundle for 3D Relief Sandbox (Cloudflare Pages)
│   ├── index.html              # 3D Sandbox entry point
│   └── assets/                 # Minified JS bundles, Web Workers and CSS stylesheets
│
├── sandbox-src/                # 🛠️ 3D Sandbox TypeScript/Three.js source code
│   ├── src/                    # Heightfield engine, GLSL shaders, Web Workers and UI
│   ├── tests/                  # Terrain invariant and lock protection test suite (Vitest)
│   ├── package.json            # Dependencies (Three.js, Lucide, Vitest, TypeScript)
│   └── vite.config.ts          # Build configuration to output directly to ../sandbox
│
├── tiles_custom/               # Active custom tiles
├── tiles_terrain/              # Local terrain tiles (Zoom 0 to 4)
├── tiles_topo/                 # Local contour line tiles
├── tiles_iso/                  # Local isometric tiles
├── migrations/                 # Sequential SQL migrations (001 to 020)
└── scripts/                    # Tile extraction and slicing utilities
```

---

## ⚡ Tile Caching Policy & Versioning

To ensure 60 FPS responsiveness and eliminate network I/O stalls:
- Tile pyramids (`/tiles_custom/*`, `/tiles_terrain/*`, `/tiles_iso/*`, `/tiles_topo/*`) and sandbox assets are served on Cloudflare Pages with `Cache-Control: public, max-age=31536000, immutable`.
- **MANDATORY RULE**: If the terrain map is re-rendered or updated in the future, **NEVER** overwrite files directly in the same tile folders without changing the path. Edge cache on Cloudflare nodes and browser caches will hold onto the old tiles. Always create a new versioned folder (e.g. `tiles_terrain_v2/`, `tiles_custom_r2/`) and point to it in `index.html` or map configuration.

---

*Engineered for A Guilda • Wurm Online Jackal Round 2 (2026).*
