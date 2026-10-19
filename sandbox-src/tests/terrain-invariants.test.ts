// ==============================================================================
// JACKAL SANDBOX — TESTES AUTOMATIZADOS DE REGRAS E INVARIANTES
// Testes de regressão para água a zero, terra >= 0, estado desconhecido e snapshots
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { HeightfieldManager } from '../src/core/heightfield';
import { PinManager } from '../src/core/pins';
import { VisitManager } from '../src/core/visits';
import { StorageManager } from '../src/core/storage';
import { CellState, ConfidenceLevel, MapPin } from '../src/core/types';
import { CONFIG, getTileSheetName, tileToCell, worldMetersToTile, tileToWorldMeters } from '../src/config';

describe('Critérios de Aceite e Invariantes do Jackal Sandbox', () => {
  let heightfield: HeightfieldManager;
  let pinManager: PinManager;
  let visitManager: VisitManager;
  let storageManager: StorageManager;

  beforeEach(() => {
    heightfield = new HeightfieldManager();
    pinManager = new PinManager();
    visitManager = new VisitManager();
    storageManager = new StorageManager();
  });

  it('Critério 1: O mapa começa 100% desconhecido (nenhum relevo ou ilha pré-gerada)', () => {
    const bounds = heightfield.getKnownBounds();
    expect(bounds).toBeNull();

    // Qualquer coordenada consultada deve retornar UNKNOWN
    const cell0 = heightfield.getCell(0, 0);
    expect(cell0.state).toBe(CellState.UNKNOWN);
    expect(cell0.height).toBe(0.0);

    const cellFar = heightfield.getCell(150, -220);
    expect(cellFar.state).toBe(CellState.UNKNOWN);
    expect(cellFar.height).toBe(0.0);
  });

  it('Critério 2: REGRA INVIOLÁVEL DA ÁGUA — Toda água tem altura EXATAMENTE zero', () => {
    // 1. Pinta uma área com água
    heightfield.applyStroke({
      tool: 'water',
      centerTileX: 50,
      centerTileY: 50,
      radiusTiles: 20,
      intensity: 10,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const { cellX, cellY } = tileToCell(50, 50);
    const waterCell = heightfield.getCell(cellX, cellY);
    expect(waterCell.state).toBe(CellState.WATER);
    expect(waterCell.height).toBe(0.0);

    // 2. Tenta aplicar pincel positivo (raise) sobre a água
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 50,
      centerTileY: 50,
      radiusTiles: 20,
      intensity: 15,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const raisedCell = heightfield.getCell(cellX, cellY);
    expect(raisedCell.state).toBe(CellState.WATER);
    expect(raisedCell.height).toBe(0.0); // Continua estritamente 0!

    // 3. Tenta aplicar pincel negativo (lower) sobre a água
    heightfield.applyStroke({
      tool: 'lower',
      centerTileX: 50,
      centerTileY: 50,
      radiusTiles: 20,
      intensity: 15,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const loweredCell = heightfield.getCell(cellX, cellY);
    expect(loweredCell.state).toBe(CellState.WATER);
    expect(loweredCell.height).toBe(0.0); // Nunca negativo!
  });

  it('Critério 3: REGRA DA TERRA — Células de terra NUNCA ficam abaixo de zero (clamp 0)', () => {
    // 1. Eleva terreno para 10m
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 15,
      intensity: 10,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const { cellX, cellY } = tileToCell(0, 0);
    expect(heightfield.getCell(cellX, cellY).state).toBe(CellState.LAND);
    expect(heightfield.getCell(cellX, cellY).height).toBeGreaterThanOrEqual(10.0);

    // 2. Aplica rebaixamento extremo (-50m) com pincel negativo
    heightfield.applyStroke({
      tool: 'lower',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 15,
      intensity: 50,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const clampedCell = heightfield.getCell(cellX, cellY);
    expect(clampedCell.state).toBe(CellState.LAND); // Não vira água sozinho
    expect(clampedCell.height).toBe(0.0); // Clamped a 0m, nunca negativo!
  });

  it('Critério 4: Ferramenta Borracha devolve as células para o estado DESCONHECIDO', () => {
    // 1. Cria relevo
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 30,
      centerTileY: 30,
      radiusTiles: 10,
      intensity: 20,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const { cellX, cellY } = tileToCell(30, 30);
    expect(heightfield.getCell(cellX, cellY).state).toBe(CellState.LAND);

    // 2. Passa a borracha
    heightfield.applyStroke({
      tool: 'eraser',
      centerTileX: 30,
      centerTileY: 30,
      radiusTiles: 15,
      intensity: 1,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    expect(heightfield.getCell(cellX, cellY).state).toBe(CellState.UNKNOWN);
    expect(heightfield.getCell(cellX, cellY).height).toBe(0.0);
  });

  it('Critério 5: Desfazer (Undo) e Refazer (Redo) restauram estados e cotas com exatidão', () => {
    const { cellX, cellY } = tileToCell(0, 0);
    expect(heightfield.getCell(cellX, cellY).state).toBe(CellState.UNKNOWN);

    // Ação 1: Raise
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 10,
      intensity: 15,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });
    const heightAfterRaise = heightfield.getCell(cellX, cellY).height;
    expect(heightAfterRaise).toBeGreaterThan(0);

    // Undo: deve voltar exatamente para UNKNOWN
    heightfield.undo();
    expect(heightfield.getCell(cellX, cellY).state).toBe(CellState.UNKNOWN);
    expect(heightfield.getCell(cellX, cellY).height).toBe(0.0);

    // Redo: deve recuperar a altitude de raise
    heightfield.redo();
    expect(heightfield.getCell(cellX, cellY).state).toBe(CellState.LAND);
    expect(heightfield.getCell(cellX, cellY).height).toBe(heightAfterRaise);
  });

  it('Critério 6: Trava de alcance da visita — pinceladas além de range_tiles não afetam o mapa', () => {
    const visit = visitManager.getCurrentVisit(); // Estação em 0,0 com range 100 tiles
    expect(visit.range_tiles).toBe(100);

    // Tenta pincelar a 200 tiles de distância com trava ativada
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 200,
      centerTileY: 200,
      radiusTiles: 10,
      intensity: 20,
      falloff: 'hard',
      currentVisit: visit,
      enforceVisitRange: true,
    });

    const { cellX, cellY } = tileToCell(200, 200);
    // Deve continuar UNKNOWN porque estava fora do alcance da estação
    expect(heightfield.getCell(cellX, cellY).state).toBe(CellState.UNKNOWN);
    expect(heightfield.getCell(cellX, cellY).height).toBe(0.0);
  });

  it('Critério 7: Pinos com cota z fixam a célula e marco de costa força z = 0', () => {
    const pinCoast: MapPin = {
      id: 'pin-c1',
      x: 40,
      y: 40,
      z: 50, // Mesmo se tentar passar 50, coast é forçado a 0
      type: 'coast',
      method: 'contagem',
      uncertainty_tiles: 0,
      author: 'Tester',
      validated: true,
      created_at: new Date().toISOString(),
    };

    const addedCoast = pinManager.addPin(pinCoast);
    expect(addedCoast.z).toBe(0); // Regra da costa

    heightfield.updatePinAnchors([addedCoast]);
    const { cellX, cellY } = tileToCell(40, 40);
    const cell = heightfield.getCell(cellX, cellY);
    expect(cell.state).toBe(CellState.WATER);
    expect(cell.height).toBe(0.0);
  });

  it('Critério 8: Salvar e restaurar snapshot reproduz 100% exatamente o mesmo relevo', () => {
    // Cria um relevo com terra e água
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 10,
      centerTileY: 10,
      radiusTiles: 15,
      intensity: 25.5,
      falloff: 'smooth',
      currentVisit: null,
      enforceVisitRange: false,
    });

    heightfield.applyStroke({
      tool: 'water',
      centerTileX: -30,
      centerTileY: -30,
      radiusTiles: 15,
      intensity: 1,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const { cellX: landX, cellY: landY } = tileToCell(10, 10);
    const { cellX: waterX, cellY: waterY } = tileToCell(-30, -30);

    const originalLandHeight = heightfield.getCell(landX, landY).height;
    const originalLandState = heightfield.getCell(landX, landY).state;
    const originalWaterState = heightfield.getCell(waterX, waterY).state;

    // Serializa snapshot
    const snapshot = storageManager.serializeCurrentState(
      heightfield,
      pinManager,
      visitManager,
      'Teste Snapshot'
    );

    // Reseta completamente o heightfield
    heightfield.clear();
    expect(heightfield.getCell(landX, landY).state).toBe(CellState.UNKNOWN);

    // Restaura o snapshot
    storageManager.restoreSnapshot(snapshot, heightfield, pinManager, visitManager);

    // Verifica restauração idêntica
    const restoredLand = heightfield.getCell(landX, landY);
    const restoredWater = heightfield.getCell(waterX, waterY);

    expect(restoredLand.state).toBe(originalLandState);
    expect(restoredLand.height).toBeCloseTo(originalLandHeight, 4);
    expect(restoredWater.state).toBe(originalWaterState);
    expect(restoredWater.height).toBe(0.0);
  });

  it('Critério 9: Sistema de coordenadas de folhas quadriculadas (ex: N3-L5, S1-O2)', () => {
    expect(getTileSheetName(520, 340)).toBe('N3-L5');
    expect(getTileSheetName(-250, -120)).toBe('S1-O2');
    expect(getTileSheetName(0, 0)).toBe('N0-L0');

    // Teste de conversão bidirecional Tile <-> World Meters
    const world = tileToWorldMeters(100, 50);
    expect(world.x).toBe(400); // 100 tiles * 4m
    expect(world.z).toBe(-200); // 50 tiles * 4m (Norte é -Z)

    const tile = worldMetersToTile(world.x, world.z);
    expect(tile.tileX).toBe(100);
    expect(tile.tileY).toBe(50);
  });

  it('Critério 10: O pincel não vaza células para fora do raio da estação e a Borracha sempre limpa', () => {
    const visit: any = {
      id: 'visit-test',
      author: 'Testador',
      station_x: 0,
      station_y: 0,
      range_tiles: 50,
      notes: '',
      created_at: new Date().toISOString(),
    };

    // 1. Aplica pincel de subir com centro dentro da estação (em 40,0) mas com raio que vai até 70 tiles (fora do raio de 50)
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 40,
      centerTileY: 0,
      radiusTiles: 30,
      intensity: 5,
      falloff: 'smooth',
      currentVisit: visit,
      enforceVisitRange: true,
    });

    // Ponto a 65 tiles da estação (fora do raio de 50) NUNCA pode ter virado LAND
    const { cellX: outX, cellY: outY } = tileToCell(65, 0);
    const outCell = heightfield.getCell(outX, outY);
    expect(outCell.state).toBe(CellState.UNKNOWN);
    expect(outCell.height).toBe(0.0);

    // 2. Cria intencionalmente uma célula de terra e verifica se a Borracha consegue apagar mesmo fora do raio da estação
    heightfield.setCellDirect(outX, outY, 10, CellState.LAND, ConfidenceLevel.SPECULATIVE);
    expect(heightfield.getCell(outX, outY).state).toBe(CellState.LAND);

    heightfield.applyStroke({
      tool: 'eraser',
      centerTileX: 65,
      centerTileY: 0,
      radiusTiles: 10,
      intensity: 1,
      falloff: 'hard',
      currentVisit: visit,
      enforceVisitRange: true,
    });

    expect(heightfield.getCell(outX, outY).state).toBe(CellState.UNKNOWN);
    expect(heightfield.getCell(outX, outY).height).toBe(0.0);
  });
});
