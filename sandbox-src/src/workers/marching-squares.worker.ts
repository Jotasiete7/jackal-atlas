// ==============================================================================
// JACKAL SANDBOX — WEB WORKER DE MARCHING SQUARES
// Extração de curvas de nível em thread separada com interpolação linear e GeoJSON
// ==============================================================================

export interface MarchingSquaresRequest {
  width: number;
  height: number;
  minCellX: number;
  minCellY: number;
  cellSizeTiles: number;
  tileMeters: number;
  heights: Float32Array;
  states: Uint8Array; // 0 = UNKNOWN, 1 = WATER, 2 = LAND
  intervalMeters: number;
  masterEvery: number;
}

export interface ContourSegment {
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  altitude: number;
  isMaster: boolean;
}

export interface MarchingSquaresResponse {
  segments: ContourSegment[];
  levels: number[];
  geoJson: any;
}

// Interpolação linear da posição da borda
function interpolateEdge(v1: number, v2: number, level: number): number {
  if (Math.abs(v2 - v1) < 0.00001) return 0.5;
  return Math.max(0.0, Math.min(1.0, (level - v1) / (v2 - v1)));
}

self.onmessage = (event: MessageEvent<MarchingSquaresRequest>) => {
  const {
    width,
    height,
    minCellX,
    minCellY,
    cellSizeTiles,
    tileMeters,
    heights,
    states,
    intervalMeters,
    masterEvery,
  } = event.data;

  if (width < 2 || height < 2) {
    self.postMessage({ segments: [], levels: [], geoJson: null });
    return;
  }

  // Encontra altitude mínima e máxima das células conhecidas de terra
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < heights.length; i++) {
    if (states[i] === 2) { // LAND
      const h = heights[i];
      if (h < minZ) minZ = h;
      if (h > maxZ) maxZ = h;
    }
  }

  if (maxZ < intervalMeters || !isFinite(minZ)) {
    self.postMessage({ segments: [], levels: [], geoJson: null });
    return;
  }

  // Gera níveis de contorno
  const levels: number[] = [];
  const startLevel = Math.max(intervalMeters, Math.floor(minZ / intervalMeters) * intervalMeters);
  for (let lvl = startLevel; lvl <= maxZ; lvl += intervalMeters) {
    levels.push(lvl);
  }

  const segments: ContourSegment[] = [];
  const geoFeatures: any[] = [];

  // Helper para obter valor da célula (trata água como 0.0m e desconhecido como -9999)
  function getVal(x: number, y: number): number {
    const idx = y * width + x;
    const st = states[idx];
    if (st === 2) return heights[idx]; // LAND
    if (st === 1) return 0.0;          // WATER
    return -9999;                      // UNKNOWN
  }

  // Marching Squares para cada nível de isolinha
  for (const level of levels) {
    const isMaster = level % (intervalMeters * masterEvery) === 0;
    const levelLinesInTiles: Array<Array<[number, number]>> = [];

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        // 4 vértices do quadrado:
        // TL (x, y+1), TR (x+1, y+1), BR (x+1, y), BL (x, y)
        const vBL = getVal(x, y);
        const vBR = getVal(x + 1, y);
        const vTR = getVal(x + 1, y + 1);
        const vTL = getVal(x, y + 1);

        // Se QUALQUER vértice for desconhecido (-9999), pula o quadrado!
        // Evita gerar curvas falsas na borda da terra incógnita
        if (vBL === -9999 || vBR === -9999 || vTR === -9999 || vTL === -9999) continue;

        // Máscara binária de 4 bits
        let mask = 0;
        if (vBL >= level) mask |= 1;
        if (vBR >= level) mask |= 2;
        if (vTR >= level) mask |= 4;
        if (vTL >= level) mask |= 8;

        if (mask === 0 || mask === 15) continue;

        // Calcula posições das bordas interpoladas (em tiles do mundo)
        const cellLeftTile = (minCellX + x) * cellSizeTiles;
        const cellRightTile = cellLeftTile + cellSizeTiles;
        const cellBottomTile = (minCellY + y) * cellSizeTiles;
        const cellTopTile = cellBottomTile + cellSizeTiles;

        // Pontos nos 4 lados do quadrado:
        const bX = cellLeftTile + interpolateEdge(vBL, vBR, level) * cellSizeTiles;
        const bY = cellBottomTile;

        const rX = cellRightTile;
        const rY = cellBottomTile + interpolateEdge(vBR, vTR, level) * cellSizeTiles;

        const tX = cellLeftTile + interpolateEdge(vTL, vTR, level) * cellSizeTiles;
        const tY = cellTopTile;

        const lX = cellLeftTile;
        const lY = cellBottomTile + interpolateEdge(vBL, vTL, level) * cellSizeTiles;

        const addSeg = (p1x: number, p1y: number, p2x: number, p2y: number) => {
          segments.push({
            x1: p1x * tileMeters,
            y1: level,
            z1: -p1y * tileMeters,
            x2: p2x * tileMeters,
            y2: level,
            z2: -p2y * tileMeters,
            altitude: level,
            isMaster,
          });

          levelLinesInTiles.push([
            [p1x, p1y],
            [p2x, p2y],
          ]);
        };

        // 14 configurações do Marching Squares
        switch (mask) {
          case 1:  addSeg(lX, lY, bX, bY); break;
          case 2:  addSeg(bX, bY, rX, rY); break;
          case 3:  addSeg(lX, lY, rX, rY); break;
          case 4:  addSeg(rX, rY, tX, tY); break;
          case 5:  addSeg(lX, lY, tX, tY); addSeg(bX, bY, rX, rY); break;
          case 6:  addSeg(bX, bY, tX, tY); break;
          case 7:  addSeg(lX, lY, tX, tY); break;
          case 8:  addSeg(tX, tY, lX, lY); break;
          case 9:  addSeg(tX, tY, bX, bY); break;
          case 10: addSeg(lX, lY, bX, bY); addSeg(tX, tY, rX, rY); break;
          case 11: addSeg(tX, tY, rX, rY); break;
          case 12: addSeg(lX, lY, rX, rY); break;
          case 13: addSeg(bX, bY, rX, rY); break;
          case 14: addSeg(lX, lY, bX, bY); break;
        }
      }
    }

    if (levelLinesInTiles.length > 0) {
      geoFeatures.push({
        type: 'Feature',
        properties: {
          elevation_m: level,
          is_master: isMaster,
        },
        geometry: {
          type: 'MultiLineString',
          coordinates: levelLinesInTiles,
        },
      });
    }
  }

  const geoJson = {
    type: 'FeatureCollection',
    name: 'Jackal_Round2_Contours',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features: geoFeatures,
  };

  const response: MarchingSquaresResponse = {
    segments,
    levels,
    geoJson,
  };

  self.postMessage(response);
};
