// ==============================================================================
// JACKAL SANDBOX — LOCALIZATION DICTIONARY (ENGLISH EN)
// ==============================================================================

import { pt, TranslationKey } from './pt';

export const en: Record<TranslationKey, string> = {
  // App
  app_title: 'JACKAL SANDBOX',
  app_subtitle: 'WURM 3D',

  // Camera Bar
  cam_top: 'Top',
  cam_iso: 'Isometric',
  cam_lat: 'Side',
  cam_free: 'Free',
  cam_center_zero: '(0,0)',
  cam_center_station: 'Station',
  cam_exaggeration: 'Exaggeration:',
  north: 'N',
  east: 'E',
  south: 'S',
  west: 'W',

  // Tools
  tool_raise: 'Raise Terrain (Brush Up)',
  tool_lower: 'Lower Terrain (Brush Down to 0m)',
  tool_smooth: 'Smooth Terrain (Alleviate Slopes)',
  tool_flatten: 'Flatten (Level to Target Height)',
  tool_water: 'Water Tool (Fixed Sea Level at 0m)',
  tool_eraser: 'Eraser (Reset cells to Unknown)',
  tool_lock: 'Terrain Lock [K] (Protects against edits; Alt+Click unlocks)',
  tool_pin: 'Add / Inspect Survey Pin',
  tool_station: 'Set Visit Survey Station (Observer origin)',
  undo: 'Undo (Ctrl+Z)',
  redo: 'Redo (Ctrl+Y)',

  // Brush Panel
  brush_properties: 'BRUSH PROPERTIES',
  brush_protect_water: 'Protect existing Water / Coastline',
  brush_diameter_presets: 'DIAMETER PRESETS (TILES)',
  brush_continuous_size: 'Continuous Size',
  brush_intensity: 'Intensity / Strength',
  brush_falloff: 'Falloff Profile',
  falloff_smooth: 'Smooth',
  falloff_hard: 'Hard',
  target_elevation: 'Flatten Target Elevation',

  // Map Layers
  panel_layers: 'Map Layers',
  badge_visual: 'VISUAL',
  layer_grid: 'Grid 100/10 tiles',
  layer_contours: 'Contour Lines [C]',
  contour_interval: 'Contour Interval:',
  meters: 'meters',
  layer_hillshade: 'Hillshade Shading',
  layer_confidence: 'Confidence Map',
  layer_pins: 'Pins & Landmarks',
  layer_station_range: 'Station Range',
  layer_wireframe: 'Wireframe Mesh',

  // Wurm Scale Reference
  scale_title: 'Real Wurm Scale [H]:',
  scale_tile_badge: '1 TILE = 4m',
  scale_tower: 'Tower (24m)',
  scale_human: 'Human (1.8m)',
  scale_pillar: 'Pillar (4m)',
  scale_hide: 'Hide',
  label_human: 'HUMAN (1.8m)',
  label_tower: 'GUARD TOWER (Alt: 24m, real Wurm height)',
  label_pillar: 'PILLAR (Ht: 4m | 1.4×1.4m)',

  // Exports
  panel_export: 'EXPORT',
  badge_files: 'FILES',
  export_geojson: 'GeoJSON',
  export_svg: 'SVG',
  export_png: 'Cartographic PNG',

  // Field Session / Visit
  panel_session: 'FIELD SESSION',
  badge_visit: 'VISIT',
  visit_author: 'Author:',
  visit_station: 'Station:',
  visit_range: 'Range:',
  visit_strokes: 'Strokes:',
  enforce_station_range: 'Lock to station radius',
  btn_new_visit: '+ New Visit / Station',

  // Snapshots
  panel_snapshots: 'Relief Snapshots',
  badge_history: 'HISTORY',
  snapshot_placeholder: 'Snapshot name...',
  btn_download_json: 'Download JSON',
  btn_load_json: 'Upload JSON',
  btn_clear_map: 'Clear Map',
  no_snapshots: 'No snapshots saved.',
  restore: 'Restore',

  // Confidence Legend
  legend_title: 'CARTOGRAPHIC CONFIDENCE',
  conf_locked: 'Locked: Approved Terrain 🔒',
  conf_measured: 'Measured: Fixed Pin / Landmark',
  conf_estimated: 'Estimated: ≥ 2 stations',
  conf_speculative: 'Speculative: Single visit',
  conf_water: 'Water: Sea Level (0m)',
  conf_unknown: 'Unknown: Unsurveyed',

  // Pins Modal
  pin_modal_title: 'GEODETIC SURVEY PIN',
  pin_author: 'Surveyor / Author',
  pin_type: 'Pin Type',
  pin_type_tower: 'Official Guard Tower (1 tile = 4×4m | 12m ht)',
  pin_type_pillar: 'Survey Pillar (1.4×1.4m | 4m ht)',
  pin_type_coast: 'Coast Marker (Fixed Sea Level 0m)',
  pin_type_peak: 'Peak / Landmark',
  pin_type_generic: 'Generic / Point of Interest',
  pin_coords: 'Coordinates (Wurm Tiles)',
  pin_elevation: 'Elevation / Altitude (Z in meters)',
  pin_elevation_hint: 'Leave blank to follow ground surface automatically.',
  pin_lock_altitude: 'Lock ground elevation at this height (Hard Constraint)',
  pin_method: 'Survey Method',
  pin_method_constructed: 'Field Built Landmark (High Confidence)',
  pin_method_spyglass: 'Spyglass Sightline',
  pin_method_tile_count: 'Step / Tile Count',
  pin_method_estimation: 'Visual Estimate',
  pin_uncertainty: 'Spatial Uncertainty (± tiles)',
  pin_notes: 'Field Notes',
  pin_notes_placeholder: 'Ex: Peak visible from north bay...',
  pin_status_validated: 'Validated by Chief Cartographer',
  pin_status_pending: 'Pending Confirmation',
  btn_delete_pin: 'Delete',
  btn_cancel: 'Cancel',
  btn_save_pin: 'Save Pin',

  // Bottom Status Bar
  status_tile: 'tile:',
  status_sheet: 'sheet:',
  status_elevation: 'alt:',
  status_state: 'state:',
  status_state_land: 'Land',
  status_state_water: 'Water (0m)',
  status_state_unknown: 'Unknown',
  status_role_label: 'Role:',
  status_role_scout: '🧭 SCOUT',
  status_role_explorer: '⛏️ EXPLORER',
  status_role_cartographer: '👑 CARTOGRAPHER',
  status_role_collaborator: 'COLLABORATOR',

  // Controls & Shortcuts Guide
  help_btn_title: 'Controls & Shortcuts Guide',
  help_modal_title: 'QUICK CONTROLS & SHORTCUTS GUIDE',
  help_sec_nav: '3D Navigation & Camera',
  help_nav_wasd: 'WASD / Arrows: Pan camera across map',
  help_nav_orbit: 'Right Click (or Alt+Click): Rotate 3D orbit',
  help_nav_pan: 'Middle Click (or Ctrl+Click): Pan map',
  help_nav_focus: 'Double Click on Terrain: Center camera focus',
  help_sec_scale: 'Wurm Scale & Tools',
  help_scale_move: 'Shift + Left Click: Move Scale Object to cursor',
  help_scale_toggle: 'Key [H]: Cycle Tower (24m) / Human (1.8m) / Pillar (4m) / Hide',
  help_contours_toggle: 'Key [C]: Toggle Contour Lines',
  help_tools_keys: 'Keys [R, L, M, F, U/Alt+W, E, K, P, T]: Select tools',
  help_presets_keys: 'Keys [1 to 5]: Brush diameter (5 to 100 tiles)',

  // Messages
  alert_new_visit_prompt: 'Explorer name for new visit:',
  alert_snapshot_saved: 'Snapshot saved successfully!',
  alert_snapshot_restore_confirm: 'Restore snapshot? This will replace current terrain (a safety auto-backup will be saved).',
  alert_snapshot_restored: 'Snapshot restored successfully!',
  alert_delete_snapshot_confirm: 'Are you sure you want to permanently DELETE snapshot',
  alert_clear_map_confirm: 'Are you sure you want to clear the entire current terrain and reset to unknown? (A safety auto-backup will be saved).',
  alert_import_error: 'Error loading snapshot file: ',
  alert_no_contours: 'No contours generated to export yet. Sculpt some terrain first!',

  // Nuvem e Sincronização
  cloud_pull: 'Cloud',
  cloud_pull_title: 'Load official relief from cloud (Supabase)',
  cloud_publish: 'Publish',
  cloud_publish_title: 'Publish relief as official shared version (Officers)',
  cloud_sync_pins: '2D Pins',
  cloud_sync_pins_title: 'Sync pins and markers from 2D Atlas',
  login_discord: 'Discord',
  login_discord_title: 'Sign in with Discord on Jackal Atlas',
  prompt_commit_msg: 'Describe changes in this official relief:',
  alert_cloud_published: 'Official relief published successfully to the cloud!',
  alert_cloud_loaded: 'Official relief loaded successfully from the cloud!',
};

