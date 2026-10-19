// ==============================================================================
// JACKAL SANDBOX — BARRA DE FERRAMENTAS LATERAL
// ==============================================================================

import { ModelingTool, UserRole } from '../core/types';
import { ICONS } from './icons';
import { i18n, t } from '../i18n';

export class ToolbarUI {
  private container: HTMLElement;
  private currentTool: ModelingTool = 'raise';
  private currentRole: UserRole = 'explorer';
  private onToolChangeCallback: (tool: ModelingTool) => void;
  private onUndoCallback: () => void;
  private onRedoCallback: () => void;

  constructor(
    parent: HTMLElement,
    callbacks: {
      onToolChange: (tool: ModelingTool) => void;
      onUndo: () => void;
      onRedo: () => void;
    }
  ) {
    this.onToolChangeCallback = callbacks.onToolChange;
    this.onUndoCallback = callbacks.onUndo;
    this.onRedoCallback = callbacks.onRedo;

    this.container = document.createElement('div');
    this.container.className = 'glass-panel toolbar-left';
    parent.appendChild(this.container);

    this.render();

    i18n.subscribe(() => {
      this.render();
    });
  }

  public setTool(tool: ModelingTool): void {
    if (this.currentRole === 'scout' && !['pin', 'station'].includes(tool)) {
      return;
    }
    if (this.currentRole === 'explorer' && tool === 'lock') {
      return;
    }
    this.currentTool = tool;
    this.container.querySelectorAll('.tool-btn').forEach((btn) => {
      const bTool = btn.getAttribute('data-tool');
      btn.classList.toggle('active', bTool === tool);
    });
    this.onToolChangeCallback(tool);
  }

  public setRole(role: UserRole): void {
    this.currentRole = role;
    if (role === 'scout' && !['pin', 'station'].includes(this.currentTool)) {
      this.setTool('pin');
    } else if (role === 'explorer' && this.currentTool === 'lock') {
      this.setTool('raise');
    }
    this.updateRoleVisuals();
  }

  private updateRoleVisuals(): void {
    const isScout = this.currentRole === 'scout';
    const isCartographer = this.currentRole === 'cartographer';

    this.container.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
      const tool = btn.getAttribute('data-tool') as ModelingTool;
      if (['raise', 'lower', 'smooth', 'flatten', 'water', 'eraser'].includes(tool)) {
        (btn as HTMLElement).style.opacity = isScout ? '0.3' : '1.0';
        (btn as HTMLElement).style.pointerEvents = isScout ? 'none' : 'auto';
      } else if (tool === 'lock') {
        (btn as HTMLElement).style.display = isCartographer ? 'flex' : 'none';
      }
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <button class="tool-btn ${this.currentTool === 'raise' ? 'active' : ''}" data-tool="raise" title="${t('tool_raise')}">
        ${ICONS.arrowUp}
      </button>
      <button class="tool-btn ${this.currentTool === 'lower' ? 'active' : ''}" data-tool="lower" title="${t('tool_lower')}">
        ${ICONS.arrowDown}
      </button>
      <button class="tool-btn ${this.currentTool === 'smooth' ? 'active' : ''}" data-tool="smooth" title="${t('tool_smooth')}">
        ${ICONS.waves}
      </button>
      <button class="tool-btn ${this.currentTool === 'flatten' ? 'active' : ''}" data-tool="flatten" title="${t('tool_flatten')}">
        ${ICONS.minus}
      </button>
      <button class="tool-btn ${this.currentTool === 'water' ? 'active' : ''}" data-tool="water" title="${t('tool_water')}">
        ${ICONS.droplet}
      </button>
      <button class="tool-btn ${this.currentTool === 'eraser' ? 'active' : ''}" data-tool="eraser" title="${t('tool_eraser')}">
        ${ICONS.eraser}
      </button>
      <button class="tool-btn ${this.currentTool === 'lock' ? 'active' : ''}" data-tool="lock" title="${t('tool_lock')} [K]" style="font-size: 14px; display: ${this.currentRole === 'cartographer' ? 'flex' : 'none'};">
        🔒
      </button>

      <div class="tool-divider"></div>

      <button class="tool-btn ${this.currentTool === 'pin' ? 'active' : ''}" data-tool="pin" title="${t('tool_pin')}">
        ${ICONS.pin}
      </button>
      <button class="tool-btn ${this.currentTool === 'station' ? 'active' : ''}" data-tool="station" title="${t('tool_station')}">
        ${ICONS.compass}
      </button>

      <div class="tool-divider"></div>

      <button class="tool-btn" id="btn-undo" title="${t('undo')}">
        ${ICONS.undo}
      </button>
      <button class="tool-btn" id="btn-redo" title="${t('redo')}">
        ${ICONS.redo}
      </button>
    `;

    this.container.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool') as ModelingTool;
        this.setTool(tool);
      });
    });

    this.container.querySelector('#btn-undo')?.addEventListener('click', () => {
      this.onUndoCallback();
    });
    this.container.querySelector('#btn-redo')?.addEventListener('click', () => {
      this.onRedoCallback();
    });

    this.updateRoleVisuals();
  }
}

