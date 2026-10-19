// ==============================================================================
// JACKAL SANDBOX — TESTES DE CONFIANÇA MULTI-VISITA E ANCORAGEM
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { HeightfieldManager } from '../src/core/heightfield';
import { VisitManager } from '../src/core/visits';
import { PinManager } from '../src/core/pins';
import { CellState, ConfidenceLevel } from '../src/core/types';
import { tileToCell } from '../src/config';

describe('Modelo de Confiança Cartográfica e Multi-Visita', () => {
  let heightfield: HeightfieldManager;
  let visitManager: VisitManager;
  let pinManager: PinManager;

  beforeEach(() => {
    heightfield = new HeightfieldManager();
    visitManager = new VisitManager();
    pinManager = new PinManager();
  });

  it('Eleva a confiança de SPECULATIVE para ESTIMATED quando duas visitas distintas tocam a mesma célula', () => {
    // 1. Visita 1 (Explorador Alfa em 0,0)
    const visit1 = visitManager.getCurrentVisit();
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 20,
      centerTileY: 20,
      radiusTiles: 15,
      intensity: 10,
      falloff: 'hard',
      currentVisit: visit1,
      enforceVisitRange: true,
    });

    const { cellX, cellY } = tileToCell(20, 20);
    expect(heightfield.getCell(cellX, cellY).confidence).toBe(ConfidenceLevel.SPECULATIVE);

    // 2. Visita 2 (Explorador Beta com nova estação em 30,30)
    const visit2 = visitManager.startNewVisit('Explorador Beta', 30, 30);
    expect(visit2.id).not.toBe(visit1.id);

    // Pincela sobre a mesma célula (20, 20)
    heightfield.applyStroke({
      tool: 'raise',
      centerTileX: 20,
      centerTileY: 20,
      radiusTiles: 15,
      intensity: 5,
      falloff: 'hard',
      currentVisit: visit2,
      enforceVisitRange: true,
    });

    // Como 2 visitas independentes concordaram e tocaram a célula, agora é ESTIMATED!
    expect(heightfield.getCell(cellX, cellY).confidence).toBe(ConfidenceLevel.ESTIMATED);
  });

  it('Propaga confiança MEASURED no raio de incerteza de um pino validado', () => {
    // Cria relevo inicial especulativo
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

    const { cellX, cellY } = tileToCell(50, 50);
    expect(heightfield.getCell(cellX, cellY).confidence).toBe(ConfidenceLevel.SPECULATIVE);

    // Adiciona e valida pino geodésico na coordenada 50, 50 com incerteza de 10 tiles (2 células de raio)
    const pin = pinManager.addPin({
      x: 50,
      y: 50,
      z: 25.0,
      type: 'pillar',
      method: 'marco_construido',
      uncertainty_tiles: 10,
      author: 'Cartografo',
      validated: true,
    });

    heightfield.updatePinAnchors([pin]);

    // O centro e as células vizinhas sob o pino validado devem agora ter confiança MEASURED
    expect(heightfield.getCell(cellX, cellY).confidence).toBe(ConfidenceLevel.MEASURED);
    expect(heightfield.getCell(cellX, cellY).height).toBe(25.0); // Fixado pela cota do pino!

    // Vizinho imediato dentro do raio de 10 tiles (5 tiles = 1 célula)
    expect(heightfield.getCell(cellX + 1, cellY).confidence).toBe(ConfidenceLevel.MEASURED);
  });
});
