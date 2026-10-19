import { describe, it, expect, beforeEach } from 'vitest';
import { HeightfieldManager } from '../src/core/heightfield';
import { StorageManager } from '../src/core/storage';
import { PinManager } from '../src/core/pins';
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

  it('should non-destructively merge cloud chunks and preserve locked and unmapped regions', () => {
    const storage = new StorageManager();
    const total = CONFIG.CHUNK_SIZE_CELLS * CONFIG.CHUNK_SIZE_CELLS;

    const cloudChunk0 = {
      chunkX: 0,
      chunkY: 0,
      heights: new Array(total).fill(0),
      states: new Array(total).fill(CellState.UNKNOWN),
      confidence: new Array(total).fill(ConfidenceLevel.SPECULATIVE),
      locked: new Array(total).fill(0),
    };
    // Célula 0 foi mapeada na nuvem (35m) e travada (locked = 1)
    cloudChunk0.heights[0] = 35;
    cloudChunk0.states[0] = CellState.LAND;
    cloudChunk0.locked[0] = 1;
    // Célula 1 foi mapeada na nuvem (18m) e destravada
    cloudChunk0.heights[1] = 18;
    cloudChunk0.states[1] = CellState.LAND;

    const cloudChunkRemote = {
      chunkX: 3,
      chunkY: -2,
      heights: new Array(total).fill(12),
      states: new Array(total).fill(CellState.LAND),
      confidence: new Array(total).fill(ConfidenceLevel.ESTIMATED),
      locked: new Array(total).fill(0),
    };

    const localChunk0 = {
      chunkX: 0,
      chunkY: 0,
      heights: new Array(total).fill(0),
      states: new Array(total).fill(CellState.UNKNOWN),
      confidence: new Array(total).fill(ConfidenceLevel.SPECULATIVE),
      locked: new Array(total).fill(0),
    };
    // Tenta sobrescrever célula 0 travada na nuvem com edição local destravada (99m) -> deve manter 35m da nuvem!
    localChunk0.heights[0] = 99;
    localChunk0.states[0] = CellState.LAND;
    localChunk0.locked[0] = 0;
    // Célula 1 está UNKNOWN localmente -> deve preservar 18m da nuvem!
    // Célula 2 foi esculpida localmente (42m) -> deve entrar no merge!
    localChunk0.heights[2] = 42;
    localChunk0.states[2] = CellState.LAND;

    const merged = storage.mergeChunksNonDestructive([cloudChunk0, cloudChunkRemote], [localChunk0]);
    expect(merged.length).toBe(2);

    const m0 = merged.find((c) => c.chunkX === 0 && c.chunkY === 0)!;
    expect(m0.heights[0]).toBe(35);
    expect(m0.locked![0]).toBe(1);
    expect(m0.heights[1]).toBe(18);
    expect(m0.states[1]).toBe(CellState.LAND);
    expect(m0.heights[2]).toBe(42);
    expect(m0.states[2]).toBe(CellState.LAND);
  });

  it('should preserve external Supabase UUIDs on savePin and strip legacy pin-spawn-zero on loadPins', () => {
    const pins = new PinManager();
    const saved = pins.savePin({
      id: '550e8400-e29b-41d4-a716-446655440000',
      x: 120,
      y: -80,
      z: 25,
      type: 'pillar',
    });
    expect(saved.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(pins.getAll().length).toBe(1);

    // Chamar savePin novamente com o mesmo UUID atualiza em vez de duplicar
    pins.savePin({
      id: '550e8400-e29b-41d4-a716-446655440000',
      x: 120,
      y: -80,
      z: 30,
      type: 'pillar',
    });
    expect(pins.getAll().length).toBe(1);
    expect(pins.getById('550e8400-e29b-41d4-a716-446655440000')?.z).toBe(30);

    // loadPins ignora pin-spawn-zero legado
    pins.loadPins([
      {
        id: 'pin-spawn-zero',
        x: 0,
        y: 0,
        z: 0,
        type: 'pillar',
        method: 'marco_construido',
        uncertainty_tiles: 0,
        author: 'Sistema',
        validated: true,
        created_at: new Date().toISOString(),
      },
      saved,
    ]);
    expect(pins.getAll().length).toBe(1);
    expect(pins.getById('pin-spawn-zero')).toBeUndefined();
  });
});
