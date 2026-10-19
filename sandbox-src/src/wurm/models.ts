// ==============================================================================
// JACKAL SANDBOX — WURM MODELS (loaded from public/wurm, filled by `npm run extract-wurm`)
// The files come from each user's own Wurm client and are git-ignored: when they are missing
// (e.g. on the public site) the Placeables tool stays hidden and pins keep their simple shapes.
// ==============================================================================
import * as THREE from 'three';
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js';

type WomJson = { meshes: { name: string; pos: number[]; nor: number[]; uv: number[]; idx: number[]; materials: { texture: string }[] }[] };

const BASE = './wurm/';

// .wom units are metres (a fence section is exactly 4 = one tile). Tree models are ~1.3 m and
// the client grows them with age; 8x gives a ~10 m mature tree (estimate, tune by eye in game).
export const TREE_SCALE = 8;

let disponivel: Promise<boolean> | null = null;
/** True when the extracted Wurm assets are present (public/wurm/manifest.json). */
export function wurmDisponivel(): Promise<boolean> {
  if (!disponivel) {
    disponivel = fetch(`${BASE}manifest.json`, { cache: 'no-store' })
      .then(r => r.ok && (r.headers.get('content-type') || '').includes('json'))
      .catch(() => false);
  }
  return disponivel;
}

const dds = new DDSLoader();
const texturas = new Map<string, THREE.Texture>();
function textura(nome: string): THREE.Texture {
  if (!texturas.has(nome)) {
    const t = dds.load(`${BASE}${nome}`);
    t.colorSpace = THREE.SRGBColorSpace;
    texturas.set(nome, t);
  }
  return texturas.get(nome)!;
}

/** Builds a Three.js group from an extracted model. trocarTextura overrides the texture (e.g. Freedom guard skin). */
export async function carregarModelo(nome: string, trocarTextura?: string): Promise<THREE.Group> {
  const resposta = await fetch(`${BASE}${nome}.json`);
  if (!resposta.ok) throw new Error(`Wurm model not found: ${nome} (run npm run extract-wurm)`);
  const data: WomJson = await resposta.json();
  const grupo = new THREE.Group();
  grupo.name = `wurm:${nome}`;
  for (const m of data.meshes) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(m.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uv, 2));
    g.setIndex(m.idx);
    const tex = trocarTextura || (m.materials[0] && m.materials[0].texture);
    const mat = new THREE.MeshLambertMaterial({
      map: tex ? textura(tex) : null,
      color: tex ? 0xffffff : 0x6b8e23,
      side: THREE.DoubleSide,
      alphaTest: 0.5, // leaves and banners use cut-out transparency
    });
    grupo.add(new THREE.Mesh(g, mat));
  }
  return grupo;
}

// The in-game survey pillar, used by the pin renderer for 'pillar' pins once loaded
let pilar: THREE.Group | null = null;
export function modeloPilar(): THREE.Group | null {
  return pilar;
}
export async function carregarPilar(): Promise<boolean> {
  if (!(await wurmDisponivel())) return false;
  try {
    pilar = await carregarModelo('Pillar');
    return true;
  } catch (e) {
    console.warn('[wurm] pillar model unavailable:', e);
    return false;
  }
}
