// ==============================================================================
// JACKAL SANDBOX — MINI BÚSSOLA FLUTUANTE 3D
// Minimalista, flutuante no canto inferior direito, ponta vermelha para o Norte
// Gira em tempo real sincronizada com a órbita e permite clicar para alinhar ao Norte
// ==============================================================================

import { CameraController } from '../renderer/camera';
import { i18n, t } from '../i18n';

export class CompassUI {
  private container: HTMLElement;
  private needleEl!: HTMLElement;
  private cameraController: CameraController;
  private lastAngleDeg = -999;

  constructor(parent: HTMLElement, cameraController: CameraController) {
    this.cameraController = cameraController;

    this.container = document.createElement('div');
    this.container.className = 'jk-mini-compass';
    this.updateTitle();
    i18n.subscribe(() => this.updateTitle());

    this.render();
    parent.appendChild(this.container);

    this.container.addEventListener('click', () => {
      this.cameraController.resetNorth();
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="compass-dial">
        <span class="compass-cardinal n">N</span>
        <span class="compass-tick e"></span>
        <span class="compass-tick s"></span>
        <span class="compass-tick w"></span>
      </div>
      <div class="compass-needle-wrapper" id="compass-needle">
        <svg class="compass-needle-svg" viewBox="0 0 24 24" width="28" height="28">
          <!-- Ponta Norte (Vermelha) -->
          <polygon points="12,2 8,12 12,10" fill="#f87171" />
          <polygon points="12,2 16,12 12,10" fill="#dc2626" />
          <!-- Ponta Sul (Prateada / Escura) -->
          <polygon points="12,22 8,12 12,14" fill="#94a3b8" />
          <polygon points="12,22 16,12 12,14" fill="#64748b" />
          <!-- Pivô Central -->
          <circle cx="12" cy="12" r="2.2" fill="#f59e0b" stroke="#1e293b" stroke-width="0.8" />
        </svg>
      </div>
    `;

    this.needleEl = this.container.querySelector('#compass-needle') as HTMLElement;
  }

  /**
   * Atualização contínua a cada frame da renderização 3D (60 FPS)
   */
  public update(): void {
    if (!this.needleEl) return;
    const azimuth = this.cameraController.getAzimuth();
    // Inversão angular para a agulha apontar para o Norte relativo da tela
    const angleDeg = (-azimuth * 180) / Math.PI;

    if (Math.abs(angleDeg - this.lastAngleDeg) > 0.15) {
      this.lastAngleDeg = angleDeg;
      this.needleEl.style.transform = `rotate(${angleDeg.toFixed(1)}deg)`;
    }
  }

  public setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'flex' : 'none';
  }

  private updateTitle(): void {
    this.container.title = i18n.getLang() === 'en'
      ? 'Cartographic North (0°) — Click to align to North'
      : 'Norte Cartográfico (0°) — Clique para alinhar ao Norte';
  }
}
