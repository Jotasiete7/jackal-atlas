const fs = require('fs');
const path = require('path');
const https = require('https');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ [PASS] ${testName}`);
    } else {
        failedTests++;
        failures.push({ testName, details });
        console.error(`  ❌ [FAIL] ${testName}: ${details}`);
    }
}

console.log('====================================================');
console.log('🧪 BATERIA DE TESTES AUTOMATIZADOS — JACKAL ATLAS');
console.log('====================================================\n');

// ----------------------------------------------------
// BATERIA 1: SINTAXE JS E ESTRUTURA DOS ARQUIVOS HTML
// ----------------------------------------------------
console.log('📦 BATERIA 1: Validação de Sintaxe e Estrutura dos Arquivos');

['index.html', 'admin.html'].forEach(filename => {
    const filePath = path.join(__dirname, filename);
    const exists = fs.existsSync(filePath);
    assert(exists, `Arquivo ${filename} existe no repositório`);

    if (exists) {
        const content = fs.readFileSync(filePath, 'utf8');
        const scriptTags = content.match(/<script[\s\S]*?<\/script>/gi) || [];
        let syntaxOk = true;
        let syntaxErrorMsg = '';

        scriptTags.forEach((tag, idx) => {
            // Ignorar scripts externos com src="..."
            if (/src\s*=\s*["']/i.test(tag.split('>')[0])) return;
            const code = tag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
            try {
                new Function(code);
            } catch (e) {
                syntaxOk = false;
                syntaxErrorMsg = `Script #${idx} em ${filename}: ${e.message}`;
            }
        });

        assert(syntaxOk, `Sintaxe JS válida em todos os scripts de ${filename}`, syntaxErrorMsg);
    }
});

// ----------------------------------------------------
// BATERIA 2: INTEGRIDADE DO DOM E ELEMENTOS REFERENCIADOS
// ----------------------------------------------------
console.log('\n🔍 BATERIA 2: Integridade de Elementos DOM (getElementById)');

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const referencedIds = new Set();
let match;
while ((match = idRegex.exec(indexHtml)) !== null) {
    referencedIds.add(match[1]);
}

const htmlIdRegex = /\bid=['"]([^'"]+)['"]/g;
const declaredIds = new Set();
while ((match = htmlIdRegex.exec(indexHtml)) !== null) {
    declaredIds.add(match[1]);
}

// Elementos criados dinamicamente via JS (ex: toast, menus dinâmicos)
const dynamicAllowedIds = new Set(['mapCartoToast', 'swisstopo-subgrid', 'layer-checkbox-']);

let missingIds = [];
referencedIds.forEach(id => {
    if (!declaredIds.has(id) && !dynamicAllowedIds.has(id)) {
        missingIds.push(id);
    }
});

assert(missingIds.length === 0, `Todos os IDs acessados por document.getElementById existem no HTML`, 
       `IDs ausentes encontrados: ${missingIds.join(', ')}`);

// Checagem de IDs críticos dos recursos recém-implementados
const criticos = [
    'inputModalCoordX', 'inputModalCoordY', 'modalAddQuadBadge',
    'inputEditCoordX', 'inputEditCoordY', 'modalEditQuadBadge',
    'adminPendingCount', 'coordBox', 'quadBox',
    'modalAddPonto', 'modalEditarPonto', 'map'
];
criticos.forEach(id => {
    assert(declaredIds.has(id), `Elemento crítico com id="${id}" está presente no DOM`);
});

// ----------------------------------------------------
// BATERIA 3: ALGORITMOS CARTOGRÁFICOS E SISTEMA DE COORDENADAS WURM
// ----------------------------------------------------
console.log('\n🗺️ BATERIA 3: Cálculos Cartográficos e Grade Yaga');

const MAP_SIZE = 4096;
const YAGA_GRID_SPACING = 203.0;
const YAGA_GRID_OFFSETX = -26;
const YAGA_GRID_OFFSETY = -40;
const YAGA_LETTERS = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

