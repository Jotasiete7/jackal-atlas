// ==============================================================================
// JACKAL SANDBOX — MODAL DE CRIAÇÃO E INSPEÇÃO DE PINOS / MARCOS
// ==============================================================================

import { MapPin, PinMethod, PinType } from '../core/types';
import { PinManager } from '../core/pins';
import { t } from '../i18n';

export class PinModalUI {
  private backdrop: HTMLElement;
  private pinManager: PinManager;
  private currentPin: MapPin | null = null;
  private onSaveCallback?: (pin: MapPin) => void;

  constructor(parent: HTMLElement, pinManager: PinManager) {
    this.pinManager = pinManager;
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.style.display = 'none';
    parent.appendChild(this.backdrop);
  }

  public open(pinData: Partial<MapPin>, onSave: (pin: MapPin) => void, isCartographer = false): void {
    this.onSaveCallback = onSave;
    this.currentPin = pinData as MapPin;

    this.backdrop.innerHTML = `
      <div class="glass-panel modal-content">
        <div class="modal-header">
          <strong style="color: #fff; font-size: 14px;">
            ${t('pin_modal_title')}
          </strong>
          <button id="btn-modal-close" class="btn" style="padding: 2px 6px; color: var(--text-dim);">✕</button>
        </div>

        <div class="form-group">
          <label>${t('pin_coords')}</label>
          <div style="display: flex; gap: 8px;">
            <input type="number" id="pin-x" class="form-control" value="${pinData.x ?? 0}" style="flex: 1;" placeholder="X" />
            <input type="number" id="pin-y" class="form-control" value="${pinData.y ?? 0}" style="flex: 1;" placeholder="Y" />
          </div>
        </div>

        <div class="form-group">
          <label>${t('pin_elevation')}</label>
          <input type="number" id="pin-z" class="form-control" step="0.5" value="${pinData.z !== null && pinData.z !== undefined ? pinData.z : ''}" placeholder="${t('pin_elevation_hint')}" />
        </div>

        <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #93c5fd; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" id="pin-lock-altitude" ${pinData.lockAltitude ? 'checked' : ''} style="accent-color: #3b82f6;" />
          <span>${t('pin_lock_altitude')}</span>
        </label>

        <div class="form-group">
          <label>${t('pin_type')}</label>
          <select id="pin-type" class="form-control">
            <option value="pillar" ${pinData.type === 'pillar' ? 'selected' : ''}>${t('pin_type_pillar')}</option>
            <option value="tower" ${pinData.type === 'tower' ? 'selected' : ''}>${t('pin_type_tower')}</option>
            <option value="peak" ${pinData.type === 'peak' ? 'selected' : ''}>${t('pin_type_peak')}</option>
            <option value="coast" ${pinData.type === 'coast' ? 'selected' : ''}>${t('pin_type_coast')}</option>
            <option value="other" ${pinData.type === 'other' ? 'selected' : ''}>${t('pin_type_generic')}</option>
          </select>
        </div>

        <div class="form-group">
          <label>${t('pin_method')}</label>
          <select id="pin-method" class="form-control">
            <option value="marco_construido" ${pinData.method === 'marco_construido' ? 'selected' : ''}>${t('pin_method_constructed')}</option>
            <option value="spyglass" ${pinData.method === 'spyglass' ? 'selected' : ''}>${t('pin_method_spyglass')}</option>
            <option value="contagem" ${pinData.method === 'contagem' ? 'selected' : ''}>${t('pin_method_tile_count')}</option>
            <option value="pixel" ${pinData.method === 'pixel' ? 'selected' : ''}>${t('pin_method_estimation')}</option>
          </select>
        </div>

        <div class="form-group">
          <label>${t('pin_uncertainty')}</label>
          <input type="number" id="pin-uncertainty" class="form-control" value="${pinData.uncertainty_tiles ?? 2}" min="0" max="50" />
        </div>

        <div class="form-group">
          <label>${t('pin_notes')}</label>
          <input type="text" id="pin-notes" class="form-control" value="${pinData.notes ?? ''}" placeholder="${t('pin_notes_placeholder')}" />
        </div>

        ${
          isCartographer
            ? `
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #fbbf24; cursor: pointer; margin-bottom: 8px;">
            <input type="checkbox" id="pin-validated" ${pinData.validated ? 'checked' : ''} style="accent-color: #f59e0b;" />
            <span>${t('pin_status_validated')}</span>
          </label>
        `
            : ''
        }

        <div class="modal-footer">
          ${pinData.id ? `<button id="btn-modal-delete" class="btn" style="color: #ef4444; margin-right: auto;">${t('btn_delete_pin')}</button>` : ''}
          <button id="btn-modal-cancel" class="btn">${t('btn_cancel')}</button>
          <button id="btn-modal-save" class="btn btn-gold">${t('btn_save_pin')}</button>
        </div>
      </div>
    `;

    this.backdrop.style.display = 'flex';

    this.backdrop.querySelector('#btn-modal-close')?.addEventListener('click', () => this.close());
    this.backdrop.querySelector('#btn-modal-cancel')?.addEventListener('click', () => this.close());

    this.backdrop.querySelector('#btn-modal-delete')?.addEventListener('click', () => {
      if (pinData.id) {
        this.pinManager.deletePin(pinData.id);
        this.close();
      }
    });

    this.backdrop.querySelector('#btn-modal-save')?.addEventListener('click', () => {
      const x = parseFloat((this.backdrop.querySelector('#pin-x') as HTMLInputElement).value) || 0;
      const y = parseFloat((this.backdrop.querySelector('#pin-y') as HTMLInputElement).value) || 0;
      const zVal = (this.backdrop.querySelector('#pin-z') as HTMLInputElement).value.trim();
      const z = zVal === '' ? null : parseFloat(zVal);
      const lockAltitude = (this.backdrop.querySelector('#pin-lock-altitude') as HTMLInputElement)?.checked ?? false;

      const type = (this.backdrop.querySelector('#pin-type') as HTMLSelectElement).value as PinType;
      const method = (this.backdrop.querySelector('#pin-method') as HTMLSelectElement).value as PinMethod;
      const uncertainty_tiles = parseInt((this.backdrop.querySelector('#pin-uncertainty') as HTMLInputElement).value, 10) || 0;
      const notes = (this.backdrop.querySelector('#pin-notes') as HTMLInputElement).value.trim();

      const chkVal = this.backdrop.querySelector('#pin-validated') as HTMLInputElement;
      const validated = chkVal ? chkVal.checked : (pinData.validated ?? false);

      const saved = this.pinManager.savePin({
        id: pinData.id,
        x,
        y,
        z,
        type,
        method,
        uncertainty_tiles,
        notes,
        validated,
        lockAltitude,
        author: pinData.author || 'Cartógrafo',
      });

      this.close();
      if (this.onSaveCallback) {
        this.onSaveCallback(saved);
      }
    });
  }

  public close(): void {
    this.backdrop.style.display = 'none';
    this.currentPin = null;
  }
}
