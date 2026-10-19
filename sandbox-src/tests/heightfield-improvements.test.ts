import { describe, it, expect } from 'vitest';
import { HeightfieldManager } from '../src/core/heightfield';
import { CellState, ConfidenceLevel, MapPin } from '../src/core/types';
import { CONFIG, tileToCell } from '../src/config';
import { pt } from '../src/i18n/locales/pt';
import { en } from '../src/i18n/locales/en';

describe('Heightfield Improvements & Fixes', () => {
  it('should interpolate heights continuously with getInterpolatedHeightAtTile', () => {
    const hf = new HeightfieldManager();

    // Seta 4 células vizinhas formando um quadrado: (0,0)=10, (1,0)=20, (0,1)=10, (1,1)=20
    hf.setCellDirect(0, 0, 10, CellState.LAND, ConfidenceLevel.SPECULATIVE);
    hf.setCellDirect(1, 0, 20, CellState.LAND, ConfidenceLevel.SPECULATIVE);
    hf.setCellDirect(0, 1, 10, CellState.LAND, ConfidenceLevel.SPECULATIVE);
    hf.setCellDirect(1, 1, 20, CellState.LAND, ConfidenceLevel.SPECULATIVE);

    // Célula tem tamanho CONFIG.CELL_SIZE_TILES tiles.
    // Tile (0,0) está na célula (0,0) -> altura 10
    const h0 = hf.getInterpolatedHeightAtTile(0, 0);
    expect(h0).toBe(10);

    // Meio do caminho entre célula 0 e célula 1 -> altura 15
    const hHalf = hf.getInterpolatedHeightAtTile(CONFIG.CELL_SIZE_TILES * 0.5, 0);
    expect(hHalf).toBeCloseTo(15, 1);
  });

  it('should allow sculpting over (0,0) when pin has lockAltitude=false', () => {
    const hf = new HeightfieldManager();
    const spawnPin: MapPin = {
      id: 'pin-spawn-zero',
      x: 0,
      y: 0,
      z: 0.0,
      type: 'pillar',
      method: 'marco_construido',
      uncertainty_tiles: 0,
      author: 'Cartografo',
      validated: true,
      lockAltitude: false, // Não trava o relevo
      created_at: new Date().toISOString(),
    };

    hf.updatePinAnchors([spawnPin]);

    // Aplica pincel de elevação no ponto (0,0)
    hf.applyStroke({
      tool: 'raise',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 20,
      intensity: 15.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const { cellX: zeroX, cellY: zeroY } = tileToCell(0, 0);
    const cellZero = hf.getCell(zeroX, zeroY);
    expect(cellZero.state).toBe(CellState.LAND);
    expect(cellZero.height).toBeGreaterThan(0); // Não ficou congelado em 0!
  });

  it('should freeze cell when pin has lockAltitude=true', () => {
    const hf = new HeightfieldManager();
    const fixedPin: MapPin = {
      id: 'pin-fixed',
      x: 10,
      y: 10,
      z: 5.0,
      type: 'pillar',
      method: 'marco_construido',
      uncertainty_tiles: 0,
      author: 'Cartografo',
      validated: true,
      lockAltitude: true, // Trava rígida
      created_at: new Date().toISOString(),
    };

    hf.updatePinAnchors([fixedPin]);

    // Tenta aplicar pincel sobre a célula do pino
    hf.applyStroke({
      tool: 'raise',
      centerTileX: 10,
      centerTileY: 10,
      radiusTiles: 20,
      intensity: 30.0,
      falloff: 'hard',
      currentVisit: null,
      enforceVisitRange: false,
    });

    const { cellX: fixedX, cellY: fixedY } = tileToCell(10, 10);
    const cellFixed = hf.getCell(fixedX, fixedY);
    expect(cellFixed.height).toBe(5.0); // Continua travado em 5.0m
  });

  it('should have exact key parity between PT and EN localization dictionaries', () => {
    const ptKeys = Object.keys(pt).sort();
    const enKeys = Object.keys(en).sort();

    expect(ptKeys).toEqual(enKeys);
    expect(ptKeys.length).toBeGreaterThan(40);
  });
});
