# 🌙 Jackal Atlas — Tactical HQ • The Guild

> Versão em português: [README.md](README.md) • This is the English version of the README.

Collaborative tactical and cartographic map for the Wurm Online **Jackal Round 2** event (October 2026).
Built on the guild's official **Swisstopo Design System (Dark Swiss)**, with a real-time **Supabase** backend and full support for road infrastructure, territorial beacon control and priority objectives (P1/P2/P3).

---

## 🗺️ Main Features

- **Fast Leaflet Map Base**: Smooth, direct rendering engine (Harmony Atlas style), with a 4096×4096 tile grid, switchable *Terrain*, *Isometric* and *Topographic* layers and Swiss-style zoom controls.
- **Pulsing Tactical Crosshair & Dynamic URL**: Left-click anywhere to drop a pulsing red crosshair (`@keyframes sw-ping`) and instantly update the browser link (`#X,Y`) for quick sharing on Discord or in Wurm chat.
- **Instant Open by Link (`#X,Y` or `#X,Y,Z`)**: Links with coordinates open the camera directly on the tactical coordinates at 5.0x zoom, saving dozens of tile downloads around the centre.
- **Smart Coordinate Paste**: Automatically recognises pasted coordinates (`2897,2845`, `2897 2845`, `X: 2897 Y: 2845`, etc.) and fills them into the Deed and annotation dialogs. Marker popups have a **📋 X,Y** button that copies a point's coordinates for Discord.
- **Sketch Layer (hand-drawn map)**: Whiteboard-style drawing for when there is no map dump: brushes for water, forest, mountain ridges, sand and rock, plus arrows, text labels and camp / tunnel exit / danger stamps, an adjustable brush size and an eraser. Strokes are stored in game tile coordinates, so they line up with the grid and markers at every zoom. Sketches stay in the browser by default; with `sketchShared: true` in `config.js` and migrations 011 and 014 applied they are shared live.
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

## 📖 Documentation & Guides

- 📘 **[Operations Manual & Full Tutorial](TUTORIAL.en.md)**: Step-by-step guide with conceptual screenshots, keyboard shortcuts and instructions for scouts and officers.
- 🗺️ **[Cartographic Engineering & Swisstopo Calibration Report](docs/CARTOGRAFIA_CALIBRACAO_SWISSTOPO.md)**: Technical record of the high-contrast pipeline, clean 3D shading and native 4096px resolution.
- ⏱️ **[Timelapse Architecture Spec](docs/TIMELAPSE_SPEC.md)**: Technical plan for replaying the territory's evolution over time and recording it as WebM video.

---

## 🚀 Running Locally

### 1. Quick Start (Windows)
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
- **Tactical Map**: `http://localhost:3001/index.html`
- **Discord Login**: `http://localhost:3001/login.html`
- **Officers / Admin Panel**: `http://localhost:3001/admin.html`

### 3. Automated Test Suite
The project ships with a test suite of 42 checks covering syntax, DOM, cartographic calculations and the Supabase connection:
```bash
node test_suite.js
```

### 4. Production Deploy
The project is set up for continuous deployment on **Cloudflare Pages**, connected to the `main` branch:
- **Production**: [https://jackal-atlas.pages.dev](https://jackal-atlas.pages.dev)

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
11. `011_sketch_strokes.sql` — `sketch_strokes` table for the Sketch layer: tile-coordinate paths, officer approval for members' strokes, authors (or officers) erase, 300 strokes/hour rate limit, and live updates. After running it, set `sketchShared: true` in `config.js`.
12. `012_security_fixes.sql` — Profiles can only be created by the sign-up trigger, the last admin cannot be demoted or deleted, approved events are applied exactly once (no double reinforcement), and officers can approve landmarks and log events on them while only admins edit landmark content.
13. `013_profile_discord_identity.sql` — Stores each member's Discord display name and avatar on their profile (at sign-up, refreshed on sign-in, backfilled for existing users) so the admin panel shows names instead of Discord ID numbers. Members cannot change these themselves.
14. `014_sketch_commits.sql` — Git-style versioning for the Sketch layer: `sketch_commits` (message, author, pending/approved/rejected/reverted) and `sketch_commit_erasures`, strokes linked to their commit, atomic `sketch_commit_create` and officer-only `sketch_commit_review` (approve, reject, revert, restore) RPCs, history readable for time travel, 30 commits/hour and 500 strokes per commit for members, live updates, and only Discord sign-ups can become the first admin.

---

## 📁 Repository Structure

```
Jackal-Atlas/
├── index.html                  # Main application and tactical map
├── login.html                  # Discord authentication and approval check
├── admin.html                  # Member management panel and moderation queue
├── TUTORIAL.md                 # Operations manual and detailed tutorial
├── README.md                   # Project overview and technical guide
├── test_suite.js               # Automated test suite (42 checks)
├── server.js                   # Local development server (port 3001)
├── Iniciar-Jackal-Atlas.bat     # Launcher shortcut
├── config.example.js           # Supabase credentials template
├── config.js                   # Active Supabase settings
├── swisstopo-ui.css            # The Guild's Swisstopo Design System
├── swiss-toponyms.css          # Toponym and label styling
├── _headers                    # CSP headers for Cloudflare Pages deploys
├── robots.txt                  # Blocks public indexing
├── jackal_original_terrain_4096.png # High-resolution master image
├── tiles_custom/               # Active custom tiles
├── tiles_terrain/              # Local terrain tiles (zoom 0 to 4)
├── tiles_topo/                 # Local contour-line tiles
├── tiles_iso/                  # Local isometric-view tiles
├── migrations/                 # Numbered SQL migrations (001 to 010)
└── scripts/                    # Tile extraction and slicing utilities
```

---

## ⚡ Tile Caching & Versioning Policy

To keep rendering at 60 FPS and loading free of network I/O stalls:
- The tile pyramids (`/tiles_custom/*`, `/tiles_terrain/*`, `/tiles_iso/*`, `/tiles_topo/*`) are served on Cloudflare Pages with `Cache-Control: public, max-age=31536000, immutable`.
- **MANDATORY RULE**: If the terrain map is regenerated or updated in the future, **NEVER** overwrite files in the same tile folders without changing the path. The immutable cache on Cloudflare's edge nodes and in officers' browsers will keep serving the old version. Always create a new versioned folder (for example `tiles_terrain_v2/`, `tiles_custom_r2/`) and point `index.html` or the map settings at it.

---

*Built for the Guild • Wurm Online Jackal Round 2 (2026).*
