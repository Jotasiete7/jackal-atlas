// ==============================================================================
// JACKAL SANDBOX — PLACEABLES: Wurm models placed on the terrain
// Pick a model, click the terrain to place it; click an object to select it, drag to move,
// R / Shift+R to rotate, Delete to remove. Objects follow the terrain height as it is sculpted.
// Saved in this browser (localStorage) for now; shared sync through Supabase can come later.
// ==============================================================================
import * as THREE from 'three';
import { CONFIG, worldMetersToTile } from '../config';
import { HeightfieldManager } from '../core/heightfield';
import { SceneManager } from '../renderer/scene';
import { carregarModelo, TREE_SCALE, wurmDisponivel } from '../wurm/models';
import { i18n } from '../i18n';

type Catalogo = { id: string; emoji: string; pt: string; en: string; file: string; scale: number; texture?: string };
export const CATALOGO: Catalogo[] = [
  { id: 'birch', emoji: '🌳', pt: 'Bétula', en: 'Birch', file: 'birchTree', scale: TREE_SCALE },
  { id: 'oak', emoji: '🌳', pt: 'Carvalho', en: 'Oak', file: 'oakTree', scale: TREE_SCALE },
  { id: 'tower', emoji: '🏰', pt: 'Torre de guarda', en: 'Guard tower', file: 'freedomTower', scale: 1 },
  { id: 'guard', emoji: '💂', pt: 'Guarda da torre', en: 'Tower guard', file: 'towerGuard', scale: 1, texture: 'Tower_guard_Default_Male_1024_Fr.dds' },
  { id: 'pillar', emoji: '🏛️', pt: 'Pilar', en: 'Pillar', file: 'Pillar', scale: 1 },
];

type Item = { id: string; model: string; tileX: number; tileY: number; rot: number; scale: number };
const CHAVE = 'jackal_sandbox_placeables_v1';
const txt = (pt: string, en: string) => (i18n.getLang() === 'en' ? en : pt);

export class PlaceablesManager {
  private grupo = new THREE.Group();
  private itens: Item[] = [];
  private objetos = new Map<string, THREE.Object3D>();
  private modelos = new Map<string, Promise<THREE.Group>>();
  private selecionado: string | null = null;
  private caixa: THREE.BoxHelper | null = null;
  private escolhido: string | null = 'birch'; // model the next click places
  private arrastando = false;
  private painel: HTMLElement;
  private raycaster = new THREE.Raycaster();
  public ativo = false;

  constructor(private scene: SceneManager, private heightfield: HeightfieldManager, parent: HTMLElement) {
    this.grupo.name = 'placeables';
    scene.scene.add(this.grupo);
    this.painel = document.createElement('div');
    this.painel.className = 'glass-panel brush-panel placeables-panel';
    this.painel.style.display = 'none';
    parent.appendChild(this.painel);
    i18n.subscribe(() => this.renderPainel());
    this.carregar();
    this.renderPainel();
  }

  // ---------- Tool on/off ----------
  public setAtivo(ativo: boolean): void {
    this.ativo = ativo;
    this.painel.style.display = ativo ? 'flex' : 'none';
    const brush = document.querySelector('.brush-panel:not(.placeables-panel)') as HTMLElement | null;
    if (brush) brush.style.display = ativo ? 'none' : '';
    if (!ativo) this.selecionar(null);
  }

  // ---------- Persistence ----------
  private carregar(): void {
    let salvo: unknown = null;
    try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { salvo = null; }
    if (Array.isArray(salvo)) {
      this.itens = salvo.filter(i => i && CATALOGO.some(c => c.id === i.model)
        && Number.isFinite(i.tileX) && Number.isFinite(i.tileY) && Number.isFinite(i.rot) && Number.isFinite(i.scale));
    }
    // Only draw saved objects when the Wurm assets are present on this machine
    wurmDisponivel().then(ok => {
      if (ok) this.itens.forEach(i => this.criarObjeto(i).catch(e => console.warn('[placeables]', e)));
    });
  }

  private salvar(): void {
    try { localStorage.setItem(CHAVE, JSON.stringify(this.itens)); } catch { /* storage full or blocked */ }
  }

  // ---------- Objects ----------
  private modelo(id: string): Promise<THREE.Group> {
    const c = CATALOGO.find(x => x.id === id)!;
    if (!this.modelos.has(id)) this.modelos.set(id, carregarModelo(c.file, c.texture));
    return this.modelos.get(id)!;
  }

