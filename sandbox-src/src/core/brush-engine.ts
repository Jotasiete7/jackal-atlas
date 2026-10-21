import { CONFIG, cellToChunkCoords, tileToCell, getTileSheetName } from '../config';
import {
  BrushFalloff,
  BrushShape,
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
  shape?: BrushShape;
  ellipseRatio?: number;
  ellipseAngleDeg?: number;
  flattenTargetZ?: number;
  currentVisit: FieldVisit | null;
  enforceVisitRange?: boolean;
  protectWater?: boolean;
  lockAction?: 'lock' | 'unlock';
  userRole?: UserRole;
}

export interface ApplyRampOptions {
  startTileX: number;
  startTileY: number;
  startHeight: number;
  endTileX: number;
  endTileY: number;
  endHeight: number;
  widthTiles: number;
  currentVisit: FieldVisit | null;
  enforceVisitRange?: boolean;
  protectWater?: boolean;
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
      shape = 'circle',
      ellipseRatio = 1.0,
      ellipseAngleDeg = 0,
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

        const dx = cellTileX - centerTileX;
        const dy = cellTileY - centerTileY;

        let distTiles = Math.hypot(dx, dy);
        if (shape === 'ellipse' && ellipseRatio && ellipseRatio > 1.0) {
          const rad = ((ellipseAngleDeg || 0) * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const rx = dx * cos + dy * sin;
          const ry = (-dx * sin + dy * cos) * ellipseRatio;
          distTiles = Math.hypot(rx, ry);
        }

        if (distTiles > searchRadiusTiles) continue;

        let brushWeight = 1.0;
        if (distTiles <= effectiveRadius) {
          const t = Math.min(1.0, distTiles / effectiveRadius);
          switch (falloff) {
            case 'dome':
              // Curva semiesférica / bolha convexa (Cúpula)
              brushWeight = Math.sqrt(Math.max(0, 1.0 - t * t));
              break;
            case 'bowl':
              // Curva côncava de bacia (fundo largo plano, elevação suave nas bordas)
              brushWeight = Math.pow(Math.max(0, 1.0 - Math.sqrt(t)), 2);
              break;
            case 'peak':
              // Cone linear pontiagudo
              brushWeight = Math.max(0, 1.0 - t);
              break;
            case 'hard':
              brushWeight = 1.0;
              break;
            case 'smooth':
            default:
              // Polinômio quártico de Wyvill (curva em sino com topo arredondado e borda suave)
              brushWeight = (1.0 - t * t) * (1.0 - t * t);
              break;
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

          case 'noise': {
            if (oldState === CellState.WATER) break;
            // Ruído determinístico multi-frequência suave para texturizar superfícies rochosas
            const nx = cellTileX * 0.18;
            const ny = cellTileY * 0.18;
            const nVal = Math.sin(nx) * Math.cos(ny) + 0.5 * Math.sin(nx * 2.3 + ny * 1.7) + 0.25 * Math.cos(nx * 4.1 - ny * 3.2);
            const delta = (nVal / 1.75) * (intensity * 0.8) * totalWeight;

            if (oldState === CellState.UNKNOWN) {
              newState = CellState.LAND;
              newHeight = Math.max(0.0, 2.0 + delta);
              newConfidence = ConfidenceLevel.SPECULATIVE;
            } else if (oldState === CellState.LAND) {
              newHeight = Math.max(0.0, oldHeight + delta);
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

          if (newState === CellState.UNKNOWN) {
            this.heightfield.markErased(chunkKey, idx);
          } else {
            this.heightfield.unmarkErased(chunkKey, idx);
          }

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

  /**
   * Aplica uma rampa linear contínua entre dois pontos no relevo
   */
  public applyRamp(options: ApplyRampOptions): StrokeResult {
    const {
      startTileX,
      startTileY,
      startHeight,
      endTileX,
      endTileY,
      endHeight,
      widthTiles,
      currentVisit,
      enforceVisitRange = true,
      protectWater = true,
      userRole = 'explorer',
    } = options;

    if (userRole === 'scout') {
      return { deltas: [], affectedChunks: [], touchedCount: 0 };
    }

    const dx = endTileX - startTileX;
    const dy = endTileY - startTileY;
    const length = Math.hypot(dx, dy);
    if (length < 1.0) {
      return { deltas: [], affectedChunks: [], touchedCount: 0 };
    }

    const ux = dx / length;
    const uy = dy / length;
    const nx = -uy;
    const ny = ux;

    const deltas: CellDelta[] = [];
    const affectedChunks = new Set<string>();
    const cellSize = CONFIG.CELL_SIZE_TILES;
    const halfWidth = Math.max(1, widthTiles / 2);
    const searchMargin = halfWidth + cellSize * 2;

    const minX = Math.min(startTileX, endTileX) - searchMargin;
    const maxX = Math.max(startTileX, endTileX) + searchMargin;
    const minY = Math.min(startTileY, endTileY) - searchMargin;
    const maxY = Math.max(startTileY, endTileY) + searchMargin;

    const startCell = tileToCell(minX, minY);
    const endCell = tileToCell(maxX, maxY);

    for (let cy = startCell.cellY; cy <= endCell.cellY; cy++) {
      for (let cx = startCell.cellX; cx <= endCell.cellX; cx++) {
        const cellTileX = cx * cellSize;
        const cellTileY = cy * cellSize;

        const vx = cellTileX - startTileX;
        const vy = cellTileY - startTileY;

        // Projeção longitudinal ao longo da rampa [0, length]
        const projLong = vx * ux + vy * uy;
        if (projLong < -cellSize || projLong > length + cellSize) continue;

        // Distância lateral da linha central da rampa
        const distLat = Math.abs(vx * nx + vy * ny);
        if (distLat > halfWidth + cellSize) continue;

        // Peso de atenuação nas bordas laterais para transição suave
        let rampWeight = 1.0;
        if (distLat > halfWidth * 0.7) {
          const latT = (distLat - halfWidth * 0.7) / (halfWidth * 0.3 + cellSize);
          rampWeight = Math.max(0, 1.0 - latT);
        }

        const stationWeight = this.calculateStationWeight(cellTileX, cellTileY, currentVisit, enforceVisitRange);
        if (stationWeight <= 0.0001) continue;

        const totalWeight = rampWeight * stationWeight;
        if (totalWeight <= 0.001) continue;

        const anchorPin = this.heightfield.getPinAnchor(cx, cy);
        if (anchorPin && anchorPin.z !== null && anchorPin.validated && anchorPin.lockAltitude === true) {
          continue;
        }

        const { chunkX, chunkY, localCellX, localCellY, chunkKey } = cellToChunkCoords(cx, cy);
        const chunk = this.heightfield.getOrCreateChunk(chunkX, chunkY);
        const idx = localCellY * CONFIG.CHUNK_SIZE_CELLS + localCellX;

        const sheetId = getTileSheetName(cellTileX, cellTileY);
        if (chunk.locked[idx] === 1 || this.heightfield.isSheetLocked(sheetId)) {
          continue;
        }

        const oldHeight = chunk.heights[idx];
        const oldState = chunk.states[idx] as CellState;
        const oldConfidence = chunk.confidence[idx] as ConfidenceLevel;
        const oldLocked = chunk.locked[idx] === 1;

        if (protectWater && oldState === CellState.WATER) continue;

        // Interpolação linear da altura ideal ao longo da rampa
        const frac = Math.max(0, Math.min(1, projLong / length));
        const targetHeight = startHeight + frac * (endHeight - startHeight);

        const newHeight = Math.max(0.0, oldHeight + (targetHeight - oldHeight) * totalWeight);
        const newState = CellState.LAND;
        const newConfidence = oldConfidence ?? ConfidenceLevel.SPECULATIVE;
        const newLocked = oldLocked;

        if (
          Math.abs(newHeight - oldHeight) > 0.0001 ||
          newState !== oldState ||
          newConfidence !== oldConfidence
        ) {
          chunk.heights[idx] = newHeight;
          chunk.states[idx] = newState;
          chunk.confidence[idx] = newConfidence;
          chunk.isDirty = true;
          affectedChunks.add(chunkKey);
          this.heightfield.unmarkErased(chunkKey, idx);

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
