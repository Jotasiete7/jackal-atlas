// ==============================================================================
// JACKAL SANDBOX — PAINEL FLUTUANTE DE PROPRIEDADES DO PINCEL
// ==============================================================================

import { CONFIG } from '../config';
import { BrushFalloff, BrushShape, ModelingTool } from '../core/types';
import { i18n, t } from '../i18n';
import { tr } from '../i18n';

export interface BrushSettings {
  sizeTiles: number; // Diâmetro em tiles
  intensity: number; // Metros por passada
  falloff: BrushFalloff;
  shape: BrushShape;
  ellipseRatio: number; // 1.2 a 4.0
  ellipseAngleDeg: number; // 0 a 180 graus
  flattenTargetZ: number;
}

export class BrushPanelUI {
  private container: HTMLElement;
  public settings: BrushSettings = {
    sizeTiles: 20,
    intensity: 1.2,
    falloff: 'smooth',
    shape: 'circle',
    ellipseRatio: 2.0,
    ellipseAngleDeg: 0,
    flattenTargetZ: 2.0,
  };
  private protectWater = true;

  private onChangeCallback: (settings: BrushSettings) => void;
  private currentTool: ModelingTool = 'raise';

  constructor(parent: HTMLElement, onChange: (settings: BrushSettings) => void) {
    this.onChangeCallback = onChange;
    this.container = document.createElement('div');
    this.container.className = 'glass-panel brush-panel';
    parent.appendChild(this.container);

    this.render();

    i18n.subscribe(() => {
      this.render();
    });
  }

  public isProtectWaterEnabled(): boolean {
    return this.protectWater;
  }

  public setToolMode(tool: ModelingTool): void {
    this.currentTool = tool;
    const isSculptTool = ['raise', 'lower', 'smooth', 'flatten', 'ramp', 'noise', 'water', 'eraser', 'lock'].includes(tool);
    this.container.style.display = isSculptTool ? 'flex' : 'none';
    const flattenRow = this.container.querySelector('#row-flatten') as HTMLElement;
    if (flattenRow) {
      flattenRow.style.display = tool === 'flatten' ? 'flex' : 'none';
    }
  }

