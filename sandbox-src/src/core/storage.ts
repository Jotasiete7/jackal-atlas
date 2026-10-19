// ==============================================================================
// JACKAL SANDBOX — ARMAZENAMENTO LOCAL-FIRST E PREPARAÇÃO SUPABASE
// Persistência em IndexedDB, snapshots versionados e contrato de sincronização
// ==============================================================================

import { HeightfieldManager } from './heightfield';
import { PinManager } from './pins';
import { VisitManager } from './visits';
import { SerializedSnapshot, SnapshotMeta, CellState, ConfidenceLevel } from './types';
import { CONFIG } from '../config';

const DB_NAME = 'JackalSandboxDB';
const DB_VERSION = 2;
const STORE_SNAPSHOTS = 'snapshots';
const STORE_AUTOSAVE = 'autosave';

export class StorageManager {
  private db: IDBDatabase | null = null;
  private isReady = false;
  private initPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.ensureDB();
  }

  public async ensureDB(): Promise<IDBDatabase | null> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'meta.id' });
        }
        if (!db.objectStoreNames.contains(STORE_AUTOSAVE)) {
          db.createObjectStore(STORE_AUTOSAVE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        resolve(this.db);
      };

      request.onerror = () => {
        console.warn('Falha ao abrir IndexedDB, operando em memória temporária.');
        resolve(null);
      };
    });

    return this.initPromise;
  }

  /**
   * Serializa o estado atual do heightfield, pinos e visita para snapshot
   */
  public serializeCurrentState(
    heightfield: HeightfieldManager,
    pins: PinManager,
    visits: VisitManager,
    snapshotName: string,
    isDaily = false
  ): SerializedSnapshot {
    const chunksData: SerializedSnapshot['chunks'] = [];

    for (const chunk of heightfield.getAllChunks()) {
      // Salva apenas se tiver ao menos uma célula conhecida para economizar espaço
      let hasData = false;
      const S = CONFIG.CHUNK_SIZE_CELLS;
      for (let i = 0; i < S * S; i++) {
        if (chunk.states[i] !== CellState.UNKNOWN) {
          hasData = true;
          break;
        }
      }

      if (hasData) {
        chunksData.push({
          chunkX: chunk.chunkX,
          chunkY: chunk.chunkY,
          heights: Array.from(chunk.heights),
          states: Array.from(chunk.states),
          confidence: Array.from(chunk.confidence),
          locked: Array.from(chunk.locked),
        });
      }
    }

    const currentPins = pins.getAll();
    const currentVisit = visits.getCurrentVisit();

    const meta: SnapshotMeta = {
      id: `snap-${Date.now()}`,
      name: snapshotName || `Snapshot ${new Date().toLocaleString()}`,
      created_at: new Date().toISOString(),
      is_daily: isDaily,
      author: currentVisit.author,
      chunk_count: chunksData.length,
      pin_count: currentPins.length,
    };

    return {
      meta,
      chunks: chunksData,
      pins: currentPins,
      visit: currentVisit,
      lockedSheets: heightfield.getLockedSheets(),
    };
  }

  /**
   * Restaura o estado completo a partir de um snapshot serializado
   */
  public restoreSnapshot(
    snapshot: SerializedSnapshot,
    heightfield: HeightfieldManager,
    pins: PinManager,
    visits: VisitManager
  ): void {
    heightfield.clear();

    const S = CONFIG.CHUNK_SIZE_CELLS;
    for (const chunkItem of snapshot.chunks) {
      const chunk = heightfield.getOrCreateChunk(chunkItem.chunkX, chunkItem.chunkY);
      for (let i = 0; i < S * S; i++) {
        chunk.heights[i] = chunkItem.heights[i] || 0;
        chunk.states[i] = (chunkItem.states[i] ?? CellState.UNKNOWN) as CellState;
        chunk.confidence[i] = (chunkItem.confidence[i] ?? ConfidenceLevel.SPECULATIVE) as ConfidenceLevel;
        chunk.locked[i] = chunkItem.locked ? (chunkItem.locked[i] || 0) : 0;
      }
      chunk.isDirty = true;
    }

    if (snapshot.lockedSheets) {
      heightfield.loadLockedSheets(snapshot.lockedSheets);
    }

    if (snapshot.pins) {
      const cleanPins = snapshot.pins.filter((p) => p.id !== 'pin-spawn-zero');
      pins.loadPins(cleanPins);
      heightfield.updatePinAnchors(cleanPins);
    }

    if (snapshot.visit) {
      visits.updateVisitDetails(snapshot.visit);
    }
  }

  /**
   * Mescla de forma não-destrutiva os chunks oficiais da nuvem com os chunks locais:
   * - Nunca apaga chunks que existem na nuvem mas não foram tocados localmente.
   * - Nunca sobrescreve células mapeadas na nuvem com células UNKNOWN (0) locais.
   * - Preserva células travadas (locked = 1) da nuvem caso o estado local não esteja explicitamente travado.
   */
  public mergeChunksNonDestructive(
    cloudChunks: SerializedSnapshot['chunks'],
    localChunks: SerializedSnapshot['chunks']
  ): SerializedSnapshot['chunks'] {
    const S = CONFIG.CHUNK_SIZE_CELLS;
    const total = S * S;
    const mergedMap = new Map<string, SerializedSnapshot['chunks'][0]>();

    for (const c of cloudChunks || []) {
      mergedMap.set(`${c.chunkX},${c.chunkY}`, {
        chunkX: c.chunkX,
        chunkY: c.chunkY,
        heights: [...(c.heights || [])],
        states: [...(c.states || [])],
        confidence: [...(c.confidence || [])],
        locked: c.locked ? [...c.locked] : new Array(total).fill(0),
      });
    }

    for (const l of localChunks || []) {
      const key = `${l.chunkX},${l.chunkY}`;
      const existing = mergedMap.get(key);
      if (!existing) {
        mergedMap.set(key, {
          chunkX: l.chunkX,
          chunkY: l.chunkY,
          heights: [...(l.heights || [])],
          states: [...(l.states || [])],
          confidence: [...(l.confidence || [])],
          locked: l.locked ? [...l.locked] : new Array(total).fill(0),
        });
      } else {
        for (let i = 0; i < total; i++) {
          const cState = existing.states[i] ?? CellState.UNKNOWN;
          const cLocked = existing.locked ? (existing.locked[i] || 0) : 0;
          const lState = l.states[i] ?? CellState.UNKNOWN;
          const lLocked = l.locked ? (l.locked[i] || 0) : 0;

          // 1. Se a célula local está UNKNOWN (não esculpida localmente), preserva a célula da nuvem
          if (lState === CellState.UNKNOWN && cState !== CellState.UNKNOWN) {
            continue;
          }

          // 2. Se a célula na nuvem está travada (locked=1) e localmente não está travada, preserva a trava oficial
          if (cLocked === 1 && lLocked === 0) {
            continue;
          }

          existing.heights[i] = l.heights[i] || 0;
          existing.states[i] = lState;
          existing.confidence[i] = l.confidence[i] ?? ConfidenceLevel.SPECULATIVE;
          if (existing.locked) {
            existing.locked[i] = lLocked;
          }
        }
      }
    }

    return Array.from(mergedMap.values());
  }

  /** Grava o estado atual como autosave contínuo no IndexedDB */
  public async saveAutosave(
    heightfield: HeightfieldManager,
    pins: PinManager,
    visits: VisitManager
  ): Promise<void> {
    const db = await this.ensureDB();
    if (!db) return;
    const snap = this.serializeCurrentState(heightfield, pins, visits, 'Autosave');
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUTOSAVE, 'readwrite');
      const store = tx.objectStore(STORE_AUTOSAVE);
      const req = store.put({ key: 'current_autosave', snapshot: snap, timestamp: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Carrega o autosave do IndexedDB se existir */
  public async loadAutosave(): Promise<SerializedSnapshot | null> {
    const db = await this.ensureDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_AUTOSAVE, 'readonly');
      const store = tx.objectStore(STORE_AUTOSAVE);
      const req = store.get('current_autosave');
      req.onsuccess = () => {
        if (req.result && req.result.snapshot) {
          resolve(req.result.snapshot);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  }

  /** Salva snapshot no IndexedDB */
  public async saveSnapshot(snapshot: SerializedSnapshot): Promise<void> {
    const db = await this.ensureDB();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Lista metadados de todos os snapshots salvos */
  public async listSnapshots(): Promise<SnapshotMeta[]> {
    const db = await this.ensureDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as SerializedSnapshot[];
        const metas = (items || []).map((s) => s.meta);
        metas.sort((a, b) => b.created_at.localeCompare(a.created_at));
        resolve(metas);
      };
      req.onerror = () => resolve([]);
    });
  }

  /** Carrega um snapshot pelo ID */
  public async loadSnapshotById(id: string): Promise<SerializedSnapshot | null> {
    const db = await this.ensureDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  /** Exclui um snapshot pelo ID */
  public async deleteSnapshot(id: string): Promise<void> {
    const db = await this.ensureDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  /** Exporta snapshot atual em formato JSON para download */
  public exportSnapshotAsJSON(snapshot: SerializedSnapshot): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `jackal-sandbox-${snapshot.meta.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /** Importa snapshot de arquivo JSON */
  public importSnapshotFromFile(file: File): Promise<SerializedSnapshot> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as SerializedSnapshot;
          if (!parsed.chunks || !parsed.meta) {
            throw new Error('Arquivo de relevo inválido ou corrompido.');
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Erro na leitura do arquivo'));
      reader.readAsText(file);
    });
  }
}
