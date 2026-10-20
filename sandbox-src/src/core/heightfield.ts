// ==============================================================================
// JACKAL SANDBOX — GERENCIADOR DE HEIGHTFIELD EM BLOCOS
// Armazenamento esparso em chunks, regras de terreno, interpolação matemática O(1)
// ==============================================================================

import {
  CONFIG,
  cellToChunkCoords,
  tileToCell,
} from '../config';
import {
  CellDelta,
  CellState,
  ChunkData,
  ConfidenceLevel,
  FieldVisit,
  ModelingTool,
  BrushFalloff,
  MapPin,
} from './types';
import { HistoryManager } from './history-manager';
import { BrushEngine, ApplyStrokeOptions, StrokeResult } from './brush-engine';

export class HeightfieldManager {
  /** Chunks carregados na memória: chave "chunkX,chunkY" */
  private chunks: Map<string, ChunkData> = new Map();

  /** Registro de chaves de chunks conhecidos/tocados durante a sessão ativa */
  private sessionChunks: Set<string> = new Set();

  /** Folhas de 100x100 tiles trancadas pelo Cartógrafo (ex: 'N0-L0') */
  private lockedSheets: Set<string> = new Set();

  /** Pinos medidos indexados por coordenadas de célula para restrições fortes */
  private pinAnchorMap: Map<string, MapPin> = new Map();

  /** Rastreamento de visitas distintas por célula: cellKey -> Set<string> visitIds */
  private cellVisitsMap: Map<string, Set<string>> = new Map();

  /** Gerenciador de histórico isolado */
  private historyManager = new HistoryManager(80);

  /** Motor de pincel desacoplado */
  private brushEngine: BrushEngine;

  constructor() {
    this.brushEngine = new BrushEngine(this);
  }

