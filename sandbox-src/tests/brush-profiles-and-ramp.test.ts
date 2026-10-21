import { describe, it, expect, beforeEach } from 'vitest';
import { HeightfieldManager } from '../src/core/heightfield';
import { FieldVisit } from '../src/core/types';
import { CameraController } from '../src/renderer/camera';

describe('Brush Profiles, Ellipse and Ramp Engine', () => {
  let hf: HeightfieldManager;
  const mockVisit: FieldVisit = {
    id: 'test-visit',
    station_x: 0,
    station_y: 0,
    heading_deg: 0,
    station_method: 'marco_construido',
    station_uncertainty: 1,
    author: 'Testeur',
    date: '2026-10-21',
    range_tiles: 200,
  };

  beforeEach(() => {
    hf = new HeightfieldManager();
  });

  it('1. Convex Dome Profile creates a fuller volume than Smooth Bell curve', () => {
    // Esculpe com dome em (0, 0)
    hf.applyStroke({
      tool: 'raise',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 20,
      intensity: 10,
      falloff: 'dome',
      currentVisit: mockVisit,
      enforceVisitRange: false,
    });

    const midDomeHeight = hf.getInterpolatedHeightAtTile(10, 0); // t = 0.5

    // Novo heightfield para smooth
    const hfSmooth = new HeightfieldManager();
    hfSmooth.applyStroke({
      tool: 'raise',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 20,
      intensity: 10,
      falloff: 'smooth',
      currentVisit: mockVisit,
      enforceVisitRange: false,
    });

    const midSmoothHeight = hfSmooth.getInterpolatedHeightAtTile(10, 0);

    // Na cúpula semiesférica (dome), a meia-distância é sqrt(1 - 0.25) = 0.866,
    // enquanto no sino Wyvill (smooth) é (1 - 0.25)^2 = 0.5625
    expect(midDomeHeight).toBeGreaterThan(midSmoothHeight);
  });

  it('2. Concave Bowl Profile creates a wide flat depression floor with soft rims', () => {
    // Eleva um platô prévio de 20m
    hf.applyStroke({
      tool: 'flatten',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 40,
      intensity: 20,
      falloff: 'hard',
      flattenTargetZ: 20,
      currentVisit: mockVisit,
      enforceVisitRange: false,
    });

    // Cava com bacia (bowl) usando lower
    hf.applyStroke({
      tool: 'lower',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 20,
      intensity: 10,
      falloff: 'bowl',
      currentVisit: mockVisit,
      enforceVisitRange: false,
    });

    const centerH = hf.getInterpolatedHeightAtTile(0, 0);
    const midH = hf.getInterpolatedHeightAtTile(10, 0);
    const edgeH = hf.getInterpolatedHeightAtTile(20, 0);

    // O centro sofreu a maior escavação
    expect(centerH).toBeLessThan(midH);
    // A borda permaneceu alta no nível do platô
    expect(edgeH).toBeCloseTo(20, 0);
  });

  it('3. Elliptical Brush stretches along the primary axis and compresses along secondary', () => {
    // Aplica elipse orientada a 0° (esticada no eixo X, comprimida no eixo Y por fator 3.0)
    hf.applyStroke({
      tool: 'raise',
      centerTileX: 0,
      centerTileY: 0,
      radiusTiles: 30,
      intensity: 10,
      falloff: 'smooth',
      shape: 'ellipse',
      ellipseRatio: 3.0,
      ellipseAngleDeg: 0,
      currentVisit: mockVisit,
      enforceVisitRange: false,
    });

    // Ponto a 20 tiles no eixo X (dentro da elipse)
    const heightAlongX = hf.getInterpolatedHeightAtTile(20, 0);
    // Ponto a 20 tiles no eixo Y (fora do raio secundário comprimido de 30 / 3 = 10 tiles)
    const heightAlongY = hf.getInterpolatedHeightAtTile(0, 20);

    expect(heightAlongX).toBeGreaterThan(0.5);
    expect(heightAlongY).toBe(0.0);
  });

  it('4. Road Ramp applies smooth continuous linear slope between two points', () => {
    const res = hf.applyRamp({
      startTileX: 0,
      startTileY: 0,
      startHeight: 5.0,
      endTileX: 60,
      endTileY: 0,
      endHeight: 25.0,
      widthTiles: 6,
      currentVisit: mockVisit,
      enforceVisitRange: false,
    });

    expect(res.touchedCount).toBeGreaterThan(0);

    const startH = hf.getInterpolatedHeightAtTile(0, 0);
    const midH = hf.getInterpolatedHeightAtTile(30, 0);
    const endH = hf.getInterpolatedHeightAtTile(60, 0);

    expect(startH).toBeCloseTo(5.0, 0);
    expect(midH).toBeCloseTo(15.0, 0); // Ponto médio linear (5 + 25) / 2 = 15m
    expect(endH).toBeCloseTo(25.0, 0);

    // Célula distante lateralmente a 20 tiles não deve ter sido afetada pela rampa de 6 tiles
    const farLatH = hf.getInterpolatedHeightAtTile(30, 20);
    expect(farLatH).toBe(0.0);
  });

  it('5. Mini Compass azimuth reports correct camera rotation and resets to North', () => {
    const mockEl = {
      clientWidth: 800,
      clientHeight: 600,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLElement;
    const cam = new CameraController(mockEl);

    // Top view sempre tem azimute 0
    expect(cam.getAzimuth()).toBe(0);

    // Muda para isométrico e rotaciona para Leste (90°)
    cam.setMode('isometric');
    cam.rotateStep('L');
    expect(cam.getAzimuth()).toBeCloseTo(Math.PI / 2, 2);

    // Reseta ao Norte
    cam.resetNorth();
    expect(cam.getAzimuth()).toBe(0);
  });
});