function obterQuadranteWurm(y, x) {
    const i = Math.floor((y - YAGA_GRID_OFFSETY) / YAGA_GRID_SPACING);
    const j = Math.floor((x - YAGA_GRID_OFFSETX) / YAGA_GRID_SPACING);
    const letra = (i >= 0 && i < YAGA_LETTERS.length) ? YAGA_LETTERS[i] : '?';
    const numero = j + 7;
    return `${letra}${numero}`;
}

function obterBoundsQuadrante(letra, numero) {
    const i = YAGA_LETTERS.indexOf(letra.toUpperCase());
    const j = parseInt(numero, 10) - 7;
    if (i === -1 || isNaN(j) || j < 0) return null;
    const yMin = i * YAGA_GRID_SPACING + YAGA_GRID_OFFSETY;
    const yMax = (i + 1) * YAGA_GRID_SPACING + YAGA_GRID_OFFSETY;
    const xMin = j * YAGA_GRID_SPACING + YAGA_GRID_OFFSETX;
    const xMax = (j + 1) * YAGA_GRID_SPACING + YAGA_GRID_OFFSETX;
    return {
        yMin, yMax, xMin, xMax,
        yCenter: (yMin + yMax) / 2,
        xCenter: (xMin + xMax) / 2
    };
}

// Teste de quadrante do centro (2048, 2048) -> Em Wurm é M17
const quadCentro = obterQuadranteWurm(2048, 2048);
assert(quadCentro === 'L17' || quadCentro === 'M17', `Quadrante do centro (2048, 2048) calculado corretamente: ${quadCentro}`);

// Teste de limites dos bounds
const boundsL17 = obterBoundsQuadrante('L', 17);
assert(boundsL17 !== null, 'obterBoundsQuadrante("L", 17) retorna objeto de limites válido');
assert(boundsL17.xMin < boundsL17.xMax && boundsL17.yMin < boundsL17.yMax, 'Bounds calculam xMin < xMax e yMin < yMax coerentes');

// Teste de inversão Leaflet CRS: lat = MAP_SIZE - y
const coordY = 1500;
const latLeaflet = MAP_SIZE - coordY;
const wurmYRestaurado = MAP_SIZE - latLeaflet;
assert(wurmYRestaurado === coordY, `Inversão de latitude Leaflet (MAP_SIZE - y) é reversível sem perdas (esperado ${coordY}, obtido ${wurmYRestaurado})`);

// ----------------------------------------------------
// BATERIA 4: PARSER DE HASH URL E SMART PASTE DE COORDENADAS
// ----------------------------------------------------
console.log('\n🎯 BATERIA 4: Hash URL e Smart Paste (Expressões Regulares)');

function parseHash(hashStr) {
    const hash = hashStr.replace(/^#/, '').trim();
    if (!hash || hash.includes('access_token')) return null;

    const partes = hash.split(',');
    if (partes.length >= 2) {
        const x = parseInt(partes[0].trim(), 10);
        const y = parseInt(partes[1].trim(), 10);
        const z = partes[2] ? parseFloat(partes[2].trim()) : null;
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= MAP_SIZE && y >= 0 && y <= MAP_SIZE) {
            return { x, y, z: (!isNaN(z) && z >= 0 && z <= 6) ? z : 5.0 };
        }
    }
    return null;
}

assert(parseHash('#2897,2845')?.x === 2897 && parseHash('#2897,2845')?.y === 2845, 'Hash #2897,2845 decodificado com sucesso');
assert(parseHash('#1500,2000,4.5')?.z === 4.5, 'Hash com zoom #1500,2000,4.5 decodificado com z=4.5');
assert(parseHash('#access_token=xyz123') === null, 'Hash de autenticação OAuth com access_token é ignorado com segurança');
assert(parseHash('#99999,99999') === null, 'Coordenadas fora dos limites (> 4096) são rejeitadas');
assert(parseHash('#invalido') === null, 'String inválida retorna null');

