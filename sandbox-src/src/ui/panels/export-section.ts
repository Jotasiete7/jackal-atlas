// ==============================================================================
// JACKAL SANDBOX — SEÇÃO DE EXPORTAÇÃO CARTOGRÁFICA
// ==============================================================================

import { ContourRenderer } from '../../renderer/contour-renderer';
import { t } from '../../i18n';

export class ExportSectionUI {
  private container: HTMLElement;
  private contourRenderer: ContourRenderer;

  constructor(parent: HTMLElement, contourRenderer: ContourRenderer) {
    this.contourRenderer = contourRenderer;

    this.container = document.createElement('div');
    parent.appendChild(this.container);

    this.render();
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="tool-divider"></div>

      <div class="panel-header">
        <span>${t('panel_export')}</span>
        <span class="badge-tag">${t('badge_files')}</span>
      </div>

      <div style="display: flex; gap: 6px;">
        <button class="btn" id="btn-export-geojson" style="flex: 1; font-size: 11px; justify-content: center;">
          ${t('export_geojson')}
        </button>
        <button class="btn" id="btn-export-svg" style="flex: 1; font-size: 11px; justify-content: center;">
          ${t('export_svg')}
        </button>
        <button class="btn btn-gold" id="btn-export-png" style="flex: 1; font-size: 11px; justify-content: center;">
          ${t('export_png')}
        </button>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector('#btn-export-geojson')?.addEventListener('click', () => {
      this.contourRenderer.exportGeoJSON();
    });
    this.container.querySelector('#btn-export-svg')?.addEventListener('click', () => {
      this.contourRenderer.exportSVG();
    });
    this.container.querySelector('#btn-export-png')?.addEventListener('click', () => {
      this.contourRenderer.exportCartographicPNG();
    });
  }
}
