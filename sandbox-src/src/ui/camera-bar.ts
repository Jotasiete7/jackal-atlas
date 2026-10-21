// ==============================================================================
// JACKAL SANDBOX — BARRA SUPERIOR DE CÂMERAS, NUVEM E EXAGERO VERTICAL
// ==============================================================================

import { CameraController } from '../renderer/camera';
import { CameraMode, CardinalDirection } from '../core/types';
import { SupabaseSyncManager } from '../core/supabase-sync';
import { ICONS } from './icons';
import { i18n, t } from '../i18n';
import { HelpModalUI } from './help-modal';
import { CRYSTAL_BASES } from '../config';

export class CameraBarUI {
  private container: HTMLElement;
  private cameraController: CameraController;
  private onVerticalExaggerationCallback: (factor: number) => void;
  private onFocusStationCallback?: () => void;
  private supabaseSync?: SupabaseSyncManager;
  private onCloudPullCallback?: () => void;
  private onCloudPublishCallback?: () => void;
  private onSyncPinsCallback?: () => void;
  private onSyncRoutesCallback?: () => void;
  private onSelectCrystalCallback?: (crystalId: keyof typeof CRYSTAL_BASES) => void;
  private helpModal: HelpModalUI;
  private currentExaggeration = 1.0;
  private currentCameraMode: CameraMode = 'top';

  constructor(
    parent: HTMLElement,
    cameraController: CameraController,
    onVerticalExaggeration: (factor: number) => void,
    onFocusStation?: () => void,
    cloudDeps?: {
      supabaseSync?: SupabaseSyncManager;
      onCloudPull?: () => void;
      onCloudPublish?: () => void;
      onSyncPins?: () => void;
      onSyncRoutes?: () => void;
      onSelectCrystal?: (crystalId: keyof typeof CRYSTAL_BASES) => void;
    }
  ) {
    this.cameraController = cameraController;
    this.onVerticalExaggerationCallback = onVerticalExaggeration;
    this.onFocusStationCallback = onFocusStation;
    this.supabaseSync = cloudDeps?.supabaseSync;
    this.onCloudPullCallback = cloudDeps?.onCloudPull;
    this.onCloudPublishCallback = cloudDeps?.onCloudPublish;
    this.onSyncPinsCallback = cloudDeps?.onSyncPins;
    this.onSyncRoutesCallback = cloudDeps?.onSyncRoutes;
    this.onSelectCrystalCallback = cloudDeps?.onSelectCrystal;
    this.helpModal = new HelpModalUI(parent);

    this.container = document.createElement('div');
    this.container.className = 'glass-panel top-bar';
    parent.appendChild(this.container);

    this.render();

    i18n.subscribe(() => {
      this.render();
    });

    if (this.supabaseSync) {
      this.supabaseSync.subscribe(() => {
        this.render();
      });
    }
  }

  public render(): void {
    const isPt = i18n.getLang() === 'pt';
    const profile = this.supabaseSync?.getProfile();
    const isOfficer = this.supabaseSync?.isOfficerOrAdmin();
    const userName = profile?.nick || profile?.discord_name || 'Scout';
    const userRole = profile?.role || 'pending';
    const avatarUrl = profile?.discord_avatar || '';

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

        <!-- Atalhos dos 3 Cristais Oficiais -->
        <div class="btn-group" style="margin-left: 2px;">
          <button class="btn btn-jump-crystal" data-crystal="north" style="font-size: 11px; padding: 3px 7px; color: #38bdf8;" title="Freedom Outpost North (0, 150)">
            🏰 Norte
          </button>
          <button class="btn btn-jump-crystal" data-crystal="west" style="font-size: 11px; padding: 3px 7px; color: #34d399;" title="Freedom Outpost West (-320, -250)">
            🏰 Oeste
          </button>
          <button class="btn btn-jump-crystal" data-crystal="east" style="font-size: 11px; padding: 3px 7px; color: #f87171;" title="Freedom Outpost East (60, -180)">
            🏰 Leste
          </button>
        </div>

        <!-- Exagero Vertical (1x a 5x) -->
        <div style="display: flex; align-items: center; gap: 8px; margin-left: 4px; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-color);">
          <span style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">${t('cam_exaggeration')}</span>
          <span id="exag-display" style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-gold); font-weight: 700; min-width: 24px;">${this.currentExaggeration.toFixed(1)}×</span>
          <input type="range" id="input-exaggeration" min="1.0" max="5.0" step="0.2" value="${this.currentExaggeration}" style="width: 70px;" />
        </div>

