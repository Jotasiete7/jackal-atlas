// ==============================================================================
// JACKAL SANDBOX — LEGENDA DE CONFIANÇA (PERMANENTE E INVIOLÁVEL)
// ==============================================================================

import { i18n, t, tr } from '../i18n';

export class ConfidenceLegendUI {
  private container: HTMLElement;
  private isCollapsed = localStorage.getItem('jackal_confidence_collapsed') === 'true';

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
    if (this.isCollapsed) {
      this.container.innerHTML = `
        <div class="legend-header" id="legend-header" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; gap:8px;">
          <span class="legend-title" style="margin:0; font-size:10px;">${t('legend_title')}</span>
          <span style="font-size:10px; color:var(--text-dim);">▲</span>
        </div>
      `;
    } else {
      this.container.innerHTML = `
        <div class="legend-header" id="legend-header" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; gap:8px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:4px; margin-bottom:4px;">
          <span class="legend-title" style="margin:0;">${t('legend_title')}</span>
          <span style="font-size:10px; color:var(--text-dim);" title="${tr('Minimizar', 'Minimize')}">▼</span>
        </div>

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

    const header = this.container.querySelector('#legend-header');
    header?.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      localStorage.setItem('jackal_confidence_collapsed', String(this.isCollapsed));
      this.render();
    });
  }
}
