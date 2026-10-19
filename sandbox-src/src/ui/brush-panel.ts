// ==============================================================================
// JACKAL SANDBOX — PAINEL FLUTUANTE DE PROPRIEDADES DO PINCEL
// ==============================================================================

import { CONFIG } from '../config';
import { BrushFalloff, ModelingTool } from '../core/types';
import { i18n, t } from '../i18n';

export interface BrushSettings {
  sizeTiles: number; // Diâmetro em tiles
  intensity: number; // Metros por passada
  falloff: BrushFalloff;
  flattenTargetZ: number;
}

export class BrushPanelUI {
  private container: HTMLElement;
  public settings: BrushSettings = {
    sizeTiles: 20,
    intensity: 1.2,
    falloff: 'smooth',
    flattenTargetZ: 15.0,
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
        <div class="btn-group">
          <button class="btn ${this.settings.falloff === 'smooth' ? 'active' : ''}" data-falloff="smooth">
            ${t('falloff_smooth')}
          </button>
          <button class="btn ${this.settings.falloff === 'hard' ? 'active' : ''}" data-falloff="hard">
            ${t('falloff_hard')}
          </button>
        </div>
      </div>

      <div class="control-row" id="row-flatten" style="display: ${this.currentTool === 'flatten' ? 'flex' : 'none'};">
        <div class="control-label">
          <span>${t('target_elevation')}</span>
          <span id="flatten-display">${this.settings.flattenTargetZ}m</span>
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

    const inputFlatten = this.container.querySelector('#input-flatten-target') as HTMLInputElement;
    const elFlattenDisplay = this.container.querySelector('#flatten-display');
    inputFlatten?.addEventListener('input', () => {
      this.settings.flattenTargetZ = parseFloat(inputFlatten.value);
      if (elFlattenDisplay) elFlattenDisplay.textContent = `${this.settings.flattenTargetZ}m`;
      this.onChangeCallback(this.settings);
    });

    const checkProtectWater = this.container.querySelector('#check-protect-water') as HTMLInputElement;
    checkProtectWater?.addEventListener('change', () => {
      this.protectWater = checkProtectWater.checked;
    });
  }
}
