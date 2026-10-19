// ==============================================================================
// JACKAL SANDBOX — LEGENDA DE CONFIANÇA (PERMANENTE E INVIOLÁVEL)
// ==============================================================================

import { i18n, t } from '../i18n';

export class ConfidenceLegendUI {
  private container: HTMLElement;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'glass-panel confidence-legend-box';
    parent.appendChild(this.container);

    this.render();

    i18n.subscribe(() => {
      this.render();
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="legend-title">${t('legend_title')}</div>

      <div class="legend-item" title="${t('conf_locked')}">
        <span class="color-dot" style="background: #10b981; border: 1px solid #fbbf24;"></span>
        <span>${t('conf_locked')}</span>
      </div>

      <div class="legend-item" title="${t('conf_measured')}">
        <span class="color-dot" style="background: #22c55e;"></span>
        <span>${t('conf_measured')}</span>
      </div>

      <div class="legend-item" title="${t('conf_estimated')}">
        <span class="color-dot" style="background: #eab308;"></span>
        <span>${t('conf_estimated')}</span>
      </div>

      <div class="legend-item" title="${t('conf_speculative')}">
        <span class="color-dot" style="background: #f97316;"></span>
        <span>${t('conf_speculative')}</span>
      </div>

      <div class="legend-item" title="${t('conf_water')}">
        <span class="color-dot" style="background: #1e5ba3;"></span>
        <span>${t('conf_water')}</span>
      </div>

      <div class="legend-item" title="${t('conf_unknown')}">
        <span class="color-dot" style="background: #181a1f; border: 1px solid #475569;"></span>
        <span>${t('conf_unknown')}</span>
      </div>
    `;
  }
}
