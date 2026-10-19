import { describe, it, expect } from 'vitest';
import {
  calcularSnapWurm,
  computePointAtFixedDistance,
  computeRouteDistance,
  RouteManager,
} from '../src/core/routes';

describe('Rotas e Calibração Angular (Snap Wurm)', () => {
  it('deve alinhar em múltiplos de 45 graus quando em modo travado', () => {
    // Vetor para Leste (dx = 50, dy = 5) deve travar em 0°
    const leste = calcularSnapWurm(0, 0, 50, 5, false);
    expect(leste.angle).toBe(0);
    expect(leste.x2).toBe(50);
    expect(leste.y2).toBe(0);

    // Vetor Nordeste (dx = 30, dy = 28) deve travar em 45°
    const nordeste = calcularSnapWurm(0, 0, 30, 28, false);
    expect(nordeste.angle).toBe(45);
    expect(nordeste.x2).toBe(Math.round(41 * Math.cos(Math.PI / 4)));

    // Vetor Norte (dx = -2, dy = 40) deve travar em 90°
    const norte = calcularSnapWurm(0, 0, -2, 40, false);
    expect(norte.angle).toBe(90);
    expect(norte.x2).toBe(0);
    expect(norte.y2).toBe(40);
  });

  it('deve travar estritamente em 90 graus (N/S/L/O) para pontes sem permitir 45 graus', () => {
    // Vetor diagonal Nordeste (dx = 30, dy = 28): para pontes (stepDegrees = 90), deve travar em Leste (0°) ou Norte (90°)
    const ponteDiag = calcularSnapWurm(0, 0, 30, 20, false, 90);
    expect([0, 90]).toContain(ponteDiag.angle);
    // Deve ser estritamente colinear ao eixo (ou x2 == 0 ou y2 == 0)
    expect(ponteDiag.x2 === 0 || ponteDiag.y2 === 0).toBe(true);

    // Vetor apontando para Leste com pequena inclinação (dx = 50, dy = 15)
    const ponteLeste = calcularSnapWurm(10, 20, 60, 35, false, 90);
    expect(ponteLeste.angle).toBe(0);
    expect(ponteLeste.y2).toBe(20); // y2 idêntico a y1

    // Vetor apontando para Sul (dx = 2, dy = -40)
    const ponteSul = calcularSnapWurm(10, 20, 12, -20, false, 90);
    expect(ponteSul.angle).toBe(270);
    expect(ponteSul.x2).toBe(10); // x2 idêntico a x1
  });

  it('deve permitir ângulo livre quando freeMode for true (Shift pressionado)', () => {
    const livre = calcularSnapWurm(0, 0, 33, 17, true);
    expect(livre.x2).toBe(33);
    expect(livre.y2).toBe(17);
    expect(livre.dist).toBe(Math.round(Math.hypot(33, 17)));
  });

  it('deve cravar o ponto final exato para um comprimento fixo de gabarito em tiles', () => {
    // Ponte partindo de (100, 100) apontando para Leste (0°) com gabarito real de 32 tiles
    const [fx, fy] = computePointAtFixedDistance(100, 100, 0, 32);
    expect(fx).toBe(132);
    expect(fy).toBe(100);

    // Ponte apontando para Norte (90°) com 32 tiles
    const [fx2, fy2] = computePointAtFixedDistance(100, 100, 90, 32);
    expect(fx2).toBe(100);
    expect(fy2).toBe(132);
  });

  it('deve calcular distância acumulada em tiles corretamente', () => {
    const path: Array<[number, number]> = [
      [0, 0],
      [10, 0],
      [10, 20],
    ];
    // 10 + 20 = 30 tiles
    expect(computeRouteDistance(path)).toBe(30);
  });

  it('RouteManager deve salvar, listar e excluir rotas', () => {
    const rm = new RouteManager();
    expect(rm.getAll().length).toBe(0);

    rm.saveRoute({
      id: 'r1',
      name: 'Ponte do Norte',
      type: 'bridge',
      status: 'built',
      path: [
        [0, 0],
        [32, 0],
      ],
      widthTiles: 2,
      realLengthTiles: 32,
    });

    expect(rm.getAll().length).toBe(1);
    expect(rm.getById('r1')?.realLengthTiles).toBe(32);

    rm.deleteRoute('r1');
    expect(rm.getAll().length).toBe(0);
  });
});
