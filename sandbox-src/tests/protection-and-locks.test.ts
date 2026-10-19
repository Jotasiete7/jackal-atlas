import { describe, it, expect, beforeEach } from 'vitest';
import { HeightfieldManager } from '../src/core/heightfield';
import { CellState, ConfidenceLevel } from '../src/core/types';
import { CONFIG } from '../src/config';

describe('Terrain Protection, Water Safety and Cartographer Locks', () => {
  let heightfield: HeightfieldManager;

  beforeEach(() => {
    heightfield = new HeightfieldManager();
  });

  it('should prevent sculpting tools from modifying locked cells', () => {
    // 1. Cria uma elevação de teste
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 10,
      centerTileY: 10,
      radiusTiles: 10,
      intensity: 15.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const cellBefore = heightfield.getCell(5, 5); // 10 tiles / 2 = cell 5,5
    expect(cellBefore.state).toBe(CellState.LAND);
    expect(cellBefore.height).toBeGreaterThan(0);

    // 2. Tranca a célula com a ferramenta 'lock'
    heightfield.applyStroke({
      tool: 'lock',
      centerTileX: 10,
      centerTileY: 10,
      radiusTiles: 10,
      intensity: 1.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
      lockAction: 'lock',
      userRole: 'cartographer',
    });

    expect(heightfield.isCellLocked(5, 5)).toBe(true);

    // 3. Tenta passar raise, lower, flatten e eraser sobre a célula trancada
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 10,
      centerTileY: 10,
      radiusTiles: 10,
      intensity: 50.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    heightfield.applyStroke({
      tool: 'eraser',
      centerTileX: 10,
      centerTileY: 10,
      radiusTiles: 10,
      intensity: 1.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const cellAfter = heightfield.getCell(5, 5);
    expect(cellAfter.height).toBe(cellBefore.height);
    expect(cellAfter.state).toBe(CellState.LAND);
  });

  it('should protect entire 100x100 sheet when sheet lock is enabled', () => {
    // Tranca a folha N0-L0
    heightfield.setSheetLock('N0-L0', true);
    expect(heightfield.isSheetLocked('N0-L0')).toBe(true);

    // Tenta pintar dentro de N0-L0 (ex: tile 20, 20)
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 20,
      centerTileY: 20,
      radiusTiles: 5,
      intensity: 10.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const cell = heightfield.getCell(10, 10);
    expect(cell.state).toBe(CellState.UNKNOWN);
    expect(cell.height).toBe(0);
  });

  it('should protect existing water from eraser when protectWater is true', () => {
    // Pinta como água
    heightfield.applyStroke({
      tool: 'water',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 6,
      intensity: 1.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
      protectWater: true,
    });

    expect(heightfield.getCell(0, 0).state).toBe(CellState.WATER);

    // Passa a borracha com protectWater ativo
    heightfield.applyStroke({
      tool: 'eraser',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 6,
      intensity: 1.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
      protectWater: true,
    });

    expect(heightfield.getCell(0, 0).state).toBe(CellState.WATER);
  });

  it('should protect existing land from water tool when protectWater is true', () => {
    // Cria colina de 20m
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 6,
      intensity: 20.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const landHeight = heightfield.getCell(0, 0).height;
    expect(landHeight).toBeGreaterThan(0);

    // Tenta carimbar água com protectWater ativo
    heightfield.applyStroke({
      tool: 'water',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 6,
      intensity: 1.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
      protectWater: true,
    });

    // Terra NÃO é destruída
    expect(heightfield.getCell(0, 0).state).toBe(CellState.LAND);
    expect(heightfield.getCell(0, 0).height).toBe(landHeight);
  });

  it('should block all sculpt tools when userRole is scout', () => {
    const result = heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 10,
      intensity: 10.0,
      falloff: 'smooth',
      currentVisit: null,
      enforceVisitRange: false,
      userRole: 'scout',
    });

    expect(result.touchedCount).toBe(0);
    expect(heightfield.getCell(0, 0).state).toBe(CellState.UNKNOWN);
  });
});
