import { CONFIG, cellToChunkCoords, tileToCell, getTileSheetName } from '../config';
import {
  BrushFalloff,
  CellDelta,
  CellState,
  ConfidenceLevel,
  FieldVisit,
  MapPin,
  ModelingTool,
  UserRole,
} from './types';
import { HeightfieldManager } from './heightfield';

export interface ApplyStrokeOptions {
  tool: ModelingTool;
  centerTileX: number;
  centerTileY: number;
  radiusTiles: number;
  intensity: number;
  falloff: BrushFalloff;
  flattenTargetZ?: number;
  currentVisit: FieldVisit | null;
  enforceVisitRange?: boolean;
  protectWater?: boolean;
  lockAction?: 'lock' | 'unlock';
  userRole?: UserRole;
}


export interface StrokeResult {
  deltas: CellDelta[];
  affectedChunks: string[];
  touchedCount: number;
}

export class BrushEngine {
  private heightfield: HeightfieldManager;

  constructor(heightfield: HeightfieldManager) {
    this.heightfield = heightfield;
  }

  /**
   * Calcula o decaimento de intensidade da pincelada com base na distância da estação de medição ativa.
   */
  public calculateStationWeight(
    tileX: number,
    tileY: number,
    visit: FieldVisit | null,
    enforceRange = true
  ): number {
    if (!visit || !enforceRange) return 1.0;
    const dx = tileX - visit.station_x;
    const dy = tileY - visit.station_y;
    const distTiles = Math.sqrt(dx * dx + dy * dy);
    const maxRange = visit.range_tiles || CONFIG.DEFAULT_VISIT_RANGE_TILES;

    if (distTiles >= maxRange) {
      return 0.0;
    }

    // Força consistente e uniforme em todo o campo de visão da estação.
    // Transição suave apenas nos 10% finais do raio para evitar borda abrupta no perímetro.
    const edgeMargin = Math.max(4.0, maxRange * 0.10);
    const innerRadius = maxRange - edgeMargin;
    if (distTiles <= innerRadius) {
      return 1.0;
    }
    const t = (distTiles - innerRadius) / edgeMargin;
    return 0.5 * (1.0 + Math.cos(Math.PI * t));
  }