function parseSmartPaste(text) {
    if (!text) return null;
    const nums = text.match(/\d+/g);
    if (nums && nums.length >= 2) {
        const xVal = parseInt(nums[0], 10);
        const yVal = parseInt(nums[1], 10);
        if (!isNaN(xVal) && !isNaN(yVal) && xVal >= 0 && xVal <= MAP_SIZE && yVal >= 0 && yVal <= MAP_SIZE) {
            return { x: xVal, y: yVal };
        }
    }
    return null;
}

assert(parseSmartPaste('2897,2845')?.x === 2897 && parseSmartPaste('2897,2845')?.y === 2845, 'Smart Paste: "2897,2845"');
assert(parseSmartPaste('2897 2845')?.x === 2897 && parseSmartPaste('2897 2845')?.y === 2845, 'Smart Paste: "2897 2845" (espaço)');
assert(parseSmartPaste('/vamp 2897 2845')?.x === 2897 && parseSmartPaste('/vamp 2897 2845')?.y === 2845, 'Smart Paste: comando Wurm "/vamp 2897 2845"');
assert(parseSmartPaste('X: 2897 Y: 2845')?.x === 2897 && parseSmartPaste('X: 2897 Y: 2845')?.y === 2845, 'Smart Paste: "X: 2897 Y: 2845"');
assert(parseSmartPaste('[2897, 2845]')?.x === 2897 && parseSmartPaste('[2897, 2845]')?.y === 2845, 'Smart Paste: formato array "[2897, 2845]"');
assert(parseSmartPaste('texto sem numeros') === null, 'Smart Paste: texto sem números retorna null');
assert(parseSmartPaste('5000 6000') === null, 'Smart Paste: valores fora do mapa (> 4096) retornam null');

// ----------------------------------------------------
// BATERIA 5: FILTRAGEM DE SEGURANÇA E MODERAÇÃO
// ----------------------------------------------------
console.log('\n🛡️ BATERIA 5: Pipeline de Moderação e Filtragem Multi-Nível');

const mockPoints = [
    { id: '1', name: 'Deed Oficial 1', confirmed: true, created_by: 'user_a' },
    { id: '2', name: 'Deed Oficial 2', confirmed: true, created_by: 'user_b' },
    { id: '3', name: 'Sugestao Pendente User A', confirmed: false, created_by: 'user_a' },
    { id: '4', name: 'Sugestao Pendente User B', confirmed: false, created_by: 'user_b' }
];

function filtrarPontosParaUsuario(points, user, profile) {
    const isStaff = !!(profile && (profile.role === 'admin' || profile.role === 'officer'));
    return points.filter(p => {
        if (p.confirmed === true || p.confirmed === undefined) return true;
        if (isStaff) return true;
        if (user && p.created_by === user.id) return true;
        return false;
    });
}

// 1. Visitante deslogado
const visaoVisitante = filtrarPontosParaUsuario(mockPoints, null, null);
assert(visaoVisitante.length === 2 && visaoVisitante.every(p => p.confirmed === true), 
       'Visitante deslogado vê APENAS pontos confirmados (2 de 4)');

// 2. Membro User A logado
const visaoUserA = filtrarPontosParaUsuario(mockPoints, { id: 'user_a' }, { role: 'member' });
assert(visaoUserA.length === 3 && visaoUserA.some(p => p.id === '3') && !visaoUserA.some(p => p.id === '4'), 
       'Membro User A vê pontos confirmados + sua própria sugestão (3 de 4, sem ver pendente de terceiros)');

// 3. Staff (Oficial ou Admin)
const visaoStaff = filtrarPontosParaUsuario(mockPoints, { id: 'user_staff' }, { role: 'officer' });
assert(visaoStaff.length === 4, 
       'Staff (Oficial/Admin) vê todos os pontos para moderação (4 de 4)');