  /** Chave única para célula */
  public static cellKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`;
  }

  public isSheetLocked(sheetId: string): boolean {
    return this.lockedSheets.has(sheetId);
  }

  public toggleSheetLock(sheetId: string): boolean {
    if (this.lockedSheets.has(sheetId)) {
      this.lockedSheets.delete(sheetId);
      return false;
    } else {
      this.lockedSheets.add(sheetId);
      return true;
    }
  }

  public setSheetLock(sheetId: string, locked: boolean): void {
    if (locked) this.lockedSheets.add(sheetId);
    else this.lockedSheets.delete(sheetId);
  }

  public getLockedSheets(): string[] {
    return Array.from(this.lockedSheets);
  }

  public loadLockedSheets(sheets: string[]): void {
    this.lockedSheets = new Set(sheets || []);
  }

  public isCellLocked(cellX: number, cellY: number, sheetId?: string): boolean {
    if (sheetId && this.lockedSheets.has(sheetId)) return true;
    const { chunkX, chunkY, localCellX, localCellY } = cellToChunkCoords(cellX, cellY);
    const key = `${chunkX},${chunkY}`;
    const chunk = this.chunks.get(key);
    if (!chunk) return false;
    const idx = localCellY * CONFIG.CHUNK_SIZE_CELLS + localCellX;
    return chunk.locked[idx] === 1;
  }

  /** Verifica se o mapa possui qualquer dado desenhado para fins de backup automático */
  public hasAnyData(): boolean {
    const S = CONFIG.CHUNK_SIZE_CELLS;
    for (const chunk of this.chunks.values()) {
      for (let i = 0; i < S * S; i++) {
        if (chunk.states[i] !== CellState.UNKNOWN) return true;
      }
    }
    return false;
  }


  /** Registra ou atualiza pinos conhecidos como âncoras e propaga confiança MEASURED */
  public updatePinAnchors(pins: MapPin[]): void {
    this.pinAnchorMap.clear();
    for (const pin of pins) {
      if (pin.z !== null) {
        const { cellX, cellY } = tileToCell(pin.x, pin.y);
        this.pinAnchorMap.set(HeightfieldManager.cellKey(cellX, cellY), pin);

        // Se o pino tiver cota e for costa (z=0), fixa como água
        if (pin.type === 'coast' && pin.z === 0) {
          this.setCellDirect(cellX, cellY, 0, CellState.WATER, ConfidenceLevel.MEASURED);
        } else if (pin.z !== null && pin.z >= 0) {
          this.setCellDirect(cellX, cellY, pin.z, CellState.LAND, ConfidenceLevel.MEASURED);
        }

        // Propaga confiança MEASURED no raio de incerteza do pino validado
        if (pin.validated) {
          const uncertaintyCells = Math.max(1, Math.round(pin.uncertainty_tiles / CONFIG.CELL_SIZE_TILES));
          for (let dy = -uncertaintyCells; dy <= uncertaintyCells; dy++) {
            for (let dx = -uncertaintyCells; dx <= uncertaintyCells; dx++) {
              if (dx * dx + dy * dy <= uncertaintyCells * uncertaintyCells) {
                const targetCell = this.getCell(cellX + dx, cellY + dy);
                if (targetCell.state === CellState.LAND) {
                  this.setCellDirect(
                    cellX + dx,
                    cellY + dy,
                    targetCell.height,
                    CellState.LAND,
                    ConfidenceLevel.MEASURED
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  public getPinAnchor(cellX: number, cellY: number): MapPin | undefined {
    return this.pinAnchorMap.get(HeightfieldManager.cellKey(cellX, cellY));
  }

  public registerCellVisit(cellX: number, cellY: number, visitId: string | null): number {
    if (!visitId) return 0;
    const key = HeightfieldManager.cellKey(cellX, cellY);
    let set = this.cellVisitsMap.get(key);
    if (!set) {
      set = new Set<string>();
      this.cellVisitsMap.set(key, set);
    }
    set.add(visitId);
    return set.size;
  }

  public clearCellVisits(cellX: number, cellY: number): void {
    this.cellVisitsMap.delete(HeightfieldManager.cellKey(cellX, cellY));
  }

  /** Obtém ou cria um bloco/chunk sob demanda (começa 100% UNKNOWN) */
  public getOrCreateChunk(chunkX: number, chunkY: number): ChunkData {
    const key = `${chunkX},${chunkY}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      const S = CONFIG.CHUNK_SIZE_CELLS;
      chunk = {
        chunkX,
        chunkY,
        heights: new Float32Array(S * S),
        states: new Uint8Array(S * S),
        confidence: new Uint8Array(S * S),
        locked: new Uint8Array(S * S),
        isDirty: true,
      };
      this.chunks.set(key, chunk);
    }
    this.sessionChunks.add(key);
    return chunk;
  }

  public getCell(cellX: number, cellY: number): {
    height: number;
    state: CellState;
    confidence: ConfidenceLevel;
  } {
    const { chunkX, chunkY, localCellX, localCellY } = cellToChunkCoords(cellX, cellY);
    const key = `${chunkX},${chunkY}`;
    const chunk = this.chunks.get(key);
    if (!chunk) {
      return {
        height: 0.0,
        state: CellState.UNKNOWN,
        confidence: ConfidenceLevel.SPECULATIVE,
      };
    }
    const idx = localCellY * CONFIG.CHUNK_SIZE_CELLS + localCellX;
    return {
      height: chunk.heights[idx],
      state: chunk.states[idx] as CellState,
      confidence: chunk.confidence[idx] as ConfidenceLevel,
    };
  }

  public setCellDirect(
    cellX: number,
    cellY: number,
    height: number,
    state: CellState,
    confidence: ConfidenceLevel
  ): void {
    const { chunkX, chunkY, localCellX, localCellY } = cellToChunkCoords(cellX, cellY);
    const chunk = this.getOrCreateChunk(chunkX, chunkY);
    const idx = localCellY * CONFIG.CHUNK_SIZE_CELLS + localCellX;

    const clampedHeight = state === CellState.WATER ? 0.0 : Math.max(0.0, height);
    chunk.heights[idx] = clampedHeight;
    chunk.states[idx] = state;
    chunk.confidence[idx] = confidence;
    chunk.isDirty = true;
  }

  /**
   * Consulta matemática O(1) de altitude interpolada na superfície em coordenadas contínuas de tile.
   * Elimina completamente raycast contra a malha 3D na CPU!
   */
  public getInterpolatedHeightAtTile(tileX: number, tileY: number): number {
    const cellSize = CONFIG.CELL_SIZE_TILES;
    const rawCellX = tileX / cellSize;
    const rawCellY = tileY / cellSize;

    const c0X = Math.floor(rawCellX);
    const c0Y = Math.floor(rawCellY);
    const u = rawCellX - c0X;
    const v = rawCellY - c0Y;

    const h00 = this.getEffectiveCellHeight(c0X, c0Y);
    const h10 = this.getEffectiveCellHeight(c0X + 1, c0Y);
    const h01 = this.getEffectiveCellHeight(c0X, c0Y + 1);
    const h11 = this.getEffectiveCellHeight(c0X + 1, c0Y + 1);

    // Interpolação bilinear contínua
    const top = h00 * (1 - u) + h10 * u;
    const bottom = h01 * (1 - u) + h11 * u;
    return top * (1 - v) + bottom * v;
  }

  private getEffectiveCellHeight(cellX: number, cellY: number): number {
    const cell = this.getCell(cellX, cellY);
    if (cell.state === CellState.LAND) return cell.height;
    return 0.0;
  }

  public getNeighborhoodLandAverage(cellX: number, cellY: number): number | null {
    let sum = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = this.getCell(cellX + dx, cellY + dy);
        if (neighbor.state === CellState.LAND) {
          sum += neighbor.height;
          count++;
        }
      }
    }
    return count > 0 ? sum / count : null;
  }

  /** Limpa completamente os dados carregados na memória */
  public clear(): void {
    this.chunks.clear();
    this.sessionChunks.clear();
    this.lockedSheets.clear();
    this.pinAnchorMap.clear();
    this.cellVisitsMap.clear();
    this.historyManager.clear();
  }

  /** Aplica stroke e registra no histórico */
  public applyStroke(options: ApplyStrokeOptions): StrokeResult {
    const result = this.brushEngine.applyStroke(options);
    if (result.touchedCount > 0) {
      this.historyManager.pushAction({
        id: `act-${Date.now()}`,
        tool: options.tool,
        deltas: result.deltas,
      });
    }
    return result;
  }

  /** Desfaz a última ação */
  public undo(): string[] {
    const action = this.historyManager.popUndo();
    if (!action) return [];

    const dirtyKeys = new Set<string>();
    for (const d of action.deltas) {
      const chunk = this.chunks.get(d.chunkKey);
      if (chunk) {
        chunk.heights[d.index] = d.oldHeight;
        chunk.states[d.index] = d.oldState;
        chunk.confidence[d.index] = d.oldConfidence;
        if (d.oldLocked !== undefined) {
          chunk.locked[d.index] = d.oldLocked ? 1 : 0;
        }
        chunk.isDirty = true;
        dirtyKeys.add(d.chunkKey);
      }
    }
    return Array.from(dirtyKeys);
  }

  /** Refaz a última ação desfeita */
  public redo(): string[] {
    const action = this.historyManager.popRedo();
    if (!action) return [];

    const dirtyKeys = new Set<string>();
    for (const d of action.deltas) {
      const chunk = this.chunks.get(d.chunkKey);
      if (chunk) {
        chunk.heights[d.index] = d.newHeight;
        chunk.states[d.index] = d.newState;
        chunk.confidence[d.index] = d.newConfidence;
        if (d.newLocked !== undefined) {
          chunk.locked[d.index] = d.newLocked ? 1 : 0;
        }
        chunk.isDirty = true;
        dirtyKeys.add(d.chunkKey);
      }
    }
    return Array.from(dirtyKeys);
  }

  public getAllChunks(): IterableIterator<ChunkData> {
    return this.chunks.values();
  }

  public getSessionChunks(): Set<string> {
    return this.sessionChunks;
  }

  public markChunkTouched(chunkX: number, chunkY: number): void {
    this.sessionChunks.add(`${chunkX},${chunkY}`);
  }

  public getKnownBounds(): { minCellX: number; maxCellX: number; minCellY: number; maxCellY: number } | null {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let found = false;

    const S = CONFIG.CHUNK_SIZE_CELLS;
    for (const chunk of this.chunks.values()) {
      const startCX = chunk.chunkX * S;
      const startCY = chunk.chunkY * S;

      for (let ly = 0; ly < S; ly++) {
        for (let lx = 0; lx < S; lx++) {
          const idx = ly * S + lx;
          if (chunk.states[idx] !== CellState.UNKNOWN) {
            found = true;
            const cx = startCX + lx;
            const cy = startCY + ly;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
          }
        }
      }
    }
    if (!found) return null;
    return { minCellX: minX, maxCellX: maxX, minCellY: minY, maxCellY: maxY };
  }

  public extractSubgrid(minCellX: number, maxCellX: number, minCellY: number, maxCellY: number) {
    const width = maxCellX - minCellX + 1;
    const height = maxCellY - minCellY + 1;
    const heights = new Float32Array(width * height);
    const states = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = this.getCell(minCellX + x, minCellY + y);
        heights[y * width + x] = cell.height;
        states[y * width + x] = cell.state;
      }
    }
    return { width, height, minCellX, minCellY, heights, states };
  }
}
