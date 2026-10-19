// ==============================================================================
// JACKAL SANDBOX — Extract Wurm models for Placeables (local use only)
//
// Copies a handful of models and textures from YOUR Wurm Online client install into
// sandbox-src/public/wurm/ so the 🌲 Placeables tool can show them. These files are
// Game Chest Group / Code Club AB property: the folder is git-ignored and must NOT be
// committed or deployed until we have their permission.
//
// Usage:  npm run extract-wurm                       (looks in ~/wurm/packs/graphics.jar)
//         npm run extract-wurm -- "D:/Games/wurm"    (your Wurm folder, or the .jar itself)
// ==============================================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(AQUI, '..', 'public', 'wurm');

// Models used by src/placeables (file name in the jar -> output name), plus textures to copy as-is
const MODELOS = {
  'trees/birchTree.wom': 'birchTree',
  'trees/oakTree.wom': 'oakTree',
  'structures/Towers/freedomTower.wom': 'freedomTower',
  'npc/guards/towerGuard_freedom_male_01.wom': 'towerGuard',
  'structures/Pillar/Pillar.wom': 'Pillar',
};
const TEXTURAS = [
  'trees/birchtex.dds', 'trees/oaktex.dds', 'trees/acorn.dds',
  'structures/Towers/FreedomTower_D.dds', 'structures/Towers/towerdetail.dds',
  'npc/guards/Tower_guard_Default_Male_1024_Fr.dds',
  'structures/Pillar/pillar.dds',
];

// ---------- Find graphics.jar ----------
function acharJar(arg) {
  const candidatos = arg
    ? [arg, path.join(arg, 'graphics.jar'), path.join(arg, 'packs', 'graphics.jar')]
    : [path.join(os.homedir(), 'wurm', 'packs', 'graphics.jar')];
  const achado = candidatos.find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!achado) {
    console.error(`graphics.jar not found. Tried:\n  ${candidatos.join('\n  ')}\nPass your Wurm folder: npm run extract-wurm -- "C:/path/to/wurm"`);
    process.exit(1);
  }
  return achado;
}

// ---------- Minimal zip reader (central directory + deflate), reads only what it needs ----------
function abrirZip(arquivo) {
  const fd = fs.openSync(arquivo, 'r');
  const tamanho = fs.fstatSync(fd).size;
  const lerEm = (pos, n) => { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, pos); return b; };

  // End of central directory: last 22 bytes + up to 64 KB of comment
  const cauda = lerEm(Math.max(0, tamanho - 65558), Math.min(tamanho, 65558));
  const eocd = cauda.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('Not a zip/jar file');
  const total = cauda.readUInt16LE(eocd + 10);
  const tamCD = cauda.readUInt32LE(eocd + 12);
  const posCD = cauda.readUInt32LE(eocd + 16);
  const cd = lerEm(posCD, tamCD);

  const entradas = new Map();
  for (let o = 0, i = 0; i < total; i++) {
    if (cd.readUInt32LE(o) !== 0x02014b50) throw new Error('Bad central directory');
    const metodo = cd.readUInt16LE(o + 10);
    const comprimido = cd.readUInt32LE(o + 20);
    const nNome = cd.readUInt16LE(o + 28), nExtra = cd.readUInt16LE(o + 30), nComent = cd.readUInt16LE(o + 32);
    const posLocal = cd.readUInt32LE(o + 42);
    const nome = cd.toString('utf8', o + 46, o + 46 + nNome);
    entradas.set(nome.toLowerCase(), { nome, metodo, comprimido, posLocal });
    o += 46 + nNome + nExtra + nComent;
  }

  return {
    ler(nome) {
      const e = entradas.get(nome.toLowerCase());
      if (!e) throw new Error(`Missing in jar: ${nome}`);
      const local = lerEm(e.posLocal, 30);
      const inicio = e.posLocal + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
      const dados = lerEm(inicio, e.comprimido);
      if (e.metodo === 0) return dados;
      if (e.metodo === 8) return zlib.inflateRawSync(dados);
      throw new Error(`Unsupported compression ${e.metodo} for ${nome}`);
    },
    fechar() { fs.closeSync(fd); },
  };
}

