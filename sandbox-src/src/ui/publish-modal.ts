// ==============================================================================
// JACKAL SANDBOX — MODAL DE PUBLICAÇÃO OFICIAL DE RELEVO
// Card com a identidade visual do Sandbox, nome gerado automático e nota opcional
// ==============================================================================

import { i18n, t } from '../i18n';
import { buildReliefCommitName, formatReliefVersion } from '../core/relief-naming';

export interface PublishModalOptions {
  currentVersion: number;
  nextVersion: number;
  author: string;
  chunkCount: number;
}

export class PublishModalUI {
  private backdrop: HTMLElement;
  private onPublishCallback?: (note?: string) => Promise<boolean>;
  private isSubmitting = false;

  constructor(parent: HTMLElement) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.style.display = 'none';
    parent.appendChild(this.backdrop);

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && !this.isSubmitting) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if (this.backdrop.style.display === 'flex') {
        if (e.key === 'Escape' && !this.isSubmitting) {
          this.close();
        } else if (e.key === 'Enter' && !this.isSubmitting && (e.ctrlKey || e.metaKey || document.activeElement?.id === 'input-publish-note')) {
          e.preventDefault();
          this.handlePublish();
        }
      }
    });
  }

  public open(opts: PublishModalOptions): void {
    this.isSubmitting = false;
    this.render(opts);
    this.backdrop.style.display = 'flex';

    // Foca automaticamente no campo de nota opcional
    setTimeout(() => {
      const input = document.getElementById('input-publish-note') as HTMLInputElement | null;
      if (input) input.focus();
    }, 60);
  }

  public close(): void {
    this.backdrop.style.display = 'none';
  }

  public setOnPublish(cb: (note?: string) => Promise<boolean>): void {
    this.onPublishCallback = cb;
  }

  private render(opts: PublishModalOptions): void {
    const isPt = i18n.getLang() === 'pt';
    const nextVerTag = formatReliefVersion(opts.nextVersion);
    const currVerTag = formatReliefVersion(opts.currentVersion);
    const defaultName = buildReliefCommitName(opts.nextVersion);

    this.backdrop.innerHTML = `
      <div class="glass-panel modal-content" style="max-width: 480px; width: 92%;">
        <!-- Header -->
        <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:8px; margin-bottom:14px;">
          <strong style="color:var(--accent-gold); font-size:13px; display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">🚀</span>
            <span>${t('publish_modal_title')}</span>
          </strong>
          <button id="btn-publish-modal-close" class="btn" style="padding:2px 8px; font-size:14px; color:var(--text-dim); background:transparent;" title="Fechar">✕</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; font-size:12px;">
          <!-- Faixa de Versão -->
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(245, 158, 11, 0.08); border:1px solid rgba(245, 158, 11, 0.25); border-radius:6px; padding:8px 12px;">
            <div>
              <span style="font-size:10.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block;">
                ${t('publish_next_version')}
              </span>
              <strong style="font-size:18px; color:var(--accent-gold); font-family:var(--font-mono); letter-spacing:0.5px;">
                ${nextVerTag}
              </strong>
            </div>
            <div style="text-align:right;">
              <span style="font-size:10.5px; color:var(--text-dim); display:block;">
                ${t('publish_current_cloud_version')}:
              </span>
              <span style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted);">
                ${currVerTag}
              </span>
            </div>
          </div>

          <!-- Nome Gerado Automático (Somente Leitura) -->
          <div>
            <label style="color:var(--text-muted); font-size:11px; display:block; margin-bottom:4px; font-weight:600;">
              ${t('publish_generated_name')}:
            </label>
            <div id="preview-generated-name" style="background:rgba(0,0,0,0.45); border:1px solid var(--border-color); border-radius:4px; padding:7px 10px; font-family:var(--font-mono); font-size:11.5px; color:#38bdf8; word-break:break-all;">
              ${defaultName}
            </div>
          </div>

          <!-- Nota Opcional -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label for="input-publish-note" style="color:var(--text-muted); font-size:11px; font-weight:600;">
                ${t('publish_note_label')}:
              </label>
              <span style="font-size:10px; color:var(--text-dim);">
                ${isPt ? 'Opcional • Enter para enviar' : 'Optional • Enter to send'}
              </span>
            </div>
            <input
              type="text"
              id="input-publish-note"
              class="form-control"
              placeholder="${t('publish_note_placeholder')}"
              maxlength="100"
              style="width:100%; box-sizing:border-box; padding:7px 10px; font-size:12px; background:rgba(0,0,0,0.3); border:1px solid var(--border-color); border-radius:4px; color:#f1f5f9;"
            />
          </div>

          <!-- Resumo de Metadados -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); padding:8px 10px; border-radius:4px; font-size:11px;">
            <div>
              <span style="color:var(--text-dim); display:block; font-size:10px;">${t('publish_author')}:</span>
              <strong style="color:var(--text-main); font-family:var(--font-mono);">${opts.author || 'Oficial'}</strong>
            </div>
            <div>
              <span style="color:var(--text-dim); display:block; font-size:10px;">${t('publish_chunks_count')}:</span>
              <strong style="color:var(--text-main); font-family:var(--font-mono);">${opts.chunkCount}</strong>
            </div>
          </div>

          <!-- Aviso de Backup Automático -->
          <div style="font-size:10.5px; color:var(--text-dim); display:flex; align-items:center; gap:6px; background:rgba(56, 189, 248, 0.05); border:1px solid rgba(56, 189, 248, 0.15); padding:6px 10px; border-radius:4px;">
            <span>🛡️</span>
            <span>${t('publish_backup_notice')}</span>
          </div>

          <!-- Ações -->
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px; padding-top:10px; border-top:1px solid var(--border-color);">
            <button id="btn-publish-cancel" class="btn" style="padding:6px 14px; font-size:11.5px;">
              ${t('publish_btn_cancel')}
            </button>
            <button id="btn-publish-submit" class="btn btn-gold" style="padding:6px 18px; font-size:11.5px; font-weight:800; display:flex; align-items:center; gap:6px;">
              <span>${t('publish_btn_submit')}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(opts.nextVersion);
  }

  private bindEvents(nextVersion: number): void {
    const btnClose = this.backdrop.querySelector('#btn-modal-close');
    const btnCancel = this.backdrop.querySelector('#btn-publish-cancel');
    const btnSubmit = this.backdrop.querySelector('#btn-publish-submit') as HTMLButtonElement | null;
    const inputNote = this.backdrop.querySelector('#input-publish-note') as HTMLInputElement | null;
    const previewName = this.backdrop.querySelector('#preview-generated-name');

    const handleClose = () => {
      if (!this.isSubmitting) this.close();
    };

    if (btnClose) btnClose.addEventListener('click', handleClose);
    if (btnCancel) btnCancel.addEventListener('click', handleClose);

    if (inputNote && previewName) {
      inputNote.addEventListener('input', () => {
        const liveName = buildReliefCommitName(nextVersion, inputNote.value);
        previewName.textContent = liveName;
      });
    }

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => this.handlePublish());
    }
  }

  private async handlePublish(): Promise<void> {
    if (this.isSubmitting) return;
    const inputNote = this.backdrop.querySelector('#input-publish-note') as HTMLInputElement | null;
    const btnSubmit = this.backdrop.querySelector('#btn-publish-submit') as HTMLButtonElement | null;
    const note = inputNote?.value?.trim();

    this.isSubmitting = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span>⏳ ${t('publish_btn_submitting')}</span>`;
      btnSubmit.style.opacity = '0.7';
    }

    try {
      if (this.onPublishCallback) {
        const ok = await this.onPublishCallback(note || undefined);
        if (ok) {
          this.close();
        }
      }
    } finally {
      this.isSubmitting = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>${t('publish_btn_submit')}</span>`;
        btnSubmit.style.opacity = '1';
      }
    }
  }
}
