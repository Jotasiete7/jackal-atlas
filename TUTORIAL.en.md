> Versão em português: [TUTORIAL.md](TUTORIAL.md) • This is the English version of the tutorial.

# 📖 Operations Manual & Full Tutorial — Jackal Atlas
*Official field guide for the Guild's scouts, officers and commanders • Wurm Online Jackal Round 2*

---

## 🧭 1. Introduction & Visual Philosophy

**Jackal Atlas** (`https://jackal-atlas.pages.dev`) was designed as the guild's definitive cartographic and tactical hub for the Jackal server. Its interface follows the **Swiss Design System (Dark Swiss)**:
- **Informative minimalism**: Only essential data on screen, so nothing gets in the way of reading the terrain.
- **Military precision**: Tabular coordinates in a monospaced font and exact calculation of standard YAGA quadrants (B7 to Z26).
- **Real time**: Instant sync over WebSockets with the Supabase database.

---

## 🔐 2. Access & Permissions

1. Open the portal at **[https://jackal-atlas.pages.dev](https://jackal-atlas.pages.dev)**.
2. Click **Sign in with Discord** in the left sidebar (or go straight to `login.html`).
3. Authorise the Discord app.
4. **Role Hierarchy**:
   - **`pending`**: New recruit waiting to be approved by an Officer or Administrator.
   - **`member`**: Full view of the map, layers and objectives, and can submit new points/events for moderation.
   - **`officer`**: Instant approval of points, direct creation of objectives and member management.
   - **`admin` (High Command)**: Unrestricted access to approvals, officer promotion and deletion of infrastructure and points.

> 💡 **Admin Note**: The system's first administrator automatically gets access to the **Officers Panel (`admin.html`)** to approve new members in one click.

---

## 🗺️ 3. Map Navigation & Coordinate System

### 3.1 Terrain Bases
In the **Map Base** accordion, switch between three views of Jackal's terrain:
- **Terrain**: Aerial view of vegetation, soil, sand and water.
- **Isometric**: Classic three-dimensional view for spotting slopes and valleys.
- **Topographic**: Precise contour lines for planning climbs and road routes.

### 3.2 Wurm Quadrant Grid (YAGA)
Turn on **Wurm Quadrant Grid** to overlay the dashed lines and quadrant labels (e.g. `M15`, `K20`, `L12`).
The bottom HUD (`sw-coord-hud-bar`) always shows the exact `X • Y` coordinates, the quadrant and the zoom level under the mouse.

---

## 🔍 4. Smart Search with Autocomplete

At the top of the left sidebar, use the search box, which supports several criteria:
- **By Quadrant**: Type `M15`, `b7` or `k20` to instantly highlight the whole quadrant with a glowing cyan outline and centre the camera on it.
- **By Deed / Village**: Type the village name or the **Mayor**'s name. The system finds the Deed and lists it with its faction badge.
- **By Point of Interest**: Type names or types of beacons, caves, mineral resources or landmarks.
- **Instant Navigation**: Clicking any item in the dropdown makes the map fly smoothly there (`flyTo`) and automatically opens the detailed popup with all actions.

---

## 🖱️ 5. Tactical Context Menu (Right-Click on the Map)

> Note: this menu is described in the original documentation but is not in the current version of `index.html`.

**Right-click** anywhere on the terrain to open the dark context menu:
- 📍 **Add Point / Deed here**: Opens the dialog with that pixel's exact coordinates already filled in.
- 📋 **Copy coordinates**: Copies `X,Y` (e.g. `2048,1850`) to the clipboard for Discord. (The original copied a `/vamp` command, but `/vamp` is not a command regular players can use in Wurm Online.)
- 🔍 **Centre Map here**: Smoothly centres the view on that point.

---

## 🛣️ 6. Focus Mode & Infrastructure Drawing (Roads & Bridges)

To map and plan roads and crossings:

1. In the **Infrastructure** accordion, click **Draw Road** or **Draw Bridge**.
2. The interface switches to **Focus Mode**:
   - The bottom bar turns into the **`sw-focus-bar`**.
   - The cursor becomes a crosshair (`crosshair`).
3. **Click on the map one point after another** to draw the route node by node.
   - The total length is **calculated live in Wurm tiles**.
   - Visual markers show the start point (green), intermediate nodes and the end point (red).
4. **Quick Controls**:
   - **↩ Undo**: Removes the last node if you misclicked.
   - **✓ Save Build**: Opens a dialog to name the road/bridge and choose whether it is *Planned* (dashed line) or *Paved/Completed* (solid line). The build is saved permanently to Supabase and synced to the whole guild.
   - **✕ Cancel** (or the **ESC** key): Cancels editing without saving.

---

## ✏️ 6.1 Sketch Layer (Hand-Drawn Map)

For Round 2 there may be no map dump, so the land can be sketched by hand as scouts explore, like a shared whiteboard:

1. Pick **📜 Blank Parchment (Round 2)** under Map Layers (the old Round 1 map is still there as Goldfish®, Terrain, Isometric and Topo).
2. Click **✏️ Sketch** in the top bar. The bottom bar turns into the sketch toolbar.
3. Choose a brush and **drag on the map** to draw:
   - **Water** (blue), **Forest** (green), **Ridge** (brown line for mountain ridges), **Sand** (yellow), **Rock** (grey).
   - **Size** sets the brush width in game tiles, so a 12-tile lake edge stays 12 tiles wide at every zoom.
4. Other tools:
   - **➡️ Arrow**: drag from start to end.
   - **🔤 Label**: click where the text goes and type it (Small, Medium, Large or Region name).
   - **⛺ Camp**, **🚇 Tunnel exit**, **⚠️ Danger**: click to place a stamp.
   - **🧽 Erase**: click or drag over a stroke. Strokes in your draft are removed; live strokes are marked for erasing (faded) and disappear once your commit is live.
   - **↩ Undo** (or **Ctrl+Z**) undoes the last change in your draft. **🗑️ Discard** throws the whole draft away.
5. Everything you draw goes into your **draft** first (dashed, only you can see it, kept in your browser even if you reload). When you are happy, press **💾 Commit…**, describe what you changed, and commit.
   - **Officers and Admins**: the commit goes live for everyone straight away.
   - **Members**: the commit waits for an Officer (**📝 Review** in the toolbar, or the Pending tab in History), who approves or rejects the whole commit.
6. **🕘 History** lists every commit. Hover one to outline it on the map (gold = added, red = erased), click **👁 View at this point** to see the map as it was then (**Back to live** returns), and Officers can **↩ Revert** a commit (its strokes are hidden, never deleted) or **⟲ Restore** it.
7. While someone else is drawing, you see their stroke appear live with their name, before they commit.
8. Hold **Space** and drag to pan while sketching. **ESC** or **✕ Close** leaves sketch mode (your draft is kept).

The **✏️ Sketch Layer** checkbox and opacity slider under Map Layers show, hide or fade the drawing (for example under a real map later).

**Where sketches are saved:** the chip in the toolbar shows it.
- **💾 Local only**: commits are saved in this browser (the default).
- **🌐 Shared • live**: commits are saved to Supabase and shown to everyone live. Needs migrations `011_sketch_strokes.sql` and `014_sketch_commits.sql` and `sketchShared: true` in `config.js`.
- **👁️ View only**: shared mode, but you are not signed in as an approved member.

---

## 🏘️ 7. Adding and Managing Deeds and Points

### 7.1 Add a New Point
1. Click **Add Point on Map** or right-click on the map.
2. A floating badge (**Crosshair Tracker**) follows the mouse and shows the live coordinates.
3. Click the exact spot to open the form.
4. Choose the element type:
   - 🏘️ **Deed / Village**: Unlocks the extra **👑 Mayor / Owner** field.
   - 🔴 **Beacon**: Links it to the territorial influence system.
   - 🪨 **Lodestone**, 🕳️ **Natural Cave**, ⛏️ **Mineral Resource**, ✨ **Idol / Plinth** or 📦 **Supplies**.
5. Pick the faction (**Jackal**, **Freedom**, **Neutral** or **Unknown**).

### 7.2 Edit or Delete Existing Points
- Click the marker on the map to open its popup.
- If you created the point, or you are an **Officer** or **Admin**, these buttons appear:
  - ✏️ **Edit**: Rename it, change its type or faction, or update the Deed's Mayor.
  - 🗑️ **Delete**: Removes the point from the database after confirmation.
- The popup also has a quick **📋 X,Y** button that copies the point's coordinates (e.g. `2897,2845`) for Discord or the Add Marker form.

---

## ⚔️ 8. Tactical HQ (Right-Hand Military HUD)

The right sidebar gathers the combat intelligence:
- **Territorial Influence Radar**: Live chart proportional to who holds the active beacons on the island (Freedom vs Jackal vs Neutral).
- **First Community Milestone**: Tracks the control goal (20% Freedom) needed to unlock Jackal's Idols and Plinths.
- **Quick Field Actions**:
  - Select a beacon on the map to enable the tactical buttons:
    - 💥 **Cleared!** (marks it as Neutral).
    - 🏳️ **Converted** (claims it for Freedom).
    - ⬆️ **Reinforced (+1)** (adds a fortification layer, up to 2x).
    - 🚨 **Under Attack!** (sends a general alert about an enemy incursion).
- **War Timeline**: Real-time event feed streaming what is happening on the island.

---

## 🛡️ 9. Officers Admin Panel (`admin.html`)

Available to users with the `officer` or `admin` role:
1. **Military Moderation Queue**:
   - Points and reports from recruit members come in as pending.
   - Officers can approve them in one click (publishing them to the whole guild) or reject them.
2. **Guild Member Board**:
   - Lists every user authenticated via Discord.
   - Lets you change roles: promote to Officer, demote, or ban unwanted users.
3. **Sync Status**: Monitors the live WebSocket channel and the database response status.

---

## ⌨️ 10. Keyboard Shortcuts & Pro Tips

| Key / Shortcut | Action |
| :--- | :--- |
| **`ESC`** | Closes open dialogs, cancels route drawing, point-adding and sketch mode. |
| **`Space` + drag** | Pans the map while in sketch mode. |
| **`Ctrl + Z`** | Undoes your last sketch stroke while in sketch mode. |
| **`Ctrl + F5`** | Forces a browser refresh and clears the tile and script cache. |
| **`LocalStorage`** | Your layer on/off preferences are saved automatically in your browser. |

---

*Jackal Atlas — Cartographic technology forged for the Guild.*
