// ==============================================================================
// JACKAL SANDBOX — MODAL DE GUIA RÁPIDO DE COMANDOS E ATALHOS
// ==============================================================================

import { t } from '../i18n';

export class HelpModalUI {
  private backdrop: HTMLElement;
  private isOpen = false;

  constructor(parent: HTMLElement) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.style.display = 'none';
    parent.appendChild(this.backdrop);

    // Fechar ao clicar fora ou pressionar ESC
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.close();
      }
    });
  }

  public open(): void {
    this.isOpen = true;
    this.render();
    this.backdrop.style.display = 'flex';
  }

  public close(): void {
    this.isOpen = false;
    this.backdrop.style.display = 'none';
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private render(): void {
    this.backdrop.innerHTML = `
      <div class="glass-panel modal-content" style="max-width: 480px; width: 90%; max-height: 85vh; overflow-y: auto;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 14px;">
          <strong style="color: #f1f5f9; font-size: 13px; letter-spacing: 0.5px;">
            ${t('help_modal_title')}
          </strong>
          <button id="btn-help-close" class="btn" style="padding: 2px 8px; font-size: 14px; color: var(--text-dim); background: transparent;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 12px;">
          <!-- Seção de Câmera -->
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--accent-gold); text-transform: uppercase; margin-bottom: 8px;">
              ${t('help_sec_nav')}
            </div>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; color: #cbd5e1;">
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_nav_wasd')}</span>
              </li>
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_nav_orbit')}</span>
              </li>
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_nav_pan')}</span>
              </li>
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_nav_focus')}</span>
              </li>
            </ul>
          </div>

          <div class="tool-divider"></div>

          <!-- Seção de Escala e Ferramentas -->
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--accent-gold); text-transform: uppercase; margin-bottom: 8px;">
              ${t('help_sec_scale')}
            </div>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; color: #cbd5e1;">
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_scale_move')}</span>
              </li>
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_scale_toggle')}</span>
              </li>
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_contours_toggle')}</span>
              </li>
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_tools_keys')}</span>
              </li>
              <li style="display: flex; align-items: flex-start; gap: 6px;">
                <span style="color: #38bdf8; font-weight: bold;">•</span>
                <span>${t('help_presets_keys')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
          <button id="btn-help-ok" class="btn btn-gold" style="padding: 4px 14px; font-size: 11px;">
            OK
          </button>
        </div>
      </div>
    `;

    this.backdrop.querySelector('#btn-help-close')?.addEventListener('click', () => this.close());
    this.backdrop.querySelector('#btn-help-ok')?.addEventListener('click', () => this.close());
  }
}
