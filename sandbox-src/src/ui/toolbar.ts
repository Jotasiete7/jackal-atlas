// ==============================================================================
// JACKAL SANDBOX — BARRA DE FERRAMENTAS LATERAL
// ==============================================================================

import { ModelingTool, UserRole } from '../core/types';
import { ICONS } from './icons';
import { i18n, t } from '../i18n';
import { showToolHelp } from './tool-help';

export class ToolbarUI {
  private container: HTMLElement;
  private currentTool: ModelingTool = 'raise';
  private currentRole: UserRole = 'explorer';
  private placeablesDisponivel = false; // 🌲 only when the Wurm assets were extracted locally
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
    if (this.currentRole === 'scout' && !['pin', 'station', 'route'].includes(tool)) {
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

  public setPlaceablesDisponivel(disponivel: boolean): void {
    this.placeablesDisponivel = disponivel;
    this.render();
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

    this.container.querySelectorAll('.tool-btn-wrapper').forEach((wrap) => {
      const btn = wrap.querySelector('.tool-btn');
      if (!btn) return;
      const tool = btn.getAttribute('data-tool') as ModelingTool;
      if (['raise', 'lower', 'smooth', 'flatten', 'ramp', 'noise', 'water', 'eraser'].includes(tool)) {
        (wrap as HTMLElement).style.opacity = isScout ? '0.3' : '1.0';
        (wrap as HTMLElement).style.pointerEvents = isScout ? 'none' : 'auto';
      } else if (tool === 'lock') {
        (wrap as HTMLElement).style.display = isCartographer ? 'flex' : 'none';
      }
    });
  }

  private render(): void {
    const helpTip = i18n.getLang() === 'pt' ? 'Ajuda contextual da ferramenta' : 'Contextual tool help';

    this.container.innerHTML = `
      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'navigate' ? 'active' : ''}" data-tool="navigate" title="${t('tool_navigate')}">
          ${ICONS.navigate}
        </button>
        <span class="jk-help-btn" data-help="navigate" title="${helpTip}">?</span>
      </div>

      <div class="tool-divider"></div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'raise' ? 'active' : ''}" data-tool="raise" title="${t('tool_raise')} [R]">
          ${ICONS.arrowUp}
        </button>
        <span class="jk-help-btn" data-help="raise" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'lower' ? 'active' : ''}" data-tool="lower" title="${t('tool_lower')} [L]">
          ${ICONS.arrowDown}
        </button>
        <span class="jk-help-btn" data-help="lower" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'smooth' ? 'active' : ''}" data-tool="smooth" title="${t('tool_smooth')} [M]">
          ${ICONS.waves}
        </button>
        <span class="jk-help-btn" data-help="smooth" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'flatten' ? 'active' : ''}" data-tool="flatten" title="${t('tool_flatten')} [F]">
          ${ICONS.minus}
        </button>
        <span class="jk-help-btn" data-help="flatten" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'ramp' ? 'active' : ''}" data-tool="ramp" title="${t('tool_ramp')}">
          📐
        </button>
        <span class="jk-help-btn" data-help="ramp" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'noise' ? 'active' : ''}" data-tool="noise" title="${t('tool_noise')}">
          ⛰️
        </button>
        <span class="jk-help-btn" data-help="noise" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'water' ? 'active' : ''}" data-tool="water" title="${t('tool_water')} [U]">
          ${ICONS.droplet}
        </button>
        <span class="jk-help-btn" data-help="water" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'eraser' ? 'active' : ''}" data-tool="eraser" title="${t('tool_eraser')} [E]">
          ${ICONS.eraser}
        </button>
        <span class="jk-help-btn" data-help="eraser" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper" style="display: ${this.currentRole === 'cartographer' ? 'flex' : 'none'};">
        <button class="tool-btn ${this.currentTool === 'lock' ? 'active' : ''}" data-tool="lock" title="${t('tool_lock')} [K]" style="font-size: 14px;">
          🔒
        </button>
        <span class="jk-help-btn" data-help="lock" title="${helpTip}">?</span>
      </div>

      <div class="tool-divider"></div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'pin' ? 'active' : ''}" data-tool="pin" title="${t('tool_pin')} [P]">
          ${ICONS.pin}
        </button>
        <span class="jk-help-btn" data-help="pin" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'station' ? 'active' : ''}" data-tool="station" title="${t('tool_station')} [T]">
          ${ICONS.compass}
        </button>
        <span class="jk-help-btn" data-help="station" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn ${this.currentTool === 'route' ? 'active' : ''}" data-tool="route" title="${i18n.getLang() === 'en' ? 'Infrastructure & Calibration (Road, Bridge, Tunnel) [B]' : 'Infraestrutura & Aferição (Estrada, Ponte, Túnel) [B]'}">
          🛣️
        </button>
        <span class="jk-help-btn" data-help="route" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper" style="display:${this.placeablesDisponivel ? 'flex' : 'none'};">
        <button class="tool-btn ${this.currentTool === 'place' ? 'active' : ''}" data-tool="place" title="${i18n.getLang() === 'en' ? 'Placeables (Wurm models)' : 'Objetos (modelos do Wurm)'}" style="font-size:16px;">
          🌲
        </button>
        <span class="jk-help-btn" data-help="place" title="${helpTip}">?</span>
      </div>

      <div class="tool-divider"></div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn" id="btn-undo" title="${t('undo')} [Ctrl+Z]">
          ${ICONS.undo}
        </button>
        <span class="jk-help-btn" data-help="undo" title="${helpTip}">?</span>
      </div>

      <div class="tool-btn-wrapper">
        <button class="tool-btn" id="btn-redo" title="${t('redo')} [Ctrl+Y]">
          ${ICONS.redo}
        </button>
        <span class="jk-help-btn" data-help="redo" title="${helpTip}">?</span>
      </div>
    `;

    // Seleção de ferramenta
    this.container.querySelectorAll('.tool-btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool') as ModelingTool;
        this.setTool(tool);
      });
      // Botão direito abre ajuda
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const tool = btn.getAttribute('data-tool') as ModelingTool;
        if (tool) showToolHelp(tool, btn as HTMLElement);
      });
    });

    // Clique no mini botão "?"
    this.container.querySelectorAll('.jk-help-btn[data-help]').forEach((hBtn) => {
      hBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const toolKey = hBtn.getAttribute('data-help');
        if (toolKey) showToolHelp(toolKey, hBtn as HTMLElement);
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