  private async criarObjeto(item: Item): Promise<void> {
    const base = await this.modelo(item.model);
    if (!this.itens.includes(item)) return; // deleted while loading
    const obj = base.clone();
    obj.traverse(o => { o.userData.placeableId = item.id; });
    this.grupo.add(obj);
    this.objetos.set(item.id, obj);
    this.posicionar(item);
  }

  private posicionar(item: Item): void {
    const obj = this.objetos.get(item.id);
    if (!obj) return;
    const y = this.heightfield.getInterpolatedHeightAtTile(item.tileX, item.tileY) * this.scene.getVerticalExaggeration();
    obj.position.set(item.tileX * CONFIG.TILE_METERS, y, -item.tileY * CONFIG.TILE_METERS);
    obj.rotation.y = item.rot;
    obj.scale.setScalar(item.scale);
  }

  /** Called every frame: keeps every object on the terrain surface while it is sculpted. */
  public atualizarAlturas(): void {
    for (const item of this.itens) {
      const obj = this.objetos.get(item.id);
      if (!obj) continue;
      const y = this.heightfield.getInterpolatedHeightAtTile(item.tileX, item.tileY) * this.scene.getVerticalExaggeration();
      if (Math.abs(obj.position.y - y) > 1e-3) obj.position.y = y;
    }
    if (this.caixa) this.caixa.update();
  }

  // ---------- Selection ----------
  private selecionar(id: string | null): void {
    this.selecionado = id;
    if (this.caixa) { this.scene.scene.remove(this.caixa); this.caixa.geometry.dispose(); this.caixa = null; }
    const obj = id ? this.objetos.get(id) : null;
    if (obj) {
      this.caixa = new THREE.BoxHelper(obj, 0xf59e0b);
      this.scene.scene.add(this.caixa);
    }
    this.renderPainel();
  }

  private objetoNoMouse(e: MouseEvent, camera: THREE.Camera, canvas: HTMLCanvasElement): string | null {
    const r = canvas.getBoundingClientRect();
    const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(m, camera);
    const hit = this.raycaster.intersectObjects(this.grupo.children, true)[0];
    return hit ? (hit.object.userData.placeableId as string) || null : null;
  }

  // ---------- Mouse / keyboard (only while the tool is active) ----------
  /** Returns true when the event was handled here. */
  public mouseDown(e: MouseEvent, camera: THREE.Camera, canvas: HTMLCanvasElement, solo: { worldX: number; worldZ: number } | null): boolean {
    if (!this.ativo || e.button !== 0) return false;
    const id = this.objetoNoMouse(e, camera, canvas);
    if (id) {
      this.selecionar(id);
      this.arrastando = true;
      return true;
    }
    if (solo && this.escolhido) {
      const c = CATALOGO.find(x => x.id === this.escolhido)!;
      const t = worldMetersToTileExato(solo.worldX, solo.worldZ);
      const item: Item = {
        id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        model: c.id, tileX: t.tileX, tileY: t.tileY,
        rot: Math.random() * Math.PI * 2,                                // natural variety
        scale: c.scale * (c.scale === TREE_SCALE ? 0.85 + Math.random() * 0.3 : 1),
      };
      this.itens.push(item);
      this.criarObjeto(item).then(() => this.selecionar(item.id)).catch(e => console.warn('[placeables]', e));
      this.salvar();
      return true;
    }
    this.selecionar(null);
    return true;
  }

  public mouseMove(solo: { worldX: number; worldZ: number } | null): boolean {
    if (!this.ativo || !this.arrastando || !this.selecionado || !solo) return false;
    const item = this.itens.find(i => i.id === this.selecionado);
    if (!item) return false;
    const t = worldMetersToTileExato(solo.worldX, solo.worldZ);
    item.tileX = t.tileX;
    item.tileY = t.tileY;
    this.posicionar(item);
    return true;
  }

  public mouseUp(): void {
    if (this.arrastando) { this.arrastando = false; this.salvar(); this.renderPainel(); }
  }

