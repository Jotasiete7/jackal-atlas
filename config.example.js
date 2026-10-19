// ==============================================================================
// JACKAL ATLAS — CONFIGURAÇÃO DO SUPABASE & MAPA
// Copie este arquivo para "config.js" e insira as credenciais do seu projeto Supabase.
// O projeto Supabase do Jackal Atlas DEVE ser separado do Harmony Atlas.
// ==============================================================================

window.JACKAL_CONFIG = {
    // URL do projeto Supabase (ex: https://xyzcompany.supabase.co)
    supabaseUrl: 'https://SEU-PROJETO.supabase.co',

    // Chave pública anônima (anon public key)
    supabaseKey: 'SUA_ANON_PUBLIC_KEY_AQUI',

    // Armazenamento da camada de esboço. false (padrão) guarda os esboços só no navegador de cada visitante.
    // Use true depois de rodar as migrações 001 a 021 (em ordem) neste projeto Supabase
    // para compartilhar com a guilda (commits, histórico, aprovação de oficiais e traços ao vivo).
    // Sketch layer storage: false = browser only; true = shared via Supabase (needs migrations 001 to 021).
    sketchShared: false,

    // URLs dos tiles do mapa (Round 1 como base/placeholder temporário)
    tiles: {
        terrain: 'https://wurmmaps.xyz/Jackal/tiles/{z}/{x}/{y}-terrain.png',
        isometric: 'https://wurmmaps.xyz/Jackal/tiles/{z}/{x}/{y}-iso.png',
        topographic: 'https://wurmmaps.xyz/Jackal/tiles/{z}/{x}/{y}-topo.png'
    },

    // Dimensões do mapa em tiles (4096 x 4096)
    mapSize: 4096,
    maxNativeZoom: 4,
    maxZoom: 6,
    minZoom: 1
};
