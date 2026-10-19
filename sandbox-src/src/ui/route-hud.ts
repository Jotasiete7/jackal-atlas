// ==============================================================================
// JACKAL SANDBOX — HUD FLUTUANTE DE INFRAESTRUTURAS (ESTRADAS, PONTES, TÚNEIS)
// Permite alternar entre estrada, ponte e túnel, ver a régua em tempo real e concluir/cancelar
// ==============================================================================

import { RouteType } from '../core/types';
import { i18n } from '../i18n';

export class RouteHUDUI {
  private container: HTMLElement;
  private currentType: RouteType = 'road';
  private nodesCount = 0;
  private currentDistanceTiles = 0;

  private onTypeChangeCallback?: (type: RouteType) => void;
  private onFinishCallback?: () => void;
  private onCancelCallback?: () => void;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'glass-panel route-hud-panel';
    this.container.style.display = 'none';
    parent.appendChild(this.container);

    this.render();

    i18n.subscribe(() => {
      if (this.container.style.display !== 'none') {
        this.render();
      }
    });
  }

  public setCallbacks(callbacks: {
    onTypeChange: (type: RouteType) => void;
    onFinish: () => void;
    onCancel: () => void;
  }): void {
    this.onTypeChangeCallback = callbacks.onTypeChange;
    this.onFinishCallback = callbacks.onFinish;
    this.onCancelCallback = callbacks.onCancel;
  }

  public show(): void {
    this.container.style.display = 'flex';
    this.render();
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public setType(type: RouteType): void {
    this.currentType = type;
    this.render();
  }

  public getType(): RouteType {
    return this.currentType;
  }

  public updateState(nodesCount: number, distanceTiles: number): void {
    this.nodesCount = nodesCount;
    this.currentDistanceTiles = distanceTiles;
    this.render();
  }

  private render(): void {
    const isPt = i18n.getLang() === 'pt';
    const type = this.currentType;

    const roadActive = type === 'road' ? 'active-road' : '';
    const bridgeActive = type === 'bridge' ? 'active-bridge' : '';
    const tunnelActive = type === 'tunnel' ? 'active-tunnel' : '';

    let statusHtml = '';
    if (this.nodesCount === 0) {
      statusHtml = `
        <div style="font-size:11px; color:#cbd5e1; line-height:1.4;">
          📍 ${isPt ? 'Clique no terreno para fixar o início.' : 'Click terrain to set start point.'}
        </div>
      `;
    } else if (this.nodesCount === 1) {
      const snapHint = this.currentType === 'bridge'
        ? (isPt ? 'Trava 90° N/S/L/O (Pontes no Wurm são sempre retas)' : '90° N/S/E/W snap (Wurm bridges are always straight)')
        : (isPt ? 'Trava 0°/45°/90° ativa (Shift = livre)' : '0°/45°/90° snap active (Shift = free)');
      statusHtml = `
        <div style="font-size:11px; color:#f5a623; line-height:1.4;">
          📐 ${isPt ? 'Mova o mouse e dê o 2º clique.' : 'Move mouse and click next point.'}
          <span style="display:block; font-size:10px; color:#94a3b8;">
            ${snapHint}
          </span>
        </div>
      `;
    } else {
      statusHtml = `
        <div style="font-size:11px; color:#38bdf8; line-height:1.4; display:flex; justify-content:space-between; align-items:center;">
          <span>📏 <strong>${this.nodesCount}</strong> ${isPt ? 'pontos' : 'points'}</span>
          <strong style="color:var(--accent-gold); font-size:13px; font-family:var(--font-mono);">${this.currentDistanceTiles} tiles</strong>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:6px; margin-bottom:8px;">
        <span style="font-size:11px; font-weight:800; color:var(--accent-gold); text-transform:uppercase; letter-spacing:0.6px; display:flex; align-items:center; gap:6px;">
          <span>🛣️</span>
          <span>${isPt ? 'INFRAESTRUTURA & AFERIÇÃO' : 'INFRASTRUCTURE & RULER'}</span>
        </span>
      </div>

      <!-- Seletor de Tipo de Obra -->
      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; margin-bottom:8px;">
        <button id="hud-type-road" class="hud-pill-btn ${roadActive}" title="${isPt ? 'Estrada: fita drapeada colada no relevo' : 'Road: terrain-draped strip'}">
          <span>🛣️</span>
          <span>${isPt ? 'Estrada' : 'Road'}</span>
        </button>
        <button id="hud-type-bridge" class="hud-pill-btn ${bridgeActive}" title="${isPt ? 'Ponte: régua suspensa reta 90° (Norte/Sul ou Leste/Oeste)' : 'Bridge: straight 90° span (North/South or East/West)'}">
          <span>🌉</span>
          <span>${isPt ? 'Ponte' : 'Bridge'}</span>
        </button>
        <button id="hud-type-tunnel" class="hud-pill-btn ${tunnelActive}" title="${isPt ? 'Túnel: linha raio-x que fura montanhas' : 'Tunnel: mountain-cutting x-ray line'}">
          <span>🚇</span>
          <span>${isPt ? 'Túnel' : 'Tunnel'}</span>
        </button>
      </div>

      <!-- Informações ao vivo -->
      <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:4px; padding:6px 8px; margin-bottom:8px;">
        ${statusHtml}
      </div>

      <!-- Botões de Ação -->
      <div style="display:flex; gap:6px;">
        ${
          this.nodesCount >= 2
            ? `
          <button id="btn-hud-finish" class="btn btn-gold" style="flex:1; padding:5px 8px; font-size:11px; font-weight:700; justify-content:center;">
            ✓ ${isPt ? 'Concluir (Enter)' : 'Finish (Enter)'}
          </button>
        `
            : ''
        }
        ${
          this.nodesCount > 0
            ? `
          <button id="btn-hud-cancel" class="btn" style="padding:5px 8px; font-size:11px; color:#ef4444; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); justify-content:center;">
            ✕ ${isPt ? 'Cancelar (2x Direito/Esc)' : 'Cancel (2x Right/Esc)'}
          </button>
        `
            : `
          <div style="font-size:10px; color:var(--text-dim); text-align:center; width:100%; line-height:1.3;">
            ${isPt ? '🖱️ Arraste Direito: Câmera | 2x Direito ou Esc: Cancela' : '🖱️ Right Drag: Camera | 2x Right or Esc: Cancel'}
          </div>
        `
        }
      </div>
    `;

    // Eventos
    this.container.querySelector('#hud-type-road')?.addEventListener('click', () => {
      this.currentType = 'road';
      this.render();
      this.onTypeChangeCallback?.('road');
    });
    this.container.querySelector('#hud-type-bridge')?.addEventListener('click', () => {
      this.currentType = 'bridge';
      this.render();
      this.onTypeChangeCallback?.('bridge');
    });
    this.container.querySelector('#hud-type-tunnel')?.addEventListener('click', () => {
      this.currentType = 'tunnel';
      this.render();
      this.onTypeChangeCallback?.('tunnel');
    });

    this.container.querySelector('#btn-hud-finish')?.addEventListener('click', () => {
      this.onFinishCallback?.();
    });
    this.container.querySelector('#btn-hud-cancel')?.addEventListener('click', () => {
      this.onCancelCallback?.();
    });
  }
}
