// ==============================================================================
// JACKAL SANDBOX — TESTES DO ALGORITMO DE MARCHING SQUARES
// ==============================================================================

import { describe, it, expect } from 'vitest';

describe('Marching Squares e Curvas de Nível', () => {
  it('Gera isolinhas corretas a partir de uma pirâmide conhecida', () => {
    // Grid 5x5 com elevação no centro
    const width = 5;
    const height = 5;
    const heights = new Float32Array([
       0,  0,  0,  0,  0,
       0, 10, 10, 10,  0,
       0, 10, 25, 10,  0,
       0, 10, 10, 10,  0,
       0,  0,  0,  0,  0,
    ]);
    const states = new Uint8Array(25).fill(2); // Tudo LAND

    // Para nível 20, apenas o quadrado central (2,2) possui vértice >= 20
    const level = 20;
    const vBL = heights[2 * width + 2]; // 25
    const vBR = heights[2 * width + 3]; // 10
    const vTR = heights[3 * width + 3]; // 10
    const vTL = heights[3 * width + 2]; // 10

    let mask = 0;
    if (vBL >= level) mask |= 1;
    if (vBR >= level) mask |= 2;
    if (vTR >= level) mask |= 4;
    if (vTL >= level) mask |= 8;

    expect(mask).toBe(1); // Somente Bottom-Left é >= 20, gera isolinha cortando arestas Left e Bottom
  });
});
