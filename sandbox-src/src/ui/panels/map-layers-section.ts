// ==============================================================================
// JACKAL SANDBOX — SEÇÃO DE CAMADAS VISUAIS E ESCALA WURM
// ==============================================================================

import { TerrainMeshManager } from '../../renderer/terrain-mesh';
import { GridMeshManager } from '../../renderer/grid-mesh';
import { PinMeshManager } from '../../renderer/pin-mesh';
import { ContourRenderer } from '../../renderer/contour-renderer';
import { ScaleReferenceManager, ScaleReferenceMode } from '../../renderer/scale-reference';
import { t } from '../../i18n';

export class MapLayersSectionUI {
  private container: HTMLElement;
  private terrainMesh: TerrainMeshManager;
  private gridMesh: GridMeshManager;
  private pinMesh: PinMeshManager;
  private contourRenderer: ContourRenderer;
  private scaleReference: ScaleReferenceManager;

  private showGrid = true;
  private showContours = true;
  private contourInterval = 5;
  private showHillshade = true;
  private showConfidence = false;
  private showPins = true;
  private showStationRange = true;
  private showWireframe = false;

  constructor(
    parent: HTMLElement,
    deps: {
      terrainMesh: TerrainMeshManager;
      gridMesh: GridMeshManager;
      pinMesh: PinMeshManager;
      contourRenderer: ContourRenderer;
      scaleReference: ScaleReferenceManager;
    }
  ) {
    this.terrainMesh = deps.terrainMesh;
    this.gridMesh = deps.gridMesh;
    this.pinMesh = deps.pinMesh;
    this.contourRenderer = deps.contourRenderer;
    this.scaleReference = deps.scaleReference;

    this.container = document.createElement('div');
    parent.appendChild(this.container);

    this.render();
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="panel-header">
        <span>${t('panel_layers')}</span>
        <span class="badge-tag">${t('badge_visual')}</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label class="layer-toggle-row">
          <span>${t('layer_grid')}</span>
          <input type="checkbox" id="chk-grid" ${this.showGrid ? 'checked' : ''} />
        </label>
        <label class="layer-toggle-row" title="Pressione [C] para ligar/desligar cotas">
          <span>${t('layer_contours')}</span>
          <input type="checkbox" id="chk-contours" ${this.showContours ? 'checked' : ''} />
        </label>
        <div style="display: flex; align-items: center; justify-content: space-between; padding-left: 12px; margin-bottom: 4px;">
          <span style="font-size: 11px; color: var(--text-muted);">${t('contour_interval')}</span>
          <select id="sel-contour-interval" class="form-control" style="padding: 2px 6px; font-size: 11px; width: 85px;">
            <option value="5" ${this.contourInterval === 5 ? 'selected' : ''}>5 ${t('meters')}</option>
            <option value="10" ${this.contourInterval === 10 ? 'selected' : ''}>10 ${t('meters')}</option>
            <option value="25" ${this.contourInterval === 25 ? 'selected' : ''}>25 ${t('meters')}</option>
          </select>
        </div>
        <label class="layer-toggle-row">
          <span>${t('layer_hillshade')}</span>
          <input type="checkbox" id="chk-hillshade" ${this.showHillshade ? 'checked' : ''} />
        </label>
        <label class="layer-toggle-row">
          <span>${t('layer_confidence')}</span>
          <input type="checkbox" id="chk-confidence" ${this.showConfidence ? 'checked' : ''} />
        </label>
        <label class="layer-toggle-row">
          <span>${t('layer_pins')}</span>
          <input type="checkbox" id="chk-pins" ${this.showPins ? 'checked' : ''} />
        </label>
        <label class="layer-toggle-row">
          <span>${t('layer_station_range')}</span>
          <input type="checkbox" id="chk-station-range" ${this.showStationRange ? 'checked' : ''} />
        </label>
        <label class="layer-toggle-row">
          <span>${t('layer_wireframe')}</span>
          <input type="checkbox" id="chk-wireframe" ${this.showWireframe ? 'checked' : ''} />
        </label>

        <!-- Referência de Escala Wurm -->
        <div style="display: flex; flex-direction: column; gap: 4px; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;">
          <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>${t('scale_title')}</span>
            <span class="badge-tag" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">${t('scale_tile_badge')}</span>
          </div>
          <div class="btn-group" style="width: 100%;">
            <button class="btn" id="btn-scale-human" style="flex: 1; justify-content: center; font-size: 10px; padding: 4px 2px;" title="${t('scale_human')}">
              ${t('scale_human')}
            </button>
            <button class="btn" id="btn-scale-tower" style="flex: 1; justify-content: center; font-size: 10px; padding: 4px 2px;" title="${t('scale_tower')}">
              ${t('scale_tower')}
            </button>
            <button class="btn" id="btn-scale-none" style="flex: 0.8; justify-content: center; font-size: 10px; padding: 4px 2px;" title="${t('scale_hide')}">
              ${t('scale_hide')}
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateScaleButtons(this.scaleReference.currentMode);
  }

