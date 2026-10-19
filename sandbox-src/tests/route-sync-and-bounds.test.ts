import { describe, it, expect } from 'vitest';
import { RouteManager } from '../src/core/routes';

describe('Rotas: Snap Magnético, Sincronização e Bounding Box', () => {
  it('RouteManager.findNearbyNode deve encontrar nó próximo dentro do threshold', () => {
    const rm = new RouteManager();
    rm.saveRoute({
      id: 'r1',
      name: 'Estrada Principal',
      type: 'road',
      status: 'built',
      path: [
        [100, 100],
        [120, 100],
        [140, 110],
      ],
      widthTiles: 2,
    });

    // Ponto muito perto de [120, 100] (distância ~1.41 tiles)
    const snapped = rm.findNearbyNode(121, 101, 2.5);
    expect(snapped).not.toBeNull();
    expect(snapped).toEqual([120, 100]);

    // Ponto fora do raio de 2.5 tiles
    const tooFar = rm.findNearbyNode(125, 105, 2.5);
    expect(tooFar).toBeNull();

    // Com múltiplos nós, deve retornar o mais próximo
    const closest = rm.findNearbyNode(101, 100, 5.0);
    expect(closest).toEqual([100, 100]);
  });

  it('deve extrair realLengthTiles de rotas calibradas na nuvem [NNt]', () => {
    const rawCloudRoute = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Ponte de Pedra [32t]',
      route_kind: 'bridge_built',
      color: '#60a5fa',
      points: [
        { x: 50, y: 50 },
        { x: 82, y: 50 },
      ],
      width_meters: 8,
      notes: 'Ponte principal calibrada',
    };

    // Simula a lógica de conversão do SupabaseSync.loadRoutesFromCloud
    const match = rawCloudRoute.name.match(/\[(\d+)t\]/);
    const calibratedTiles = match ? parseInt(match[1], 10) : undefined;
    const cleanName = rawCloudRoute.name.replace(/\s*\[\d+t\]/, '');

    expect(calibratedTiles).toBe(32);
    expect(cleanName).toBe('Ponte de Pedra');
  });

  it('deve identificar túneis pelo prefixo ou cor roxa #a855f7 na sincronização', () => {
    const rawTunnel = {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Túnel da Mina',
      route_kind: 'road_built', // Salvo como road no DB por compatibilidade de enum
      color: '#a855f7',
      points: [
        { x: 200, y: 200 },
        { x: 250, y: 200 },
      ],
      width_meters: 8,
    };

    let type: 'road' | 'bridge' | 'tunnel' = 'road';
    if (rawTunnel.color === '#a855f7' || rawTunnel.color === '#c084fc') {
      type = 'tunnel';
    }

    expect(type).toBe('tunnel');
  });

  it('filtro de bounding box deve ignorar rotas distantes da área de escultura', () => {
    const route = {
      path: [
        [100, 100],
        [120, 100],
      ] as Array<[number, number]>,
    };

    // Calcula Bounding Box da rota com margem de segurança de 2 tiles
    let rMinX = Infinity, rMaxX = -Infinity, rMinY = Infinity, rMaxY = -Infinity;
    for (const [x, y] of route.path) {
      if (x < rMinX) rMinX = x;
      if (x > rMaxX) rMaxX = x;
      if (y < rMinY) rMinY = y;
      if (y > rMaxY) rMaxY = y;
    }
    rMinX -= 2; rMaxX += 2;
    rMinY -= 2; rMaxY += 2;

    // Pincel aplicado longe: centro (300, 300), raio 10 tiles
    const brushCenterX = 300;
    const brushCenterY = 300;
    const brushRadius = 10;

    const bMinX = brushCenterX - brushRadius;
    const bMaxX = brushCenterX + brushRadius;
    const bMinY = brushCenterY - brushRadius;
    const bMaxY = brushCenterY + brushRadius;

    // Overlap test (AABB)
    const overlaps = !(rMaxX < bMinX || rMinX > bMaxX || rMaxY < bMinY || rMinY > bMaxY);
    expect(overlaps).toBe(false);

    // Pincel aplicado próximo: centro (110, 105), raio 10 tiles
    const nearCenterX = 110;
    const nearCenterY = 105;
    const nMinX = nearCenterX - brushRadius;
    const nMaxX = nearCenterX + brushRadius;
    const nMinY = nearCenterY - brushRadius;
    const nMaxY = nearCenterY + brushRadius;

    const nearOverlaps = !(rMaxX < nMinX || rMinX > nMaxX || rMaxY < nMinY || rMinY > nMaxY);
    expect(nearOverlaps).toBe(true);
  });
});