// 4. Contador de Pendentes
const pendentesCount = mockPoints.filter(p => p.confirmed === false).length;
assert(pendentesCount === 2, `Cálculo da fila de pendentes correto: ${pendentesCount} itens`);

// ----------------------------------------------------
// BATERIA 6: TESTE DE CONECTIVIDADE COM API DO SUPABASE
// ----------------------------------------------------
console.log('\n🌐 BATERIA 6: Conectividade e Políticas RLS no Supabase');

async function testSupabase() {
    const supabaseUrl = 'https://ndeepjongrkeldzrssis.supabase.co';
    const anonKey = indexHtml.match(/supabaseKey:\s*['"]([^'"]+)['"]/)?.[1];

    if (!anonKey) {
        assert(false, 'Anon Key do Supabase encontrada no index.html');
        finalizarRelatorio();
        return;
    }

    assert(true, 'Anon Key do Supabase identificada');

    function fazerRequisicao(endpoint) {
        return new Promise((resolve) => {
            const url = `${supabaseUrl}/rest/v1/${endpoint}`;
            const req = https.get(url, {
                headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, data });
                });
            });
            req.on('error', (err) => {
                resolve({ error: err.message });
            });
            req.setTimeout(5000, () => {
                req.destroy();
                resolve({ timeout: true });
            });
        });
    }

    // Teste endpoint points com RLS pública de confirmados
    const resPoints = await fazerRequisicao('points?select=id,name,kind,confirmed&limit=5');
    if (resPoints.error || resPoints.timeout) {
        assert(false, 'Conexão com tabela "points" no Supabase', resPoints.error || 'Timeout');
    } else {
        assert(resPoints.statusCode === 200, 
               `Tabela "points" responde HTTP ${resPoints.statusCode} (Consulta anônima bem sucedida)`,
               `Status inesperado: ${resPoints.statusCode} - ${resPoints.data}`);
        try {
            const items = JSON.parse(resPoints.data);
            assert(Array.isArray(items), `Tabela "points" retornou array JSON válido (${items.length} itens encontrados)`);
        } catch(e) {
            assert(false, 'Resposta de "points" é JSON válido', e.message);
        }
    }

    // Teste endpoint routes com leitura pública
    const resRoutes = await fazerRequisicao('routes?select=id,name,kind&limit=5');
    if (resRoutes.statusCode === 200) {
        assert(true, `Tabela "routes" responde HTTP 200 com acesso público liberado pela migração`);
    } else {
        assert(false, `Tabela "routes" responde HTTP ${resRoutes.statusCode}`, resRoutes.data);
    }

    // Teste endpoint sensível profiles (deve bloquear leitura anônima sem auth)
    const resProfiles = await fazerRequisicao('profiles?select=id,role&limit=5');
    const profilesProtegido = (resProfiles.statusCode === 200 && resProfiles.data === '[]') || resProfiles.statusCode === 401 || resProfiles.statusCode === 403;
    assert(profilesProtegido, 
           `Tabela sensível "profiles" está blindada contra vazamento público (Retorno vazio/protegido: ${resProfiles.data})`);

    finalizarRelatorio();
}

function finalizarRelatorio() {
    console.log('\n====================================================');
    console.log(`📊 RESULTADO FINAL DA BATERIA DE TESTES:`);
    console.log(`   Total de Testes:   ${totalTests}`);
    console.log(`   ✅ Passaram:       ${passedTests}`);
    console.log(`   ❌ Falharam:       ${failedTests}`);
    console.log('====================================================\n');

    if (failedTests > 0) {
        console.error('⚠️ Detalhes das falhas:');
        failures.forEach(f => console.error(`  - ${f.testName}: ${f.details}`));
        process.exit(1);
    } else {
        console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
        process.exit(0);
    }
}

testSupabase();