// ---------- Wurm .wom model -> JSON for Three.js ----------
// Layout (little-endian): int meshCount; per mesh: byte hasTangents, byte hasBinormals, byte hasVertexColor,
// string name, int vertexCount, vertices (pos3, normal3, uv2 [+color3][+tangent3][+binormal3]),
// int indexCount, ushort indices, int materialCount, materials (string texture, string name, byte hasProps
// [byte+float4 emissive, byte+float shininess, byte+float4 specular, byte+float4 transparency]).
// Skeleton/animation data after the meshes is ignored (characters stay in their rig pose).
function womParaJson(b) {
  let o = 0;
  const i32 = () => { const v = b.readInt32LE(o); o += 4; return v; };
  const u8 = () => b[o++];
  const f32 = () => { const v = b.readFloatLE(o); o += 4; return v; };
  const u16 = () => { const v = b.readUInt16LE(o); o += 2; return v; };
  const str = () => { const n = i32(); if (n < 0 || n > 512) throw new Error(`bad string at ${o - 4}`); const s = b.toString('latin1', o, o + n); o += n; return s; };
  const r = (n) => Math.round(n * 1e5) / 1e5; // smaller JSON

  const meshes = [];
  const nMesh = i32();
  for (let m = 0; m < nMesh; m++) {
    const hasTan = u8(), hasBin = u8(), hasCol = u8();
    const name = str();
    const nv = i32();
    const pos = [], nor = [], uv = [];
    for (let v = 0; v < nv; v++) {
      pos.push(r(f32()), r(f32()), r(f32()));
      nor.push(r(f32()), r(f32()), r(f32()));
      uv.push(r(f32()), r(f32()));
      if (hasCol) o += 12;
      if (hasTan) o += 12;
      if (hasBin) o += 12;
    }
    const idx = [];
    const ni = i32();
    for (let k = 0; k < ni; k++) idx.push(u16());
    const materials = [];
    const nMat = i32();
    for (let k = 0; k < nMat; k++) {
      const texture = str(), matName = str();
      if (u8()) {
        if (u8()) o += 16;
        if (u8()) o += 4;
        if (u8()) o += 16;
        if (u8()) o += 16;
      }
      materials.push({ texture, matName });
    }
    // Drawn meshes only: skip far-distance LOD copies and invisible bounding/picking boxes
    if (!/lod\d|boundingBox|pickingBox/i.test(name)) meshes.push({ name, pos, nor, uv, idx, materials });
  }
  return { meshes };
}

// ---------- Run ----------
const jar = acharJar(process.argv[2]);
console.log(`Reading ${jar}`);
const zip = abrirZip(jar);
fs.mkdirSync(DESTINO, { recursive: true });
try {
  for (const [origem, nome] of Object.entries(MODELOS)) {
    const json = womParaJson(zip.ler(origem));
    fs.writeFileSync(path.join(DESTINO, `${nome}.json`), JSON.stringify(json));
    console.log(`  model    ${nome}.json  (${json.meshes.map(m => `${m.name}: ${m.pos.length / 3} verts`).join(', ')})`);
  }
  for (const origem of TEXTURAS) {
    fs.writeFileSync(path.join(DESTINO, path.basename(origem)), zip.ler(origem));
    console.log(`  texture  ${path.basename(origem)}`);
  }
  fs.writeFileSync(path.join(DESTINO, 'manifest.json'), JSON.stringify({
    source: 'Wurm Online client (local copy, do not publish)',
    models: Object.values(MODELOS),
    extractedAt: new Date().toISOString(),
  }, null, 2));
} finally {
  zip.fechar();
}
console.log(`Done: ${DESTINO}\nThese files are git-ignored. Do not commit or deploy them.`);
