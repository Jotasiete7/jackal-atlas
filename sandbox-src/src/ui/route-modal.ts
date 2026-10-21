// ==============================================================================
// JACKAL SANDBOX — MODAL DE CADASTRO E AFERIÇÃO DE ROTAS (GABARITO)
// Permite salvar estradas, pontes e túneis e cravar a medida real de tiles do jogo
// ==============================================================================

import { i18n } from '../i18n';
import { MapRoute, RouteType, RouteStatus } from '../core/types';
import { tr } from '../i18n';

export class RouteModalUI {
  private backdrop: HTMLElement;
  private onSaveCallback?: (route: MapRoute) => void;
  private onDeleteCallback?: (id: string) => void;

  private currentRoute: MapRoute | null = null;
  private currentPath: Array<[number, number]> = [];
  private currentMeasuredDistance = 0;

  constructor(parent: HTMLElement) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.style.display = 'none';
    parent.appendChild(this.backdrop);

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if (this.backdrop.style.display === 'flex' && e.key === 'Escape') {
        this.close();
      }
    });
  }

  public open(
    path: Array<[number, number]>,
    type: RouteType,
    measuredDistance: number,
    existingRoute?: MapRoute | null
  ): void {
    this.currentPath = path;
    this.currentMeasuredDistance = measuredDistance;
    this.currentRoute = existingRoute || null;

    this.render(type);
    this.backdrop.style.display = 'flex';
  }

  public close(): void {
    this.backdrop.style.display = 'none';
  }

  public setOnSave(cb: (route: MapRoute) => void): void {
    this.onSaveCallback = cb;
  }

  public setOnDelete(cb: (id: string) => void): void {
    this.onDeleteCallback = cb;
  }

  private render(defaultType: RouteType): void {
    const isPt = i18n.getLang() === 'pt';
    const route = this.currentRoute;

    const rType: RouteType = route ? route.type : defaultType;
    const rStatus: RouteStatus = route ? route.status : 'planned';
    const rName = route ? route.name : `${rType === 'road' ? tr('Estrada', 'Road') : rType === 'bridge' ? tr('Ponte', 'Bridge') : tr('Túnel', 'Tunnel')} ${this.currentMeasuredDistance}t`;
    const rWidth = route ? route.widthTiles : 2;
    const rReal = route && route.realLengthTiles ? route.realLengthTiles : '';

    this.backdrop.innerHTML = `
      <div class="glass-panel modal-content" style="max-width: 440px; width: 90%;">
        <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:12px;">
          <strong style="color:var(--accent-gold); font-size:13px; display:flex; align-items:center; gap:6px;">
            <span>${rType === 'road' ? '🛣️' : rType === 'bridge' ? '🌉' : '🚇'}</span>
            <span>${isPt ? 'SALVAR INFRAESTRUTURA / AFERIÇÃO' : 'SAVE INFRASTRUCTURE / CALIBRATION'}</span>
          </strong>
          <button id="btn-modal-close" class="btn" style="padding:2px 8px; font-size:14px; color:var(--text-dim); background:transparent;">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; font-size:12px;">
          <!-- Nome da Rota -->
          <div>
            <label style="color:var(--text-muted); font-size:11px; display:block; margin-bottom:4px;">
              ${isPt ? 'Nome da Obra / Rota:' : 'Project / Route Name:'}
            </label>
            <input type="text" id="route-name" class="form-control" value="${rName}" placeholder="${tr('Ex: Ponte do Vale Norte...', 'e.g. North Valley Bridge...')}" style="width:100%;" />
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <!-- Tipo -->
            <div>
              <label style="color:var(--text-muted); font-size:11px; display:block; margin-bottom:4px;">
                ${isPt ? 'Tipo de Obra:' : 'Structure Type:'}
              </label>
              <select id="route-type" class="form-control" style="width:100%;">
                <option value="road" ${rType === 'road' ? 'selected' : ''}>🛣️ ${isPt ? 'Estrada (Tira no Chão)' : 'Road (Terrain Strip)'}</option>
                <option value="bridge" ${rType === 'bridge' ? 'selected' : ''}>🌉 ${isPt ? 'Ponte (Régua Suspensa)' : 'Bridge (Span Ruler)'}</option>
                <option value="tunnel" ${rType === 'tunnel' ? 'selected' : ''}>🚇 ${isPt ? 'Túnel (Raio-X Subterrâneo)' : 'Tunnel (Subterranean X-Ray)'}</option>
              </select>
            </div>

            <!-- Estado -->
            <div>
              <label style="color:var(--text-muted); font-size:11px; display:block; margin-bottom:4px;">
                ${isPt ? 'Estado da Obra:' : 'Construction Status:'}
              </label>
              <select id="route-status" class="form-control" style="width:100%;">
                <option value="planned" ${rStatus === 'planned' ? 'selected' : ''}>⏳ ${isPt ? 'Planejada / Projeto' : 'Planned / Draft'}</option>
                <option value="built" ${rStatus === 'built' ? 'selected' : ''}>✓ ${isPt ? 'Concluída / Construída' : 'Finished / Built'}</option>
              </select>
            </div>
          </div>

          <!-- Medição e Gabarito -->
          <div style="background:rgba(0,0,0,0.35); border:1px solid var(--border-color); border-radius:6px; padding:10px; margin-top:2px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="color:#94a3b8; font-size:11px;">${isPt ? 'Medida desenhada no relevo atual:' : 'Drawn length in current terrain:'}</span>
              <strong style="color:#38bdf8; font-family:var(--font-mono); font-size:12px;">${this.currentMeasuredDistance} tiles</strong>
            </div>

            <label style="color:var(--accent-gold); font-size:11px; font-weight:700; display:block; margin-bottom:4px;">
              📏 ${isPt ? 'Gabarito Real do Jogo (tiles contados):' : 'True In-Game Calibration (counted tiles):'}
            </label>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" id="route-real-length" class="form-control" value="${rReal}" placeholder="${this.currentMeasuredDistance}" min="2" max="2048" style="width:90px;" />
              <span style="font-size:10.5px; color:#cbd5e1; line-height:1.3;">
                ${isPt
                  ? 'Ex: se a ponte real tem 32 tiles, digite 32 para cravar a régua e corrigir a margem.'
                  : 'E.g., if bridge has 32 tiles in-game, enter 32 to fix the ruler and adjust the shore.'}
              </span>
            </div>
          </div>

          <!-- Largura em tiles -->
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="color:var(--text-muted); font-size:11px;">${isPt ? 'Largura do Traçado (tiles):' : 'Width (tiles):'}</span>
            <select id="route-width" class="form-control" style="width:70px;">
              <option value="1" ${rWidth === 1 ? 'selected' : ''}>1 tile</option>
              <option value="2" ${rWidth === 2 ? 'selected' : ''}>2 tiles</option>
              <option value="3" ${rWidth === 3 ? 'selected' : ''}>3 tiles</option>
            </select>
          </div>
        </div>

        <div class="modal-footer" style="margin-top:14px; border-top:1px solid var(--border-color); padding-top:10px; display:flex; justify-content:space-between;">
          ${route ? `
            <button id="btn-route-delete" class="btn" style="background:rgba(239,68,68,0.15); color:#ef4444; border-color:rgba(239,68,68,0.4); font-size:11px;">
              🗑️ ${isPt ? 'Excluir' : 'Delete'}
            </button>
          ` : '<div></div>'}
          <div style="display:flex; gap:8px;">
            <button id="btn-modal-cancel" class="btn" style="font-size:11px;">${isPt ? 'Cancelar' : 'Cancel'}</button>
            <button id="btn-route-save" class="btn btn-gold" style="font-size:11px; font-weight:700;">✓ ${isPt ? 'Salvar Rota' : 'Save Route'}</button>
          </div>
        </div>
      </div>
    `;

    this.backdrop.querySelector('#btn-modal-close')?.addEventListener('click', () => this.close());
    this.backdrop.querySelector('#btn-modal-cancel')?.addEventListener('click', () => this.close());

    this.backdrop.querySelector('#btn-route-delete')?.addEventListener('click', () => {
      if (this.currentRoute && this.onDeleteCallback) {
        this.onDeleteCallback(this.currentRoute.id);
        this.close();
      }
    });

    this.backdrop.querySelector('#btn-route-save')?.addEventListener('click', () => {
      const nameInput = this.backdrop.querySelector('#route-name') as HTMLInputElement;
      const typeSelect = this.backdrop.querySelector('#route-type') as HTMLSelectElement;
      const statusSelect = this.backdrop.querySelector('#route-status') as HTMLSelectElement;
      const widthSelect = this.backdrop.querySelector('#route-width') as HTMLSelectElement;
      const realLenInput = this.backdrop.querySelector('#route-real-length') as HTMLInputElement;

      const realTiles = realLenInput?.value ? parseInt(realLenInput.value, 10) : null;
      let finalPath = this.currentPath;

      // Se forçou uma medida real e tem ao menos 2 nós, reajusta a ponta final na mesma direção
      if (realTiles && realTiles > 0 && finalPath.length >= 2) {
        const p1 = finalPath[finalPath.length - 2];
        const p2 = finalPath[finalPath.length - 1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const angle = Math.atan2(dy, dx);
        const adjustedX = Math.round(p1[0] + realTiles * Math.cos(angle));
        const adjustedY = Math.round(p1[1] + realTiles * Math.sin(angle));
        finalPath = [...finalPath.slice(0, finalPath.length - 1), [adjustedX, adjustedY]];
      }

      const savedRoute: MapRoute = {
        id: this.currentRoute ? this.currentRoute.id : `route-${Date.now()}`,
        name: nameInput?.value.trim() || tr('Rota', 'Route'),
        type: (typeSelect?.value as RouteType) || 'road',
        status: (statusSelect?.value as RouteStatus) || 'planned',
        path: finalPath,
        widthTiles: parseInt(widthSelect?.value || '2', 10),
        realLengthTiles: realTiles,
        created_at: this.currentRoute ? this.currentRoute.created_at : new Date().toISOString(),
      };

      if (this.onSaveCallback) {
        this.onSaveCallback(savedRoute);
      }
      this.close();
    });
  }
}