  public keyDown(e: KeyboardEvent): boolean {
    if (!this.ativo || !this.selecionado) return false;
    if (e.key === 'Delete' || e.key === 'Backspace') { this.apagarSelecionado(); return true; }
    if (e.key === 'r' || e.key === 'R') { this.girar(e.shiftKey ? -15 : 15); this.renderPainel(); return true; }
    if (e.key === 'Escape') { this.selecionar(null); return true; }
    return false;
  }

  public girar(graus: number): void {
    const item = this.itens.find(i => i.id === this.selecionado);
    if (!item) return;
    item.rot = (item.rot + (graus * Math.PI) / 180) % (Math.PI * 2);
    this.posicionar(item);
    this.salvar();
  }

  public escalar(fator: number): void {
    const item = this.itens.find(i => i.id === this.selecionado);
    if (!item) return;
    const c = CATALOGO.find(x => x.id === item.model)!;
    item.scale = Math.min(c.scale * 2, Math.max(c.scale * 0.3, item.scale * fator));
    this.posicionar(item);
    this.salvar();
  }

  public apagarSelecionado(): void {
    const id = this.selecionado;
    if (!id) return;
    const obj = this.objetos.get(id);
    if (obj) this.grupo.remove(obj);
    this.objetos.delete(id);
    this.itens = this.itens.filter(i => i.id !== id);
    this.selecionar(null);
    this.salvar();
  }

  // ---------- Panel ----------
  private renderPainel(): void {
    const sel = this.itens.find(i => i.id === this.selecionado);
    const selCat = sel && CATALOGO.find(c => c.id === sel.model);
    this.painel.innerHTML = `
      <div class="panel-header">
        <span>${txt('Objetos', 'Placeables')}</span>
        <span class="badge-tag">${this.itens.length}</span>
      </div>
      <div class="control-row">
        <div class="control-label"><span>${txt('Clique no terreno para colocar', 'Click the terrain to place')}</span></div>
        <div class="preset-pills" style="flex-wrap:wrap;">
          ${CATALOGO.map(c => `<button class="pill-btn ${c.id === this.escolhido ? 'active' : ''}" data-modelo="${c.id}" title="${txt(c.pt, c.en)}">${c.emoji} ${txt(c.pt, c.en)}</button>`).join('')}
        </div>
      </div>
      ${sel && selCat ? `
      <div class="control-row">
        <div class="control-label"><span>${txt('Selecionado', 'Selected')}: <strong>${selCat.emoji} ${txt(selCat.pt, selCat.en)}</strong></span><span>X ${sel.tileX.toFixed(1)} · Y ${sel.tileY.toFixed(1)}</span></div>
        <div class="preset-pills" style="flex-wrap:wrap;">
          <button class="pill-btn" data-acao="girar-">⟲ 15°</button>
          <button class="pill-btn" data-acao="girar+">⟳ 15°</button>
          <button class="pill-btn" data-acao="menor">−</button>
          <button class="pill-btn" data-acao="maior">+</button>
          <button class="pill-btn" data-acao="apagar" style="color:#f87171;">🗑 ${txt('Apagar', 'Delete')}</button>
        </div>
      </div>` : ''}
      <div class="control-label" style="line-height:1.5;"><span>${txt(
        'Clique num objeto para selecionar · arraste para mover · R / Shift+R gira · Del apaga · Esc solta',
        'Click an object to select · drag to move · R / Shift+R rotate · Del delete · Esc deselect')}</span></div>
    `;
    this.painel.querySelectorAll('[data-modelo]').forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-modelo');
      this.escolhido = this.escolhido === id ? null : id; // click again to stop placing
      this.renderPainel();
    }));
    this.painel.querySelectorAll('[data-acao]').forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-acao');
      if (a === 'girar-') this.girar(-15);
      else if (a === 'girar+') this.girar(15);
      else if (a === 'menor') this.escalar(1 / 1.15);
      else if (a === 'maior') this.escalar(1.15);
      else if (a === 'apagar') this.apagarSelecionado();
      this.renderPainel();
    }));
  }
}

// Fractional tiles, so objects can sit anywhere, not only on tile centres
function worldMetersToTileExato(worldX: number, worldZ: number): { tileX: number; tileY: number } {
  const r = worldMetersToTile(worldX, worldZ);
  return { tileX: Number.isFinite(worldX) ? worldX / CONFIG.TILE_METERS : r.tileX, tileY: Number.isFinite(worldZ) ? -worldZ / CONFIG.TILE_METERS : r.tileY };
}
