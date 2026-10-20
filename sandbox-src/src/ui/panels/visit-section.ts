// ==============================================================================
// JACKAL SANDBOX — SEÇÃO DE VISITA E SESSÃO DE CAMPO
// ==============================================================================

import { VisitManager } from '../../core/visits';
import { GridMeshManager } from '../../renderer/grid-mesh';
import { t } from '../../i18n';
import { CRYSTAL_BASES } from '../../config';

export class VisitSectionUI {
  private container: HTMLElement;
  private visitManager: VisitManager;
  private gridMesh: GridMeshManager;

  constructor(parent: HTMLElement, visitManager: VisitManager, gridMesh: GridMeshManager) {
    this.visitManager = visitManager;
    this.gridMesh = gridMesh;

    this.container = document.createElement('div');
    parent.appendChild(this.container);

    this.render();

    this.visitManager.subscribe(() => {
      this.updateDisplay();
    });
  }

  public render(): void {
    const visit = this.visitManager.getCurrentVisit();

    this.container.innerHTML = `
      <div class="tool-divider"></div>

      <div class="panel-header">
        <span>${t('panel_session')}</span>
        <span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">${t('badge_visit')}</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-muted);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${t('visit_author')}</span>
          <input type="text" id="visit-author-input" class="form-control" value="${visit.author}" style="width: 130px; font-size: 11px; padding: 2px 6px;" />
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${t('visit_station')}</span>
          <span id="visit-coords" style="color: #60a5fa; font-weight: bold;">X: ${visit.station_x}, Y: ${visit.station_y}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${t('visit_range')}</span>
          <span style="color: #f59e0b; font-weight: bold;">${visit.range_tiles} tiles</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${t('visit_strokes')}</span>
          <strong id="visit-strokes" style="color: #fff;">${this.visitManager.getStrokeCount()}</strong>
        </div>
        <label style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; font-family: var(--font-sans); cursor: pointer;">
          <span>${t('enforce_station_range')}</span>
          <input type="checkbox" id="chk-enforce-range" checked />
        </label>
        <button class="btn btn-gold" id="btn-new-visit" style="margin-top: 4px; justify-content: center; font-size: 11px;">
          ${t('btn_new_visit')}
        </button>
        <div style="font-size: 10px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-top: 6px;">
          Ancorar Base no Cristal:
        </div>
        <div style="display: flex; gap: 4px; margin-top: 2px;">
          <button class="btn btn-anchor-crystal" data-crystal="north" style="flex: 1; font-size: 10px; justify-content: center; color: #38bdf8; padding: 3px 4px;" title="Ancorar no Cristal Norte (0, 150)">
            💎 Norte
          </button>
          <button class="btn btn-anchor-crystal" data-crystal="west" style="flex: 1; font-size: 10px; justify-content: center; color: #34d399; padding: 3px 4px;" title="Ancorar no Cristal Oeste (-320, -250)">
            💎 Oeste
          </button>
          <button class="btn btn-anchor-crystal" data-crystal="south" style="flex: 1; font-size: 10px; justify-content: center; color: #f87171; padding: 3px 4px;" title="Ancorar no Cristal Sul (60, -180)">
            💎 Sul
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  public updateDisplay(): void {
    const visit = this.visitManager.getCurrentVisit();
    const elAuthor = this.container.querySelector('#visit-author-input') as HTMLInputElement;
    const elCoords = this.container.querySelector('#visit-coords');
    const elStrokes = this.container.querySelector('#visit-strokes');

    if (elAuthor && elAuthor.value !== visit.author) elAuthor.value = visit.author;
    if (elCoords) elCoords.textContent = `X: ${visit.station_x}, Y: ${visit.station_y}`;
    if (elStrokes) elStrokes.textContent = this.visitManager.getStrokeCount().toString();
  }

  private bindEvents(): void {
    const chkEnforce = this.container.querySelector('#chk-enforce-range') as HTMLInputElement;
    chkEnforce?.addEventListener('change', () => this.visitManager.setEnforceRangeLimit(chkEnforce.checked));

    const authorInput = this.container.querySelector('#visit-author-input') as HTMLInputElement;
    authorInput?.addEventListener('change', () => {
      this.visitManager.updateVisitDetails({ author: authorInput.value.trim() || 'Explorador' });
    });

    this.container.querySelector('#btn-new-visit')?.addEventListener('click', () => {
      const current = this.visitManager.getCurrentVisit();
      const newAuthor = prompt(t('alert_new_visit_prompt'), current.author) || current.author;
      const newStation = this.visitManager.startNewVisit(newAuthor, current.station_x, current.station_y);
      this.gridMesh.updateStationRange(newStation);
    });

    this.container.querySelectorAll('.btn-anchor-crystal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const crystalId = btn.getAttribute('data-crystal') as keyof typeof CRYSTAL_BASES;
        const crystal = CRYSTAL_BASES[crystalId];
        if (crystal) {
          this.visitManager.updateStation(crystal.tileX, crystal.tileY);
          const current = this.visitManager.getCurrentVisit();
          this.gridMesh.updateStationRange(current);
        }
      });
    });
  }
}
