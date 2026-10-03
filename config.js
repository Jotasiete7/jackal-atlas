// ==============================================================================
// JACKAL ATLAS — CONFIGURAÇÃO DO SUPABASE & MAPA
// Projeto: Wurm Online Historical Archive (Dedicado ao Jackal Round 2)
// ==============================================================================

window.JACKAL_CONFIG = {
    // URL do projeto Supabase
    supabaseUrl: 'https://grkqxztxxelebdflhnlv.supabase.co',

    // Chave pública anônima (anon public key)
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdya3F4enR4eGVsZWJkZmxobmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjA0NjQsImV4cCI6MjA5NDA5NjQ2NH0.hR_DpTLuZYAlvdIBNfG9yk4wFW6mCwxsU9PvwPta94w',

    // Nova publishable key (compatibilidade)
    publishableKey: 'sb_publishable_y44HqaybQIc7KhldlxAEeg_pXP2wNQP',

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