  public setSize(sizeTiles: number): void {
    this.settings.sizeTiles = sizeTiles;
    this.updateControls();
    this.onChangeCallback(this.settings);
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="panel-header">
        <span>${t('brush_properties')}</span>
        <span class="badge-tag" id="brush-size-display">${this.settings.sizeTiles} tiles</span>
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>${t('brush_diameter_presets')}</span>
        </div>
        <div class="preset-pills">
          ${CONFIG.BRUSH_PRESETS.map(
            (sz) => `
            <button class="pill-btn ${sz === this.settings.sizeTiles ? 'active' : ''}" data-size="${sz}">
              ${sz}
            </button>
          `
          ).join('')}
        </div>
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>${t('brush_continuous_size')}</span>
          <span id="brush-meters-display">${this.settings.sizeTiles * CONFIG.TILE_METERS}m</span>
        </div>
        <input type="range" id="input-brush-size" min="1" max="150" value="${this.settings.sizeTiles}" />
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>${t('brush_intensity')}</span>
          <span id="brush-intensity-display">${this.settings.intensity}m</span>
        </div>
        <input type="range" id="input-brush-intensity" min="0.2" max="10" step="0.2" value="${this.settings.intensity}" />
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>${t('brush_falloff')}</span>
        </div>
        <div class="btn-group" style="display: flex; flex-wrap: wrap; gap: 3px;">
          <button class="btn ${this.settings.falloff === 'smooth' ? 'active' : ''}" data-falloff="smooth" title="${t('falloff_smooth_tip')}">
            🔘 ${t('falloff_smooth')}
          </button>
          <button class="btn ${this.settings.falloff === 'dome' ? 'active' : ''}" data-falloff="dome" title="${t('falloff_dome_tip')}">
            🫧 ${t('falloff_dome')}
          </button>
          <button class="btn ${this.settings.falloff === 'bowl' ? 'active' : ''}" data-falloff="bowl" title="${t('falloff_bowl_tip')}">
            🥣 ${t('falloff_bowl')}
          </button>
          <button class="btn ${this.settings.falloff === 'peak' ? 'active' : ''}" data-falloff="peak" title="${t('falloff_peak_tip')}">
            ⛰️ ${t('falloff_peak')}
          </button>
          <button class="btn ${this.settings.falloff === 'hard' ? 'active' : ''}" data-falloff="hard" title="${t('falloff_hard_tip')}">
            ⬛ ${t('falloff_hard')}
          </button>
        </div>
      </div>

      <div class="control-row">
        <div class="control-label">
          <span>${t('brush_geometry')}</span>
        </div>
        <div class="btn-group">
          <button class="btn ${this.settings.shape === 'circle' ? 'active' : ''}" data-shape="circle">
            ⭕ ${t('shape_circle')}
          </button>
          <button class="btn ${this.settings.shape === 'ellipse' ? 'active' : ''}" data-shape="ellipse">
            ⬭ ${t('shape_ellipse')}
          </button>
        </div>
      </div>

      <div class="control-row" id="row-ellipse" style="display: ${this.settings.shape === 'ellipse' ? 'flex' : 'none'}; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.25); padding: 6px; border-radius: 6px; border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-muted);">
          <span>${t('ellipse_ratio')}</span>
          <span id="ellipse-ratio-display" style="color: var(--accent-gold); font-weight: 700;">${this.settings.ellipseRatio.toFixed(1)}×</span>
        </div>
        <input type="range" id="input-ellipse-ratio" min="1.2" max="4.0" step="0.2" value="${this.settings.ellipseRatio}" />
        <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
          <span>${t('ellipse_angle')}</span>
          <span id="ellipse-angle-display" style="color: var(--accent-gold); font-weight: 700;">${this.settings.ellipseAngleDeg}°</span>
        </div>
        <input type="range" id="input-ellipse-angle" min="0" max="180" step="5" value="${this.settings.ellipseAngleDeg}" />
      </div>

      <div class="control-row" id="row-flatten" style="display: ${this.currentTool === 'flatten' ? 'flex' : 'none'};">
        <div class="control-label">
          <span>${t('target_elevation')}</span>
          <span id="flatten-display">${this.settings.flattenTargetZ}m</span>
        </div>
        <div class="preset-pills" style="margin-bottom: 4px;">
          <button class="pill-btn ${this.settings.flattenTargetZ === 0 ? 'active' : ''}" data-flatten-preset="0">0m (${tr('Praia', 'Beach')})</button>
          <button class="pill-btn ${this.settings.flattenTargetZ === 2 ? 'active' : ''}" data-flatten-preset="2">2m (${tr('Planície', 'Plain')} 🌿)</button>
          <button class="pill-btn ${this.settings.flattenTargetZ === 15 ? 'active' : ''}" data-flatten-preset="15">15m (${tr('Colina', 'Hill')})</button>
          <button class="pill-btn ${this.settings.flattenTargetZ === 30 ? 'active' : ''}" data-flatten-preset="30">30m (${tr('Platô', 'Plateau')})</button>
        </div>
        <input type="range" id="input-flatten-target" min="0" max="150" step="1" value="${this.settings.flattenTargetZ}" />
      </div>

      <div class="control-row" style="margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--border-color);">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #93c5fd; cursor: pointer;">
          <input type="checkbox" id="check-protect-water" ${this.protectWater ? 'checked' : ''} style="accent-color: #3b82f6;" />
          <span>${t('brush_protect_water')}</span>
        </label>
      </div>
    `;

    this.bindEvents();
  }

  private updateControls(): void {
    const elSizeDisplay = this.container.querySelector('#brush-size-display');
    const elMetersDisplay = this.container.querySelector('#brush-meters-display');
    const inputSize = this.container.querySelector('#input-brush-size') as HTMLInputElement;

    if (elSizeDisplay) elSizeDisplay.textContent = `${this.settings.sizeTiles} tiles`;
    if (elMetersDisplay) elMetersDisplay.textContent = `${this.settings.sizeTiles * CONFIG.TILE_METERS}m`;
    if (inputSize) inputSize.value = this.settings.sizeTiles.toString();

    this.container.querySelectorAll('.pill-btn').forEach((btn) => {
      const sz = parseInt(btn.getAttribute('data-size') || '0', 10);
      btn.classList.toggle('active', sz === this.settings.sizeTiles);
    });
  }

  private bindEvents(): void {
    this.container.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = parseInt(btn.getAttribute('data-size') || '20', 10);
        this.setSize(size);
      });
    });

    const inputSize = this.container.querySelector('#input-brush-size') as HTMLInputElement;
    inputSize?.addEventListener('input', () => {
      this.setSize(parseInt(inputSize.value, 10));
    });

    const inputIntensity = this.container.querySelector('#input-brush-intensity') as HTMLInputElement;
    const elIntensityDisplay = this.container.querySelector('#brush-intensity-display');
    inputIntensity?.addEventListener('input', () => {
      this.settings.intensity = parseFloat(inputIntensity.value);
      if (elIntensityDisplay) elIntensityDisplay.textContent = `${this.settings.intensity}m`;
      this.onChangeCallback(this.settings);
    });

    this.container.querySelectorAll('button[data-falloff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const falloff = btn.getAttribute('data-falloff') as BrushFalloff;
        this.settings.falloff = falloff;
        this.container.querySelectorAll('button[data-falloff]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.onChangeCallback(this.settings);
      });
    });

    const rowEllipse = this.container.querySelector('#row-ellipse') as HTMLElement;
    this.container.querySelectorAll('button[data-shape]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const shape = btn.getAttribute('data-shape') as BrushShape;
        this.settings.shape = shape;
        this.container.querySelectorAll('button[data-shape]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (rowEllipse) {
          rowEllipse.style.display = shape === 'ellipse' ? 'flex' : 'none';
        }
        this.onChangeCallback(this.settings);
      });
    });

    const inputRatio = this.container.querySelector('#input-ellipse-ratio') as HTMLInputElement;
    const elRatioDisplay = this.container.querySelector('#ellipse-ratio-display');
    inputRatio?.addEventListener('input', () => {
      this.settings.ellipseRatio = parseFloat(inputRatio.value);
      if (elRatioDisplay) elRatioDisplay.textContent = `${this.settings.ellipseRatio.toFixed(1)}×`;
      this.onChangeCallback(this.settings);
    });

    const inputAngle = this.container.querySelector('#input-ellipse-angle') as HTMLInputElement;
    const elAngleDisplay = this.container.querySelector('#ellipse-angle-display');
    inputAngle?.addEventListener('input', () => {
      this.settings.ellipseAngleDeg = parseInt(inputAngle.value, 10);
      if (elAngleDisplay) elAngleDisplay.textContent = `${this.settings.ellipseAngleDeg}°`;
      this.onChangeCallback(this.settings);
    });

    const inputFlatten = this.container.querySelector('#input-flatten-target') as HTMLInputElement;
    const elFlattenDisplay = this.container.querySelector('#flatten-display');
    const updateFlattenZ = (val: number) => {
      this.settings.flattenTargetZ = val;
      if (elFlattenDisplay) elFlattenDisplay.textContent = `${this.settings.flattenTargetZ}m`;
      if (inputFlatten) inputFlatten.value = val.toString();
      this.container.querySelectorAll('button[data-flatten-preset]').forEach((b) => {
        const pz = parseFloat(b.getAttribute('data-flatten-preset') || '-1');
        b.classList.toggle('active', pz === val);
      });
      this.onChangeCallback(this.settings);
    };

    inputFlatten?.addEventListener('input', () => {
      updateFlattenZ(parseFloat(inputFlatten.value));
    });

    this.container.querySelectorAll('button[data-flatten-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pz = parseFloat(btn.getAttribute('data-flatten-preset') || '2');
        updateFlattenZ(pz);
      });
    });

    const checkProtectWater = this.container.querySelector('#check-protect-water') as HTMLInputElement;
    checkProtectWater?.addEventListener('change', () => {
      this.protectWater = checkProtectWater.checked;
    });
  }
}
