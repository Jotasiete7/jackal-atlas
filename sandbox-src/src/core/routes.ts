// ==============================================================================
// JACKAL SANDBOX — GERENCIADOR DE ROTAS E AFERIÇÃO CARTOGRÁFICA
// Estradas, Pontes e Túneis com snap de 0°/45°/90° e cálculo de gabarito em tiles
// ==============================================================================

import { MapRoute, RouteType, RouteStatus } from './types';

export interface SnapWurmResult {
  angle: number;
  x2: number;
  y2: number;
  dist: number;
}

/**
 * Trava angular do Wurm: alinha as coordenadas para múltiplos de 45°
 * (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°) ou modo livre com Shift.
 */
export function calcularSnapWurm(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  freeMode = false
): SnapWurmResult {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return { angle: 0, x2, y2, dist: 0 };

  const theta = (Math.atan2(dy, dx) * 180) / Math.PI;

  if (!freeMode) {
    const snapped = Math.round(theta / 45) * 45;
    const rad = (snapped * Math.PI) / 180;
    return {
      angle: (snapped + 360) % 360,
      x2: Math.round(x1 + dist * Math.cos(rad)),
      y2: Math.round(y1 + dist * Math.sin(rad)),
      dist: Math.round(dist),
    };
  } else {
    return {
      angle: Math.round((theta + 360) % 360),
      x2: Math.round(x2),
      y2: Math.round(y2),
      dist: Math.round(dist),
    };
  }
}

/**
 * Calcula o ponto final exato para um comprimento fixo de gabarito em tiles
 * Mantém a direção angular do traçado original.
 */
export function computePointAtFixedDistance(
  x1: number,
  y1: number,
  angleDeg: number,
  targetTiles: number
): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [
    Math.round(x1 + targetTiles * Math.cos(rad)),
    Math.round(y1 + targetTiles * Math.sin(rad)),
  ];
}

/**
 * Calcula a distância acumulada em tiles ao longo de um caminho poligonal
 */
export function computeRouteDistance(path: Array<[number, number]>): number {
  if (!path || path.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0];
    const dy = path[i][1] - path[i - 1][1];
    dist += Math.hypot(dx, dy);
  }
  return Math.round(dist);
}

export class RouteManager {
  private routes: Map<string, MapRoute> = new Map();
  private listeners: Array<() => void> = [];

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  public getAll(): MapRoute[] {
    return Array.from(this.routes.values());
  }

  public getById(id: string): MapRoute | undefined {
    return this.routes.get(id);
  }

  public saveRoute(route: MapRoute): void {
    this.routes.set(route.id, { ...route });
    this.notify();
  }

  public deleteRoute(id: string): boolean {
    const deleted = this.routes.delete(id);
    if (deleted) this.notify();
    return deleted;
  }

  public loadRoutes(routesList: MapRoute[]): void {
    this.routes.clear();
    for (const r of routesList) {
      if (r && r.id && Array.isArray(r.path) && r.path.length >= 2) {
        this.routes.set(r.id, { ...r });
      }
    }
    this.notify();
  }

  public clear(): void {
    this.routes.clear();
    this.notify();
  }
}
