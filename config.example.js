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
