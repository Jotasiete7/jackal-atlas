import { getTileSheetName } from '../config';
import { CellState, ConfidenceLevel, UserRole } from '../core/types';
import { i18n, t } from '../i18n';

export class InfoBarUI {
  private container: HTMLElement;
  private currentRole: UserRole = 'explorer';
  private onRoleChangeCallback?: (role: UserRole) => void;
  private onToggleSheetLockCallback?: (sheetId: string) => boolean;
  private isCurrentSheetLockedCallback?: (sheetId: string) => boolean;

  private lastCoords = { tileX: 0, tileY: 0, alt: 0, state: CellState.UNKNOWN, conf: ConfidenceLevel.SPECULATIVE };

  constructor(
    parent: HTMLElement,
    callbacks?: {
      onRoleChange?: (role: UserRole) => void;
      onToggleSheetLock?: (sheetId: string) => boolean;
      isCurrentSheetLocked?: (sheetId: string) => boolean;
    }
  ) {
    this.onRoleChangeCallback = callbacks?.onRoleChange;
    this.onToggleSheetLockCallback = callbacks?.onToggleSheetLock;
    this.isCurrentSheetLockedCallback = callbacks?.isCurrentSheetLocked;

    this.container = document.createElement('div');
    this.container.className = 'info-bar';
    parent.appendChild(this.container);

    this.render();

    i18n.subscribe(() => {
      this.render();
      this.updateCoordinates(
        this.lastCoords.tileX,
        this.lastCoords.tileY,
        this.lastCoords.alt,
        this.lastCoords.state,
        this.lastCoords.conf
      );
    });
  }

  public updateCoordinates(
    tileX: number,
    tileY: number,
    altitudeMeters: number,
    state: CellState,
    confidence: ConfidenceLevel
  ): void {
    this.lastCoords = { tileX, tileY, alt: altitudeMeters, state, conf: confidence };

    const sheet = getTileSheetName(tileX, tileY);
    const coordEl = this.container.querySelector('#info-coords') as HTMLElement;
    const sheetEl = this.container.querySelector('#info-sheet') as HTMLElement;
    const sheetLockBtn = this.container.querySelector('#btn-sheet-lock') as HTMLElement;
    const altEl = this.container.querySelector('#info-altitude') as HTMLElement;
    const stateEl = this.container.querySelector('#info-state') as HTMLElement;

    if (coordEl) coordEl.innerText = `X: ${tileX}, Y: ${tileY}`;
    if (sheetEl) sheetEl.innerText = sheet;
    if (altEl) altEl.innerText = `${altitudeMeters.toFixed(1)}m`;

    if (sheetLockBtn) {
      if (this.currentRole === 'cartographer') {
        sheetLockBtn.style.display = 'inline-flex';
        const isLocked = this.isCurrentSheetLockedCallback ? this.isCurrentSheetLockedCallback(sheet) : false;
        sheetLockBtn.innerText = isLocked ? '🔒' : '🔓';
        sheetLockBtn.title = isLocked ? `Folha ${sheet} Trancada (Clique para destravar)` : `Folha ${sheet} Aberta (Clique para trancar)`;
      } else {
        sheetLockBtn.style.display = 'none';
      }
    }

    if (stateEl) {
      if (state === CellState.UNKNOWN) {
        stateEl.innerText = t('status_state_unknown');
        stateEl.style.color = '#94a3b8';
      } else if (state === CellState.WATER) {
        stateEl.innerText = t('status_state_water');
        stateEl.style.color = '#60a5fa';
      } else {
        const confStr =
          confidence === ConfidenceLevel.MEASURED
            ? t('conf_measured').split(':')[0]
            : confidence === ConfidenceLevel.ESTIMATED
            ? t('conf_estimated').split(':')[0]
            : t('conf_speculative').split(':')[0];
        stateEl.innerText = `${t('status_state_land')} (${confStr})`;
        stateEl.style.color =
          confidence === ConfidenceLevel.MEASURED
            ? '#22c55e'
            : confidence === ConfidenceLevel.ESTIMATED
            ? '#eab308'
            : '#f97316';
      }
    }
  }

