// ==============================================================================
// JACKAL SANDBOX — DICIONÁRIO DE LOCALIZAÇÃO (PORTUGUÊS PT-BR)
// ==============================================================================

export const pt = {
  // App
  app_title: 'JACKAL SANDBOX',
  app_subtitle: 'WURM 3D',

  // Barra de Câmera
  cam_top: 'Topo',
  cam_iso: 'Isométrico',
  cam_lat: 'Lateral',
  cam_free: 'Livre',
  cam_center_zero: '(0,0)',
  cam_center_station: 'Estação',
  cam_exaggeration: 'Exagero:',
  north: 'N',
  east: 'L',
  south: 'S',
  west: 'O',

  // Ferramentas
  tool_raise: 'Pincel Positivo (Eleva relevo)',
  tool_lower: 'Pincel Negativo (Rebaixa relevo até 0m)',
  tool_smooth: 'Suavizar Relevo (Alisa encostas)',
  tool_flatten: 'Nivelar (Aplaina na cota selecionada)',
  tool_water: 'Ferramenta Água (Carimba nível do mar fixo em 0m)',
  tool_eraser: 'Borracha (Devolve células para Desconhecido)',
  tool_lock: 'Cadeado de Relevo [K] (Tranca contra alterações; Alt+Clique destranca)',
  tool_pin: 'Adicionar / Inspecionar Marco Geodésico (Pino)',
  tool_station: 'Definir Estação da Visita (Ponto de observação)',
  undo: 'Desfazer (Ctrl+Z)',
  redo: 'Refazer (Ctrl+Y)',

  // Painel de Pincel
  brush_properties: 'PROPRIEDADES DO PINCEL',
  brush_protect_water: 'Proteger Água / Costa existente',
  brush_diameter_presets: 'PRESETS DE DIÂMETRO (TILES)',
  brush_continuous_size: 'Tamanho Contínuo',
  brush_intensity: 'Intensidade / Força',
  brush_falloff: 'Perfil de Queda',
  falloff_smooth: 'Suave',
  falloff_hard: 'Duro',
  target_elevation: 'Cota Alvo de Aplainamento',

  // Camadas do Mapa
  panel_layers: 'Camadas do Mapa',
  badge_visual: 'VISUAL',
  layer_grid: 'Grade 100/10 tiles',
  layer_contours: 'Curvas de Nível [C]',
  contour_interval: 'Intervalo de cota:',
  meters: 'metros',
  layer_hillshade: 'Sombreamento (Hillshade)',
  layer_confidence: 'Mapa de Confiança',
  layer_pins: 'Pinos e Marcos',
  layer_station_range: 'Raio da Estação',
  layer_wireframe: 'Malha Aramada (Wireframe)',

  // Referência de Escala Wurm
  scale_title: 'Escala Real de Wurm [H]:',
  scale_tile_badge: '1 TILE = 4m',
  scale_human: 'Boneco (1.8m)',
  scale_tower: 'Torre (24m)',
  scale_hide: 'Ocultar',
  label_human: 'BONECO (1.8m)',
  label_tower: 'TORRE (Alt: 24m, altura real do Wurm)',

  // Exportações
  panel_export: 'EXPORTAÇÃO',
  badge_files: 'ARQUIVOS',
  export_geojson: 'GeoJSON',
  export_svg: 'SVG',
  export_png: 'PNG 2D',

  // Sessão de Campo / Visita
  panel_session: 'SESSÃO DE CAMPO',
  badge_visit: 'VISITA',
  visit_author: 'Autor:',
  visit_station: 'Estação:',
  visit_range: 'Alcance:',
  visit_strokes: 'Pinceladas:',
  enforce_station_range: 'Travar no raio da estação',
  btn_new_visit: '+ Nova Visita / Estação',

  // Snapshots
  panel_snapshots: 'Snapshots de Relevo',
  badge_history: 'HISTÓRICO',
  snapshot_placeholder: 'Nome do snapshot...',
  btn_download_json: 'Baixar JSON',
  btn_load_json: 'Carregar JSON',
  btn_clear_map: 'Limpar Mapa',
  no_snapshots: 'Nenhum snapshot salvo.',
  restore: 'Restaurar',

  // Legenda de Confiança
  legend_title: 'CONFIABILIDADE CARTOGRÁFICA',
  conf_locked: 'Trancado: Relevo Aprovado 🔒',
  conf_measured: 'Medido: Marco / Pino fixo',
  conf_estimated: 'Estimado: ≥ 2 estações',
  conf_speculative: 'Especulativo: Visita única',
  conf_water: 'Água: Nível Zero (0m)',
  conf_unknown: 'Desconhecido: Sem dados',

  // Modal de Pinos
  pin_modal_title: 'MARCO GEODÉSICO (PINO)',
  pin_author: 'Autor do Registro',
  pin_type: 'Tipo de Marco',
  pin_type_tower: 'Torre de Guarda Oficial (1 tile = 4×4m | 12m alt)',
  pin_type_pillar: 'Pilar de Agrimensura (1.4×1.4m | 4m alt)',
  pin_type_coast: 'Marco de Costa (Nível do Mar 0m fixo)',
  pin_type_peak: 'Cume / Ponto Notável',
  pin_type_generic: 'Genérico / Ponto de Interesse',
  pin_coords: 'Coordenadas (Tiles Wurm)',
  pin_elevation: 'Altitude / Cota (Z em metros)',
  pin_elevation_hint: 'Deixe em branco para acompanhar a superfície do terreno.',
  pin_lock_altitude: 'Travar terreno nesta cota (Âncora Rígida)',
  pin_method: 'Método de Medição',
  pin_method_constructed: 'Marco Construído em Campo (Alta Confiabilidade)',
  pin_method_spyglass: 'Visada com Luneta / Spyglass',
  pin_method_tile_count: 'Contagem de Passos / Tiles',
  pin_method_estimation: 'Estimativa Visual',
  pin_uncertainty: 'Incerteza Espacial (± tiles)',
  pin_notes: 'Observações de Campo',
  pin_notes_placeholder: 'Ex: Pico visível da costa norte...',
  pin_status_validated: 'Validado pelo Cartógrafo',
  pin_status_pending: 'Pendente de Confirmação',
  btn_delete_pin: 'Excluir',
  btn_cancel: 'Cancelar',
  btn_save_pin: 'Salvar Marco',

  // Barra de Status Inferior
  status_tile: 'tile:',
  status_sheet: 'folha:',
  status_elevation: 'cota:',
  status_state: 'estado:',
  status_state_land: 'Terra',
  status_state_water: 'Água (0m)',
  status_state_unknown: 'Desconhecido',
  status_role_label: 'Papel:',
  status_role_scout: '🧭 BATEDOR',
  status_role_explorer: '⛏️ MODELADOR',
  status_role_cartographer: '👑 CARTÓGRAFO',
  status_role_collaborator: 'COLABORADOR',

  // Guia de Ajuda e Atalhos
  help_btn_title: 'Guia de Comandos e Atalhos',
  help_modal_title: 'GUIA RÁPIDO DE COMANDOS E ATALHOS',
  help_sec_nav: 'Navegação e Câmera 3D',
  help_nav_wasd: 'WASD / Setas: Movimentar pelo mapa',
  help_nav_orbit: 'Botão Direito (ou Alt+Clique): Girar órbita 3D',
  help_nav_pan: 'Botão do Meio (ou Ctrl+Clique): Arrastar mapa (Pan)',
  help_nav_focus: 'Duplo Clique no Terreno: Centralizar foco da câmera',
  help_sec_scale: 'Escala Wurm e Ferramentas',
  help_scale_move: 'Shift + Clique Esquerdo: Mover Boneco/Torre para o cursor',
  help_scale_toggle: 'Tecla [H]: Alternar Boneco (1.8m) / Torre (24m) / Ocultar',
  help_contours_toggle: 'Tecla [C]: Ligar / Desligar Curvas de Nível',
  help_tools_keys: 'Teclas [R, L, M, F, U/Alt+W, E, K, P, T]: Selecionar ferramentas',
  help_presets_keys: 'Teclas [1 a 5]: Diâmetro do pincel (5 a 100 tiles)',

  // Mensagens
  alert_new_visit_prompt: 'Nome do Explorador para a nova visita:',
  alert_snapshot_saved: 'Snapshot gravado com sucesso!',
  alert_snapshot_restore_confirm: 'Restaurar este snapshot? Isso substituirá o relevo atual (um backup de segurança será criado automaticamente).',
  alert_snapshot_restored: 'Snapshot restaurado com sucesso!',
  alert_delete_snapshot_confirm: 'Tem certeza que deseja EXCLUIR permanentemente o snapshot',
  alert_clear_map_confirm: 'Tem certeza que deseja limpar todo o relevo atual e voltar para terreno desconhecido? (Um backup de segurança será criado automaticamente).',
  alert_import_error: 'Erro ao carregar arquivo de relevo: ',
  alert_no_contours: 'Nenhuma curva de nível gerada para exportar ainda. Modele alguma elevação primeiro!',

  // Nuvem e Sincronização
  cloud_pull: 'Nuvem',
  cloud_pull_title: 'Carregar relevo oficial da nuvem (Supabase)',
  cloud_publish: 'Publicar',
  cloud_publish_title: 'Publicar relevo como versão oficial compartilhada (Oficiais)',
  cloud_sync_pins: 'Pinos 2D',
  cloud_sync_pins_title: 'Sincronizar pinos e marcos do Atlas 2D',
  login_discord: 'Discord',
  login_discord_title: 'Entrar com Discord no Atlas Jackal',
  prompt_commit_msg: 'Descreva as alterações deste relevo oficial:',
  alert_cloud_published: 'Relevo oficial publicado com sucesso na nuvem!',
  alert_cloud_loaded: 'Relevo oficial carregado com sucesso da nuvem!',
};

export type TranslationKey = keyof typeof pt;

