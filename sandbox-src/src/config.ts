// ==============================================================================
// JACKAL SANDBOX — CONFIGURAÇÃO GERAL DO SISTEMA
// Regras cartográficas e parâmetros físicos de Wurm Online (Jackal Round 2)
// ==============================================================================

export interface SandboxConfig {
  /** Tamanho do mapa em tiles (ex: 4096 = -2048 a +2048 centrado em 0,0) */
  MAP_SIZE_TILES: number;
  /** Tamanho da célula do MVP em tiles (padrão: 5 tiles = 20 metros) */
  CELL_SIZE_TILES: number;
  /** Tamanho do bloco/chunk em células (64 células = 320 tiles = 1280 metros) */
  CHUNK_SIZE_CELLS: number;
  /** Metros reais por tile do Wurm Online */
  TILE_METERS: number;
  /** Raio de influência padrão de uma estação em tiles (confirmado: 100 tiles) */
  DEFAULT_VISIT_RANGE_TILES: number;
  /** Presets obrigatórios de pincel em tiles de diâmetro */
  BRUSH_PRESETS: number[];
  /** FOV do cliente Wurm Online para vista da estação */
  WURM_CLIENT_FOV_DEG: number;
}

export const CONFIG: SandboxConfig = {
  MAP_SIZE_TILES: 4096,
  CELL_SIZE_TILES: 2,
  CHUNK_SIZE_CELLS: 64,
  TILE_METERS: 4.0,
  DEFAULT_VISIT_RANGE_TILES: 100,
  BRUSH_PRESETS: [5, 10, 20, 50, 100],
  WURM_CLIENT_FOV_DEG: 75.0,
};

/** Metros reais de um chunk (64 células * 2 tiles * 4 metros = 512 m) */
export const CHUNK_METERS = CONFIG.CHUNK_SIZE_CELLS * CONFIG.CELL_SIZE_TILES * CONFIG.TILE_METERS;

/** Tiles de largura de um chunk (64 células * 2 tiles = 128 tiles) */
export const CHUNK_TILES = CONFIG.CHUNK_SIZE_CELLS * CONFIG.CELL_SIZE_TILES;

/**
 * Converte coordenada de tile em nome de quadrícula de 100 tiles (ex: N3-L5, S1-O2)
 * Origem (0, 0) fica no centro (ponto de spawn).
 */
export function getTileSheetName(tileX: number, tileY: number): string {
  const xDir = tileX >= 0 ? 'L' : 'O';
  const yDir = tileY >= 0 ? 'N' : 'S';
  const xIdx = Math.floor(Math.abs(tileX) / 100);
  const yIdx = Math.floor(Math.abs(tileY) / 100);
  return `${yDir}${yIdx}-${xDir}${xIdx}`;
}

/**
 * Converte coordenadas de tile para coordenadas do mundo Three.js.
 * Convenção Three.js:
 * X_three = tileX * TILE_METERS (Leste = +X)
 * Z_three = -tileY * TILE_METERS (Norte = -Z no Three.js padrão com Y para cima)
 * Y_three = altitude em metros (exagero vertical aplicado visualmente na câmera ou cena)
 */
export function tileToWorldMeters(tileX: number, tileY: number): { x: number; z: number } {
  return {
    x: tileX * CONFIG.TILE_METERS,
    z: -tileY * CONFIG.TILE_METERS,
  };
}

/** Converte coordenadas do mundo Three.js para coordenadas de tile */
export function worldMetersToTile(worldX: number, worldZ: number): { tileX: number; tileY: number } {
  return {
    tileX: Math.round(worldX / CONFIG.TILE_METERS),
    tileY: Math.round(-worldZ / CONFIG.TILE_METERS),
  };
}

/** Converte coordenadas de tile para coordenadas de célula do grid */
export function tileToCell(tileX: number, tileY: number): { cellX: number; cellY: number } {
  return {
    cellX: Math.round(tileX / CONFIG.CELL_SIZE_TILES),
    cellY: Math.round(tileY / CONFIG.CELL_SIZE_TILES),
  };
}

/** Converte coordenadas de célula para o identificador e índice do chunk */
export function cellToChunkCoords(cellX: number, cellY: number): {
  chunkX: number;
  chunkY: number;
  localCellX: number;
  localCellY: number;
  chunkKey: string;
} {
  const S = CONFIG.CHUNK_SIZE_CELLS;
  const chunkX = Math.floor(cellX / S);
  const chunkY = Math.floor(cellY / S);
  let localCellX = cellX % S;
  if (localCellX < 0) localCellX += S;
  let localCellY = cellY % S;
  if (localCellY < 0) localCellY += S;

  return {
    chunkX,
    chunkY,
    localCellX,
    localCellY,
    chunkKey: `${chunkX},${chunkY}`,
  };
}

export interface CrystalBase {
  id: 'north' | 'west' | 'south';
  name: string;
  namePt: string;
  tileX: number;
  tileY: number;
  color: string;
  hexColor: number;
  icon: string;
}

export const CRYSTAL_BASES: Record<'north' | 'west' | 'south', CrystalBase> = {
  north: {
    id: 'north',
    name: 'North Crystal',
    namePt: 'Cristal Norte',
    tileX: 0,
    tileY: 150,
    color: '#38bdf8',
    hexColor: 0x38bdf8,
    icon: '💎',
  },
  west: {
    id: 'west',
    name: 'West Crystal',
    namePt: 'Cristal Oeste',
    tileX: -320,
    tileY: -250,
    color: '#34d399',
    hexColor: 0x34d399,
    icon: '💎',
  },
  south: {
    id: 'south',
    name: 'South Crystal',
    namePt: 'Cristal Sul',
    tileX: 60,
    tileY: -180,
    color: '#f87171',
    hexColor: 0xf87171,
    icon: '💎',
  },
};