        <!-- Ações de Nuvem & Sincronização -->
        <div class="cloud-actions" style="display: flex; align-items: center; gap: 4px; margin-left: 6px; border-left: 1px solid var(--border-color); padding-left: 6px;">
          <button class="btn" id="btn-cloud-pull" style="font-size: 11px; padding: 4px 8px; color: #38bdf8; border-color: rgba(56,189,248,0.4);" title="${t('cloud_pull_title')}">
            ☁️ ${t('cloud_pull')}
          </button>
          ${isOfficer ? `
            <button class="btn btn-gold" id="btn-cloud-publish" style="font-size: 11px; padding: 4px 8px; font-weight: 800;" title="${t('cloud_publish_title')}">
              🚀 ${t('cloud_publish')}
            </button>
          ` : ''}
          <button class="btn" id="btn-sync-pins" style="font-size: 11px; padding: 4px 8px; color: #fbbf24; border-color: rgba(251,191,36,0.35);" title="${t('cloud_sync_pins_title')}">
            📍 ${t('cloud_sync_pins')}
          </button>
          <button class="btn" id="btn-sync-routes" style="font-size: 11px; padding: 4px 8px; color: #34d399; border-color: rgba(52,211,153,0.35);" title="${i18n.getLang() === 'en' ? 'Sync roads, bridges, and tunnels from 2D Atlas' : 'Sincronizar estradas, pontes e túneis do Atlas 2D'}">
            🛣️ ${i18n.getLang() === 'en' ? 'Routes' : 'Rotas'}
          </button>
        </div>

        <!-- Perfil do Usuário Discord -->
        <div class="user-auth-badge" style="display: flex; align-items: center; margin-left: 4px;">
          ${profile ? `
            <div style="display: flex; align-items: center; gap: 6px; background: rgba(16,18,26,0.85); padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 11px;">
              ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" />` : '👤'}
              <span style="font-weight: 700; color: #fff; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${userName}</span>
              <span class="role-badge ${userRole}">${userRole.toUpperCase()}</span>
            </div>
          ` : `
            <a href="../login.html" class="btn" style="text-decoration: none; font-size: 11px; padding: 4px 8px; color: #818cf8; border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.1);" title="${t('login_discord_title')}">
              🔑 ${t('login_discord')}
            </a>
          `}
        </div>

        <!-- Seletor de Idioma PT / EN -->
        <button class="btn" id="btn-lang-toggle" style="padding: 4px 8px; font-size: 11px; font-weight: bold; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4);" title="Alternar Idioma / Switch Language">
          ${isPt ? 'PT 🇧🇷' : 'EN 🇺🇸'}
        </button>

        <!-- Tutorial e Guia Tático 3D -->
        <button class="btn" id="btn-help-guide" style="padding: 4px 9px; font-size: 11px; font-weight: bold; color: var(--accent-gold); border: 1px solid rgba(245, 166, 35, 0.45); background: rgba(245, 166, 35, 0.12); display: flex; align-items: center; gap: 4px;" title="${t('help_btn_title')}">
          <span>🎓</span> <span>${isPt ? 'Tutorial' : 'Tutorial'}</span>
        </button>
      </div>
    `;

    this.bindEvents();
  }

  public setActiveCrystal(crystalId: string): void {
    this.container.querySelectorAll('.btn-jump-crystal').forEach((btn) => {
      const id = btn.getAttribute('data-crystal');
      const el = btn as HTMLElement;
      if (id === crystalId) {
        el.classList.add('active');
        el.style.borderColor = 'var(--accent-gold)';
        el.style.background = 'rgba(245, 166, 35, 0.18)';
        el.style.boxShadow = '0 0 8px rgba(245, 166, 35, 0.35)';
      } else {
        el.classList.remove('active');
        el.style.borderColor = '';
        el.style.background = '';
        el.style.boxShadow = '';
      }
    });
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

    this.container.querySelectorAll('.btn-jump-crystal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const crystalId = btn.getAttribute('data-crystal') as keyof typeof CRYSTAL_BASES;
        const crystal = CRYSTAL_BASES[crystalId];
        if (crystal) {
          if (this.onSelectCrystalCallback) {
            this.onSelectCrystalCallback(crystalId);
          } else {
            this.cameraController.jumpToTile(crystal.tileX, crystal.tileY);
          }
          this.setActiveCrystal(crystalId);
        }
      });
    });

    const inputExag = this.container.querySelector('#input-exaggeration') as HTMLInputElement;
    const exagDisplay = this.container.querySelector('#exag-display') as HTMLElement;
    inputExag?.addEventListener('input', () => {
      this.currentExaggeration = parseFloat(inputExag.value);
      if (exagDisplay) exagDisplay.innerText = `${this.currentExaggeration.toFixed(1)}×`;
      this.onVerticalExaggerationCallback(this.currentExaggeration);
    });

    this.container.querySelector('#btn-cloud-pull')?.addEventListener('click', () => {
      if (this.onCloudPullCallback) this.onCloudPullCallback();
    });

    this.container.querySelector('#btn-cloud-publish')?.addEventListener('click', () => {
      if (this.onCloudPublishCallback) this.onCloudPublishCallback();
    });

    this.container.querySelector('#btn-sync-pins')?.addEventListener('click', () => {
      if (this.onSyncPinsCallback) this.onSyncPinsCallback();
    });

    this.container.querySelector('#btn-sync-routes')?.addEventListener('click', () => {
      if (this.onSyncRoutesCallback) this.onSyncRoutesCallback();
    });

    this.container.querySelector('#btn-lang-toggle')?.addEventListener('click', () => {
      i18n.toggleLang();
    });

    this.container.querySelector('#btn-help-guide')?.addEventListener('click', () => {
      this.helpModal.open();
    });
  }
}