  public toggleContours(): boolean {
    const chk = this.container.querySelector('#chk-contours') as HTMLInputElement;
    if (chk) {
      chk.checked = !chk.checked;
      this.contourRenderer.setVisible(chk.checked);
      this.terrainMesh.setContoursVisible(chk.checked);
      return chk.checked;
    }
    return false;
  }

  public cycleScale(): ScaleReferenceMode {
    const newMode = this.scaleReference.cycleMode();
    this.updateScaleButtons(newMode);
    return newMode;
  }

  public updateScaleButtons(mode: ScaleReferenceMode): void {
    const btnHuman = this.container.querySelector('#btn-scale-human');
    const btnTower = this.container.querySelector('#btn-scale-tower');
    const btnNone = this.container.querySelector('#btn-scale-none');

    btnHuman?.classList.toggle('active', mode === 'human');
    btnTower?.classList.toggle('active', mode === 'tower');
    btnNone?.classList.toggle('active', mode === 'none');
  }

  private bindEvents(): void {
    const chkGrid = this.container.querySelector('#chk-grid') as HTMLInputElement;
    chkGrid?.addEventListener('change', () => {
      this.showGrid = chkGrid.checked;
      this.gridMesh.setVisible(chkGrid.checked);
      this.terrainMesh.setGridVisible(chkGrid.checked);
    });

    const chkContours = this.container.querySelector('#chk-contours') as HTMLInputElement;
    chkContours?.addEventListener('change', () => {
      this.showContours = chkContours.checked;
      this.contourRenderer.setVisible(chkContours.checked);
      this.terrainMesh.setContoursVisible(chkContours.checked);
    });

    const selInterval = this.container.querySelector('#sel-contour-interval') as HTMLSelectElement;
    selInterval?.addEventListener('change', () => {
      this.contourInterval = parseInt(selInterval.value, 10);
      this.contourRenderer.setInterval(this.contourInterval);
      this.terrainMesh.setContourInterval(this.contourInterval);
    });

    const chkHillshade = this.container.querySelector('#chk-hillshade') as HTMLInputElement;
    chkHillshade?.addEventListener('change', () => {
      this.showHillshade = chkHillshade.checked;
      this.terrainMesh.setHillshadeVisible(chkHillshade.checked);
    });

    const chkConfidence = this.container.querySelector('#chk-confidence') as HTMLInputElement;
    chkConfidence?.addEventListener('change', () => {
      this.showConfidence = chkConfidence.checked;
      this.terrainMesh.setConfidenceMode(chkConfidence.checked);
    });

    const chkPins = this.container.querySelector('#chk-pins') as HTMLInputElement;
    chkPins?.addEventListener('change', () => {
      this.showPins = chkPins.checked;
      this.pinMesh.setVisible(chkPins.checked);
    });

    const chkRange = this.container.querySelector('#chk-station-range') as HTMLInputElement;
    chkRange?.addEventListener('change', () => {
      this.showStationRange = chkRange.checked;
      this.gridMesh.setStationRangeVisible(chkRange.checked);
    });

    const chkWire = this.container.querySelector('#chk-wireframe') as HTMLInputElement;
    chkWire?.addEventListener('change', () => {
      this.showWireframe = chkWire.checked;
      this.terrainMesh.setWireframe(chkWire.checked);
    });

    const btnScaleHuman = this.container.querySelector('#btn-scale-human');
    const btnScaleTower = this.container.querySelector('#btn-scale-tower');
    const btnScaleNone = this.container.querySelector('#btn-scale-none');

    btnScaleHuman?.addEventListener('click', () => {
      this.scaleReference.setMode('human');
      this.updateScaleButtons('human');
    });
    btnScaleTower?.addEventListener('click', () => {
      this.scaleReference.setMode('tower');
      this.updateScaleButtons('tower');
    });
    btnScaleNone?.addEventListener('click', () => {
      this.scaleReference.setMode('none');
      this.updateScaleButtons('none');
    });
  }
}
