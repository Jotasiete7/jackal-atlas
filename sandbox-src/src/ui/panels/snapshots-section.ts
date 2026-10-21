// ==============================================================================
// JACKAL SANDBOX — SEÇÃO DE SNAPSHOTS DE RELEVO E HISTÓRICO DA NUVEM
// ==============================================================================

import { StorageManager } from '../../core/storage';
import { HeightfieldManager } from '../../core/heightfield';
import { PinManager } from '../../core/pins';
import { VisitManager } from '../../core/visits';
import { RouteManager } from '../../core/routes';
import { TerrainMeshManager } from '../../renderer/terrain-mesh';
import { ContourRenderer } from '../../renderer/contour-renderer';
import { PinMeshManager } from '../../renderer/pin-mesh';
import { GridMeshManager } from '../../renderer/grid-mesh';
import { ScaleReferenceManager } from '../../renderer/scale-reference';
import { RouteMeshManager } from '../../renderer/route-mesh';
import { SupabaseSyncManager } from '../../core/supabase-sync';
import { ICONS } from '../icons';
import { t } from '../../i18n';
import { toast } from '../toast';
import { tr } from '../../i18n';

export class SnapshotsSectionUI {
  private container: HTMLElement;
  private storageManager: StorageManager;
  private heightfield: HeightfieldManager;
  private pinManager: PinManager;
  private visitManager: VisitManager;
  private terrainMesh: TerrainMeshManager;
  private contourRenderer: ContourRenderer;
  private pinMesh: PinMeshManager;
  private gridMesh: GridMeshManager;
  private scaleReference: ScaleReferenceManager;
  private routeManager?: RouteManager;
  private routeMesh?: RouteMeshManager;
  private supabaseSync?: SupabaseSyncManager;

  constructor(
    parent: HTMLElement,
    deps: {
      storageManager: StorageManager;
      heightfield: HeightfieldManager;
      pinManager: PinManager;
      visitManager: VisitManager;
      terrainMesh: TerrainMeshManager;
      contourRenderer: ContourRenderer;
      pinMesh: PinMeshManager;
      gridMesh: GridMeshManager;
      scaleReference: ScaleReferenceManager;
      routeManager?: RouteManager;
      routeMesh?: RouteMeshManager;
      supabaseSync?: SupabaseSyncManager;
    }
  ) {
    this.storageManager = deps.storageManager;
    this.heightfield = deps.heightfield;
    this.pinManager = deps.pinManager;
    this.visitManager = deps.visitManager;
    this.terrainMesh = deps.terrainMesh;
    this.contourRenderer = deps.contourRenderer;
    this.pinMesh = deps.pinMesh;
    this.gridMesh = deps.gridMesh;
    this.scaleReference = deps.scaleReference;
    this.routeManager = deps.routeManager;
    this.routeMesh = deps.routeMesh;
    this.supabaseSync = deps.supabaseSync;

    this.container = document.createElement('div');
    parent.appendChild(this.container);

    this.render();
    this.loadSnapshotList();
    this.loadCloudHistory();
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="tool-divider"></div>

      <div class="panel-header">
        <span>${t('panel_snapshots')}</span>
        <span class="badge-tag">${t('badge_history')}</span>
      </div>

      <!-- Salvar Snapshot Local -->
      <div style="display: flex; gap: 4px;">
        <input type="text" id="input-snap-name" class="form-control" placeholder="${t('snapshot_placeholder')}" style="flex: 1;" />
        <button class="btn btn-gold" id="btn-save-snapshot" title="${t('snapshot_placeholder')}">
          ${ICONS.save}
        </button>
      </div>

      <!-- Importação / Exportação JSON -->
      <div style="display: flex; gap: 6px; margin-top: 4px;">
        <button class="btn" id="btn-export-backup" style="flex: 1; font-size: 11px; justify-content: center;" title="${t('btn_download_json')}">
          ⬇️ ${t('btn_download_json')}
        </button>
        <button class="btn" id="btn-import-backup" style="flex: 1; font-size: 11px; justify-content: center;" title="${t('btn_load_json')}">
          📂 ${t('btn_load_json')}
        </button>
        <input type="file" id="file-import-input" accept=".json" style="display: none;" />
      </div>

      <!-- Lista de Snapshots Salvos Localmente -->
      <div style="font-size: 10px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-top: 8px;">
        ${t('badge_history')} (Local):
      </div>
      <div id="snapshot-list" style="display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto; margin-top: 4px;">
        <div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 6px;">${t('no_snapshots')}</div>
      </div>

      <!-- Histórico Oficial na Nuvem (Rollback de Commits) -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
        <span style="font-size: 10px; color: var(--accent-gold); text-transform: uppercase; font-weight: 700;">
          ☁️ ${t('cloud_history_title')}:
        </span>
        <button id="btn-refresh-cloud-history" class="btn" style="padding: 1px 6px; font-size: 9px;" title="${tr('Atualizar histórico', 'Refresh history')}">🔄</button>
      </div>
      <div id="cloud-history-list" style="display: flex; flex-direction: column; gap: 4px; max-height: 140px; overflow-y: auto; margin-top: 4px;">
        <div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 6px;">${t('cloud_history_loading')}</div>
      </div>

      <!-- Zona de Perigo Isolada -->
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(239, 68, 68, 0.3);">
        <button class="btn" id="btn-clear-map" style="width: 100%; font-size: 11px; justify-content: center; color: #f87171; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1);">
          ⚠️ ${t('btn_clear_map')}
        </button>
      </div>
    `;

    this.bindEvents();
  }

  public async loadSnapshotList(): Promise<void> {
    const listEl = this.container.querySelector('#snapshot-list');
    if (!listEl) return;

    const metas = await this.storageManager.listSnapshots();
    if (metas.length === 0) {
      listEl.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 6px;">${t('no_snapshots')}</div>`;
      return;
    }