  /**
   * Aplica uma pincelada contínua no relevo, respeitando restrições rígidas,
   * regras invioláveis de água e atualizando confiança multi-visita.
   */
  public applyStroke(options: ApplyStrokeOptions): StrokeResult {
    const {
      tool,
      centerTileX,
      centerTileY,
      radiusTiles,
      intensity,
      falloff,
      flattenTargetZ = 10,
      currentVisit,
      enforceVisitRange = true,
      protectWater = true,
      lockAction = 'lock',
      userRole = 'explorer',
    } = options;

    // Papel 'scout' (Batedor) não pode esculpir relevo ou trancar, apenas inspecionar e marcar pinos
    if (userRole === 'scout') {
      return { deltas: [], affectedChunks: [], touchedCount: 0 };
    }

    const deltas: CellDelta[] = [];
    const affectedChunks = new Set<string>();

    const cellSize = CONFIG.CELL_SIZE_TILES;
    const effectiveRadius = falloff === 'smooth'
      ? Math.max(radiusTiles, cellSize * 2.5)
      : radiusTiles;
    const searchRadiusTiles = effectiveRadius + (falloff === 'smooth' ? cellSize * 1.5 : 0);
    const radiusCells = Math.ceil(searchRadiusTiles / cellSize);
    const centerCell = tileToCell(centerTileX, centerTileY);

    for (let cy = centerCell.cellY - radiusCells; cy <= centerCell.cellY + radiusCells; cy++) {
      for (let cx = centerCell.cellX - radiusCells; cx <= centerCell.cellX + radiusCells; cx++) {
        // Alinhamento exato com a posição do vértice no PlaneGeometry
        const cellTileX = cx * cellSize;
        const cellTileY = cy * cellSize;

        const distTiles = Math.hypot(cellTileX - centerTileX, cellTileY - centerTileY);
        if (distTiles > searchRadiusTiles) continue;

        let brushWeight = 1.0;
        if (distTiles <= effectiveRadius) {
          if (falloff === 'smooth') {
            const t = Math.min(1.0, distTiles / effectiveRadius);
            // Polinômio quártico de Wyvill (curva em sino com topo arredondado e borda suave):
            // Derivada em t=0 é 0 (topo esférico, nunca pontiagudo) e em t=1 é 0
            brushWeight = (1.0 - t * t) * (1.0 - t * t);
          }
        } else {
          // Zona da saia de transição (além do raio do pincel): peso de elevação zero
          brushWeight = 0.0;
        }

        // A ferramenta Borracha ('eraser') ignora restrição de raio da estação para permitir limpar erros em qualquer lugar
        const stationWeight = tool === 'eraser'
          ? 1.0
          : this.calculateStationWeight(cellTileX, cellTileY, currentVisit, enforceVisitRange);

        // Se estiver fora do raio de alcance da estação ativa, não modifica nem vaza células fora do anel
        if (stationWeight <= 0.0001) {
          continue;
        }

        const totalWeight = brushWeight * stationWeight;

        // Verifica se há âncora fixa de pino medido nesta célula
        // ATENÇÃO: Só congela a altitude se lockAltitude === true! Caso contrário o terreno pode ser esculpido livremente!
        const anchorPin = this.heightfield.getPinAnchor(cx, cy);
        if (anchorPin && anchorPin.z !== null && anchorPin.validated && anchorPin.lockAltitude === true) {
          continue; // Pino com restrição rígida de cota
        }

        const { chunkX, chunkY, localCellX, localCellY, chunkKey } = cellToChunkCoords(cx, cy);
        const chunk = this.heightfield.getOrCreateChunk(chunkX, chunkY);
        const idx = localCellY * CONFIG.CHUNK_SIZE_CELLS + localCellX;

        // Verifica se a célula ou a folha inteira de 100x100 tiles está trancada pelo Cartógrafo
        const sheetId = getTileSheetName(cellTileX, cellTileY);
        const isLocked = chunk.locked[idx] === 1 || this.heightfield.isSheetLocked(sheetId);

        // Se estiver trancada e a ferramenta NÃO for o cadeado do Cartógrafo, ela é 100% imune!
        if (isLocked && tool !== 'lock') {
          continue;
        }

        const oldHeight = chunk.heights[idx];
        const oldState = chunk.states[idx] as CellState;
        const oldConfidence = chunk.confidence[idx] as ConfidenceLevel;
        const oldLocked = chunk.locked[idx] === 1;

        let newHeight = oldHeight;
        let newState = oldState;
        let newConfidence = oldConfidence;
        let newLocked = oldLocked;

        // Se está na saia de transição e a célula é UNKNOWN, ancora ela suavemente em LAND no nível 0m
        // Isso elimina pontas triangulares recortadas e artefatos na base da colina (somente DENTRO da estação)
        if (totalWeight <= 0.001) {
          if (
            distTiles <= searchRadiusTiles &&
            falloff === 'smooth' &&
            (tool === 'raise' || tool === 'flatten') &&
            oldState === CellState.UNKNOWN
          ) {
            newState = CellState.LAND;
            newHeight = 0.0;
            newConfidence = ConfidenceLevel.SPECULATIVE;
          } else {
            continue;
          }
        } else {
          // Rastreamento de visitas independentes para elevar confiança
          const visitsCount = this.heightfield.registerCellVisit(cx, cy, currentVisit ? currentVisit.id : null);
          if (visitsCount >= 2 && oldConfidence === ConfidenceLevel.SPECULATIVE) {
            newConfidence = ConfidenceLevel.ESTIMATED;
          }
        }

        switch (tool) {
          case 'raise': {
            if (oldState === CellState.WATER) break; // Água é estritamente nível zero

            const increment = intensity * totalWeight;
            if (oldState === CellState.UNKNOWN) {
              newState = CellState.LAND;
              newHeight = Math.max(0.0, increment);
              if (newConfidence !== ConfidenceLevel.ESTIMATED && newConfidence !== ConfidenceLevel.MEASURED) {
                newConfidence = ConfidenceLevel.SPECULATIVE;
              }
            } else if (oldState === CellState.LAND) {
              newHeight = Math.max(0.0, oldHeight + increment);
            }
            break;
          }

          case 'lower': {
            if (oldState === CellState.WATER) break;
            if (oldState === CellState.LAND) {
              const decrement = intensity * totalWeight;
              // Terra NUNCA fica abaixo de 0 (clamp em 0)
              newHeight = Math.max(0.0, oldHeight - decrement);
            }
            break;
          }

          case 'smooth': {
            if (oldState !== CellState.LAND) break;

            const avg = this.heightfield.getNeighborhoodLandAverage(cx, cy);
            if (avg !== null) {
              const blendFactor = Math.min(1.0, 0.4 * totalWeight);
              newHeight = Math.max(0.0, oldHeight + (avg - oldHeight) * blendFactor);
            }
            break;
          }

          case 'flatten': {
            if (oldState === CellState.WATER) break;
            const targetZ = Math.max(0.0, flattenTargetZ);
            const blendFactor = Math.min(1.0, 0.5 * totalWeight);

            if (oldState === CellState.UNKNOWN) {
              newState = CellState.LAND;
              newHeight = targetZ;
              if (newConfidence !== ConfidenceLevel.ESTIMATED && newConfidence !== ConfidenceLevel.MEASURED) {
                newConfidence = ConfidenceLevel.SPECULATIVE;
              }
            } else if (oldState === CellState.LAND) {
              newHeight = Math.max(0.0, oldHeight + (targetZ - oldHeight) * blendFactor);
            }
            break;
          }

          case 'water': {
            // Se proteção de água/costa estiver ativa, não afoga terra já modelada por acidente
            if (protectWater && oldState === CellState.LAND && oldHeight > 0.0) {
              break;
            }
            newState = CellState.WATER;
            newHeight = 0.0;
            break;
          }

          case 'eraser': {
            // Se proteção de água/costa estiver ativa, borracha não apaga água confirmada
            if (protectWater && oldState === CellState.WATER) {
              break;
            }
            newState = CellState.UNKNOWN;
            newHeight = 0.0;
            newConfidence = ConfidenceLevel.SPECULATIVE;
            this.heightfield.clearCellVisits(cx, cy);
            break;
          }

          case 'lock': {
            const targetLock = lockAction === 'unlock' ? 0 : 1;
            newLocked = targetLock === 1;
            if (newLocked && newConfidence !== ConfidenceLevel.MEASURED) {
              newConfidence = ConfidenceLevel.MEASURED;
            }
            break;
          }

          default:
            break;
        }

        // Se houve modificação na célula, atualiza dados e registra delta
        if (
          Math.abs(newHeight - oldHeight) > 0.0001 ||
          newState !== oldState ||
          newConfidence !== oldConfidence ||
          newLocked !== oldLocked
        ) {
          chunk.heights[idx] = newHeight;
          chunk.states[idx] = newState;
          chunk.confidence[idx] = newConfidence;
          chunk.locked[idx] = newLocked ? 1 : 0;
          chunk.isDirty = true;
          affectedChunks.add(chunkKey);

          // Se há um pino móvel (sem trava rígida) nesta célula, sincroniza a cota dele
          if (anchorPin && anchorPin.lockAltitude !== true) {
            anchorPin.z = newHeight;
          }

          deltas.push({
            chunkKey,
            index: idx,
            oldHeight,
            newHeight,
            oldState,
            newState,
            oldConfidence,
            newConfidence,
            oldLocked,
            newLocked,
          });
        }
      }
    }

    return {
      deltas,
      affectedChunks: Array.from(affectedChunks),
      touchedCount: deltas.length,
    };
  }
}