  public updateFps(fps: number): void {
    const fpsEl = this.container.querySelector('#info-fps') as HTMLElement;
    if (fpsEl) {
      fpsEl.innerText = `${fps} FPS`;
      fpsEl.style.color = fps >= 30 ? '#10b981' : '#ef4444';
    }
  }

  private allowCartographer = false;

  public getRole(): UserRole {
    return this.currentRole;
  }

  public setRole(role: UserRole, allowCartographer = false): void {
    this.allowCartographer = allowCartographer;
    this.currentRole = role === 'cartographer' && !allowCartographer ? 'explorer' : role;
    const btn = this.container.querySelector('#btn-toggle-role') as HTMLElement;
    if (btn) {
      btn.textContent = this.getRoleText();
    }
    if (this.onRoleChangeCallback) {
      this.onRoleChangeCallback(this.currentRole);
    }
    this.updateCoordinates(
      this.lastCoords.tileX,
      this.lastCoords.tileY,
      this.lastCoords.alt,
      this.lastCoords.state,
      this.lastCoords.conf
    );
  }

  private getRoleText(): string {
    if (this.currentRole === 'scout') return t('status_role_scout');
    if (this.currentRole === 'cartographer') return t('status_role_cartographer');
    return t('status_role_explorer');
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="info-group">
        <span class="info-label">${t('status_tile')}</span>
        <span class="info-value" id="info-coords">X: 0, Y: 0</span>
      </div>

      <div class="info-group">
        <span class="info-label">${t('status_sheet')}</span>
        <span class="info-value" id="info-sheet">N0-L0</span>
        <button id="btn-sheet-lock" class="btn" style="padding: 1px 5px; font-size: 11px; margin-left: 4px; display: ${this.currentRole === 'cartographer' ? 'inline-flex' : 'none'};" title="Trancar/Destrancar Folha">
          🔓
        </button>
      </div>

      <div class="info-group">
        <span class="info-label">${t('status_elevation')}</span>
        <span class="info-value" id="info-altitude" style="color: var(--accent-gold);">0.0m</span>
      </div>

      <div class="info-group">
        <span class="info-label">${t('status_state')}</span>
        <span class="info-value" id="info-state">${t('status_state_unknown')}</span>
      </div>

      <div class="info-group" style="margin-left: auto;">
        <span class="info-label">${t('status_role_label')}</span>
        <button id="btn-toggle-role" class="badge-tag" style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); cursor: pointer;" title="Alternar Papel de Trabalho">
          ${this.getRoleText()}
        </button>
      </div>

      <div class="info-group">
        <span class="info-value" id="info-fps" style="font-family: var(--font-mono); color: #10b981;">60 FPS</span>
      </div>
    `;

    this.container.querySelector('#btn-toggle-role')?.addEventListener('click', () => {
      if (this.currentRole === 'scout') {
        this.currentRole = 'explorer';
      } else if (this.currentRole === 'explorer') {
        this.currentRole = this.allowCartographer ? 'cartographer' : 'scout';
      } else {
        this.currentRole = 'scout';
      }

      const btn = this.container.querySelector('#btn-toggle-role') as HTMLElement;
      if (btn) {
        btn.textContent = this.getRoleText();
      }
      if (this.onRoleChangeCallback) {
        this.onRoleChangeCallback(this.currentRole);
      }
      this.updateCoordinates(
        this.lastCoords.tileX,
        this.lastCoords.tileY,
        this.lastCoords.alt,
        this.lastCoords.state,
        this.lastCoords.conf
      );
    });

    this.container.querySelector('#btn-sheet-lock')?.addEventListener('click', () => {
      if (!this.allowCartographer) return;
      const sheet = getTileSheetName(this.lastCoords.tileX, this.lastCoords.tileY);
      if (this.onToggleSheetLockCallback) {
        const isNowLocked = this.onToggleSheetLockCallback(sheet);
        const btn = this.container.querySelector('#btn-sheet-lock') as HTMLElement;
        if (btn) {
          btn.innerText = isNowLocked ? '🔒' : '🔓';
          btn.title = isNowLocked ? `Folha ${sheet} Trancada (Clique para destravar)` : `Folha ${sheet} Aberta (Clique para trancar)`;
        }
      }
    });
  }
}

