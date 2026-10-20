import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../src/core/storage';
import { CellState, ConfidenceLevel } from '../src/core/types';
import { CONFIG } from '../src/config';

describe('StorageManager - Tombstone & Eraser Merge Persistence', () => {
  let storage: StorageManager;
  const S = CONFIG.CHUNK_SIZE_CELLS;
  const total = S * S;

  beforeEach(() => {
    storage = new StorageManager();
  });

  it('deve sobrescrever células da nuvem com UNKNOWN quando houver tombstone local mesmo com allowErase=false', () => {
    // Cloud chunk com terreno em todas as células
    const cloudChunk = {
      chunkX: 0,
      chunkY: 0,
      heights: new Array(total).fill(15),
      states: new Array(total).fill(CellState.LAND),
      confidence: new Array(total).fill(ConfidenceLevel.ESTIMATED),
      locked: new Array(total).fill(0),
    };

    // Local apagou as células 0, 1 e 2
    const localChunk = {
      chunkX: 0,
      chunkY: 0,
      heights: new Array(total).fill(15),
      states: new Array(total).fill(CellState.LAND),
      confidence: new Array(total).fill(ConfidenceLevel.ESTIMATED),
      locked: new Array(total).fill(0),
    };
    localChunk.states[0] = CellState.UNKNOWN;
    localChunk.states[1] = CellState.UNKNOWN;
    localChunk.states[2] = CellState.UNKNOWN;

    const erasedMap = new Map<string, Set<number>>();
    erasedMap.set('0,0', new Set([0, 1, 2]));

    const merged = storage.mergeChunksNonDestructive(
      [cloudChunk],
      [localChunk],
      false, // allowErase = false (cenário de pull/recarga)
      erasedMap
    );

    expect(merged.length).toBe(1);
    expect(merged[0].states[0]).toBe(CellState.UNKNOWN);
    expect(merged[0].states[1]).toBe(CellState.UNKNOWN);
    expect(merged[0].states[2]).toBe(CellState.UNKNOWN);
    expect(merged[0].states[3]).toBe(CellState.LAND);
  });

  it('deve purgar chunk completamente quando todas as células virarem UNKNOWN', () => {
    const cloudChunk = {
      chunkX: -2,
      chunkY: 0,
      heights: new Array(total).fill(10),
      states: new Array(total).fill(CellState.LAND),
      confidence: new Array(total).fill(ConfidenceLevel.ESTIMATED),
      locked: new Array(total).fill(0),
    };

    const localChunk = {
      chunkX: -2,
      chunkY: 0,
      heights: new Array(total).fill(0),
      states: new Array(total).fill(CellState.UNKNOWN),
      confidence: new Array(total).fill(ConfidenceLevel.SPECULATIVE),
      locked: new Array(total).fill(0),
    };

    const allIndices = new Set<number>();
    for (let i = 0; i < total; i++) allIndices.add(i);
    const erasedMap = new Map<string, Set<number>>();
    erasedMap.set('-2,0', allIndices);

    const merged = storage.mergeChunksNonDestructive(
      [cloudChunk],
      [localChunk],
      true, // allowErase = true (publish)
      erasedMap
    );

    // O chunk apagado por completo deve ser purgado do array final da nuvem
    expect(merged.length).toBe(0);
  });
});
