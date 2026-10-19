// ==============================================================================
// JACKAL SANDBOX — BARRA SUPERIOR DE CÂMERAS E EXAGERO VERTICAL
// ==============================================================================

import { CameraController } from '../renderer/camera';
import { CameraMode, CardinalDirection } from '../core/types';
import { ICONS } from './icons';
import { i18n, t } from '../i18n';
import { HelpModalUI } from './help-modal';

export class CameraBarUI {
  private container: HTMLElement;
  private cameraController: CameraController;
  private onVerticalExaggerationCallback: (factor: number) => void;
  private onFocusStationCallback?: () => void;
  private helpModal: HelpModalUI;
  private currentExaggeration = 1.0;
  private currentCameraMode: CameraMode = 'top';

  constructor(
    parent: HTMLElement,
    cameraController: CameraController,
    onVerticalExaggeration: (factor: number) => void,
    onFocusStation?: () => void
  ) {
    this.cameraController = cameraController;
    this.onVerticalExaggerationCallback = onVerticalExaggeration;
    this.onFocusStationCallback = onFocusStation;
    this.helpModal = new HelpModalUI(parent);

    this.container = document.createElement('div');
    this.container.className = 'glass-panel top-bar';
    parent.appendChild(this.container);

    this.render();

    i18n.subscribe(() => {
      this.render();
    });
  }

  public render(): void {
    const isPt = i18n.getLang() === 'pt';

    this.container.innerHTML = `
      <div class="brand-section">
        <a href="../" class="btn" style="text-decoration:none; font-size:11px; padding:3px 8px; margin-right:4px;" title="Voltar ao Atlas 2D">◀ Atlas</a>
        <div class="brand-title">
          <span>${t('app_title')}</span>
          <span class="badge-tag">${t('app_subtitle')}</span>
        </div>
      </div>

      <div class="camera-controls">
        <!-- Modos de Câmera -->
        <div class="btn-group">
          <button class="btn ${this.currentCameraMode === 'top' ? 'active' : ''}" data-cam="top" title="${t('cam_top')}">
            ${t('cam_top')}
          </button>
          <button class="btn ${this.currentCameraMode === 'isometric' ? 'active' : ''}" data-cam="isometric" title="${t('cam_iso')}">
            ${t('cam_iso')}
          </button>
          <button class="btn ${this.currentCameraMode === 'side' ? 'active' : ''}" data-cam="side" title="${t('cam_lat')}">
            ${t('cam_lat')}
          </button>
          <button class="btn ${this.currentCameraMode === 'free' ? 'active' : ''}" data-cam="free" title="${t('cam_free')}">
            ${t('cam_free')}
          </button>
        </div>

        <!-- Rotações Cardeais em 90° -->
        <div class="btn-group" id="cardinal-group" style="display: ${this.currentCameraMode === 'isometric' || this.currentCameraMode === 'side' ? 'flex' : 'none'};">
          <button class="btn" data-cardinal="N" title="Norte (0°)">${t('north')}</button>
          <button class="btn" data-cardinal="L" title="Leste (90°)">${t('east')}</button>
          <button class="btn" data-cardinal="S" title="Sul (180°)">${t('south')}</button>
          <button class="btn" data-cardinal="O" title="Oeste (270°)">${t('west')}</button>
        </div>

        <!-- Centralizar no Spawn (0,0) -->
        <button class="btn" id="btn-center-spawn" title="Spawn (0,0)">
          ${ICONS.crosshair} ${t('cam_center_zero')}
        </button>

        <!-- Focar na Estação Ativa -->
        <button class="btn" id="btn-center-station" title="${t('cam_center_station')}">
          ${ICONS.compass} ${t('cam_center_station')}
        </button>

        <!-- Exagero Vertical (1x a 5x) -->
        <div style="display: flex; align-items: center; gap: 8px; margin-left: 6px; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-color);">
          <span style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">${t('cam_exaggeration')}</span>
          <span id="exag-display" style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-gold); font-weight: 700; min-width: 24px;">${this.currentExaggeration.toFixed(1)}×</span>
          <input type="range" id="input-exaggeration" min="1.0" max="5.0" step="0.2" value="${this.currentExaggeration}" style="width: 75px;" />
        </div>

        <!-- Seletor de Idioma PT / EN -->
        <button class="btn" id="btn-lang-toggle" style="padding: 4px 8px; font-size: 11px; font-weight: bold; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4);" title="Alternar Idioma / Switch Language">
          ${isPt ? 'PT 🇧🇷' : 'EN 🇺🇸'}
        </button>

        <!-- Guia de Comandos e Atalhos -->
        <button class="btn" id="btn-help-guide" style="padding: 4px 9px; font-size: 12px; font-weight: bold; color: var(--accent-gold); border: 1px solid rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1);" title="${t('help_btn_title')}">
          ?
        </button>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const cardinalGroup = this.container.querySelector('#cardinal-group') as HTMLElement;

    this.container.querySelectorAll('.btn[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-cam') as CameraMode;
        this.currentCameraMode = mode;
        this.cameraController.setMode(mode);

        this.container.querySelectorAll('.btn[data-cam]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        if (mode === 'isometric' || mode === 'side') {
          cardinalGroup.style.display = 'flex';
        } else {
          cardinalGroup.style.display = 'none';
        }
      });
    });

    this.container.querySelectorAll('.btn[data-cardinal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-cardinal') as CardinalDirection;
        this.cameraController.rotateStep(dir);
      });
    });

    this.container.querySelector('#btn-center-spawn')?.addEventListener('click', () => {
      this.cameraController.setReferencePoint(0, 0, 0);
    });

    this.container.querySelector('#btn-center-station')?.addEventListener('click', () => {
      if (this.onFocusStationCallback) {
        this.onFocusStationCallback();
      }
    });

    const inputExag = this.container.querySelector('#input-exaggeration') as HTMLInputElement;
    const exagDisplay = this.container.querySelector('#exag-display') as HTMLElement;
    inputExag?.addEventListener('input', () => {
      this.currentExaggeration = parseFloat(inputExag.value);
      if (exagDisplay) exagDisplay.innerText = `${this.currentExaggeration.toFixed(1)}×`;
      this.onVerticalExaggerationCallback(this.currentExaggeration);
    });

    this.container.querySelector('#btn-lang-toggle')?.addEventListener('click', () => {
      i18n.toggleLang();
    });

    this.container.querySelector('#btn-help-guide')?.addEventListener('click', () => {
      this.helpModal.open();
    });
  }
}