    listEl.innerHTML = metas
      .map(
        (m) => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 11px;">
          <div style="flex: 1; min-width: 0; padding-right: 6px; overflow: hidden;" title="${m.name}">
            <strong style="color: #f1f5f9; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.name}</strong>
            <div style="font-size: 9px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.author ? `${m.author} · ` : ''}${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div style="display: flex; gap: 3px; align-items: center;">
            <button class="btn btn-restore" data-id="${m.id}" data-name="${m.name}" style="padding: 2px 6px; font-size: 10px; background: rgba(59, 130, 246, 0.2); color: #93c5fd;" title="${t('restore')}">
              ${t('restore')}
            </button>
            <button class="btn btn-dl-snap" data-id="${m.id}" style="padding: 2px 5px; font-size: 10px; color: var(--accent-gold); background: rgba(245, 158, 11, 0.1);" title="${tr('Baixar como JSON', 'Download as JSON')}">
              ⬇️
            </button>
            <button class="btn btn-del-snap" data-id="${m.id}" data-name="${m.name}" style="padding: 2px 5px; font-size: 10px; color: #ef4444; background: rgba(239, 68, 68, 0.1);" title="${tr('Excluir', 'Delete')}">
              🗑️
            </button>
          </div>
        </div>
      `
      )
      .join('');

    listEl.querySelectorAll('.btn-restore').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id')!;
        const snap = await this.storageManager.loadSnapshotById(id);
        if (snap) {
          if (confirm(t('alert_snapshot_restore_confirm'))) {
            await this.createAutoSafetyBackup();
            this.terrainMesh.clear();
            this.storageManager.restoreSnapshot(snap, this.heightfield, this.pinManager, this.visitManager, this.routeManager);
            this.syncSceneAfterRestore();
            toast.success(`${t('alert_snapshot_restored')} (${snap.meta.name})`);
          }
        }
      });
    });

    listEl.querySelectorAll('.btn-dl-snap').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id')!;
        const snap = await this.storageManager.loadSnapshotById(id);
        if (snap) {
          const safeName = `${snap.meta.name.replace(/[/\\?%*:|"<>]/g, '-')}.json`;
          this.storageManager.exportSnapshotAsJSON(snap, safeName);
        }
      });
    });

    listEl.querySelectorAll('.btn-del-snap').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id')!;
        const name = btn.getAttribute('data-name')!;
        if (confirm(`${t('alert_delete_snapshot_confirm')} "${name}"?`)) {
          await this.storageManager.deleteSnapshot(id);
          this.loadSnapshotList();
        }
      });
    });
  }

  public async loadCloudHistory(): Promise<void> {
    const cloudListEl = this.container.querySelector('#cloud-history-list');
    if (!cloudListEl || !this.supabaseSync) return;

    cloudListEl.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 6px;">${t('cloud_history_loading')}</div>`;

    const commits = await this.supabaseSync.fetchReliefCommits(8);
    if (commits.length === 0) {
      cloudListEl.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 6px;">${t('cloud_history_empty')}</div>`;
      return;
    }

    cloudListEl.innerHTML = commits
      .map(
        (c) => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(245, 158, 11, 0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.2); font-size: 11px;">
          <div style="flex: 1; min-width: 0; padding-right: 6px; overflow: hidden;" title="${c.message}">
            <strong style="color: var(--accent-gold); font-family: var(--font-mono); font-size: 11.5px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              v${c.version} · ${c.message}
            </strong>
            <div style="font-size: 9px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${c.author} · ${c.created_at ? new Date(c.created_at).toLocaleDateString() : ''} (${c.chunk_count} chunks)
            </div>
          </div>
          <div>
            <button class="btn btn-rollback" data-ver="${c.version}" style="padding: 2px 7px; font-size: 10px; font-weight: 700; background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); border-color: rgba(245, 158, 11, 0.4);" title="${t('cloud_history_rollback')}">
              ↩ ${t('cloud_history_rollback')}
            </button>
          </div>
        </div>
      `
      )
      .join('');

    cloudListEl.querySelectorAll('.btn-rollback').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ver = Number(btn.getAttribute('data-ver'));
        const confirmMsg = t('cloud_history_confirm', { version: ver });
        if (confirm(confirmMsg)) {
          const res = await this.supabaseSync!.rollbackToCommit(ver, this.heightfield, this.pinManager, this.visitManager);
          if (res.success) {
            this.syncSceneAfterRestore();
            toast.success(tr(`Versão v${ver} restaurada com sucesso na nuvem como v${res.newVersion}!`, `Version v${ver} restored in the cloud as v${res.newVersion}!`), 6000);
            this.loadCloudHistory();
            this.loadSnapshotList();
          } else {
            toast.error(res.message || tr('Falha ao restaurar versão.', 'Failed to restore version.'));
          }
        }
      });
    });
  }

  private async createAutoSafetyBackup(): Promise<void> {
    if (this.heightfield.hasAnyData() || this.pinManager.getAll().length > 0 || (this.routeManager && this.routeManager.getAll().length > 0)) {
      const snapName = `⚡ Auto-Backup (${new Date().toLocaleTimeString()})`;
      const snap = this.storageManager.serializeCurrentState(
        this.heightfield,
        this.pinManager,
        this.visitManager,
        snapName,
        false,
        this.routeManager
      );
      await this.storageManager.saveSnapshot(snap);
      await this.loadSnapshotList();
    }
  }

  private syncSceneAfterRestore(): void {
    this.terrainMesh.updateDirtyChunks();
    this.contourRenderer.requestUpdate();
    this.pinMesh.rebuildPins();
    if (this.routeMesh) {
      this.routeMesh.rebuildAllRoutes();
    }

    const activeVisit = this.visitManager.getCurrentVisit();
    const stationElev = this.heightfield.getInterpolatedHeightAtTile(activeVisit.station_x, activeVisit.station_y);
    this.gridMesh.updateStationRange(activeVisit, stationElev);

    const currentPos = this.scaleReference.getPosition();
    const groundY = this.heightfield.getInterpolatedHeightAtTile(currentPos.tileX, currentPos.tileY);
    this.scaleReference.setExactY(groundY);
  }

  private bindEvents(): void {
    const inputSnap = this.container.querySelector('#input-snap-name') as HTMLInputElement;

    this.container.querySelector('#btn-save-snapshot')?.addEventListener('click', async () => {
      const name = inputSnap.value.trim() || `${tr('Relevo', 'Relief')} ${new Date().toLocaleTimeString()}`;
      const snap = this.storageManager.serializeCurrentState(
        this.heightfield,
        this.pinManager,
        this.visitManager,
        name,
        false,
        this.routeManager
      );
      await this.storageManager.saveSnapshot(snap);
      inputSnap.value = '';
      this.loadSnapshotList();
      toast.success(`${t('alert_snapshot_saved')} (${name})`);
    });

    this.container.querySelector('#btn-refresh-cloud-history')?.addEventListener('click', () => {
      this.loadCloudHistory();
    });

    this.container.querySelector('#btn-export-backup')?.addEventListener('click', async () => {
      const snap = this.storageManager.serializeCurrentState(
        this.heightfield,
        this.pinManager,
        this.visitManager,
        'Backup',
        false,
        this.routeManager
      );
      await this.storageManager.exportSnapshotAsJSON(snap);
    });

    const fileInput = this.container.querySelector('#file-import-input') as HTMLInputElement;
    this.container.querySelector('#btn-import-backup')?.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput?.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        try {
          const snap = await this.storageManager.importSnapshotFromFile(target.files[0]);
          await this.createAutoSafetyBackup();
          this.terrainMesh.clear();
          this.storageManager.restoreSnapshot(snap, this.heightfield, this.pinManager, this.visitManager, this.routeManager);
          this.syncSceneAfterRestore();
          toast.success(`${t('alert_snapshot_restored')} (${snap.meta.name})`);
          target.value = '';
        } catch (err: any) {
          toast.error(t('alert_import_error') + err.message);
        }
      }
    });

    this.container.querySelector('#btn-clear-map')?.addEventListener('click', async () => {
      if (confirm(t('alert_clear_map_confirm'))) {
        await this.createAutoSafetyBackup();
        this.terrainMesh.clear();
        this.heightfield.clear();
        this.pinManager.clear();
        if (this.routeManager) this.routeManager.clear();
        this.pinMesh.rebuildPins();
        if (this.routeMesh) this.routeMesh.rebuildAllRoutes();
        this.syncSceneAfterRestore();
        toast.info(tr('Área de trabalho limpa.', 'Workspace cleared.'));
      }
    });
  }
}
