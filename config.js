// ==============================================================================
// JACKAL ATLAS — CONFIGURAÇÃO DO SUPABASE & MAPA
// Projeto: Wurm Online Historical Archive (Dedicado ao Jackal Round 2)
// ==============================================================================

window.JACKAL_CONFIG = {
    // URL do projeto Supabase
    supabaseUrl: 'https://ndeepjongrkeldzrssis.supabase.co',

    // Chave pública anônima (anon public key)
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kZWVwam9uZ3JrZWxkenJzc2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNzA3NTUsImV4cCI6MjEwNzg0Njc1NX0.p7Tqg-EHAW3LhJVX3GX_COFIAJ4L94UufV0sUxdutFI',

    // Nova publishable key (compatibilidade)
    publishableKey: 'sb_publishable_sX4zAXSzEqRHWSHT28Tzvw_PJOyn_mo',

    // Chave de API ImgBB (obtenha gratuitamente em https://api.imgbb.com para links que viram imagem no Discord)
    imgbbApiKey: 'ea391a78c4c3c286593571423f9e279a',

    // URLs dos tiles locais / offline
    tiles: {
        custom: 'tiles_custom/{z}/{x}/{y}.png',
        terrain: 'tiles_terrain/{z}/{x}/{y}.png',
        isometric: 'tiles_iso/{z}/{x}/{y}.png',
        topographic: 'tiles_topo/{z}/{x}/{y}.png'
    },

    // Dimensões do mapa em tiles (4096 x 4096)
    mapSize: 4096,
    maxNativeZoom: 4,
    maxZoom: 6,
    minZoom: 0
};
