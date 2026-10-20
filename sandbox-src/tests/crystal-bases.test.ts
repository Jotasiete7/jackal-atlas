import { describe, it, expect } from 'vitest';
import { CONFIG, CRYSTAL_BASES } from '../src/config';

describe('Crystal Bases & Triangulation Architecture', () => {
  it('should define all 3 primary crystal bases: north, west, and south', () => {
    expect(CRYSTAL_BASES.north).toBeDefined();
    expect(CRYSTAL_BASES.west).toBeDefined();
    expect(CRYSTAL_BASES.south).toBeDefined();

    expect(CRYSTAL_BASES.north.tileX).toBe(0);
    expect(CRYSTAL_BASES.north.tileY).toBe(1000);

    expect(CRYSTAL_BASES.west.tileX).toBe(-1732);
    expect(CRYSTAL_BASES.west.tileY).toBe(0);

    expect(CRYSTAL_BASES.south.tileX).toBe(0);
    expect(CRYSTAL_BASES.south.tileY).toBe(-1000);
  });

  it('should verify equilateral triangle with ~2000 tiles pairwise distance', () => {
    const distNS = Math.hypot(
      CRYSTAL_BASES.north.tileX - CRYSTAL_BASES.south.tileX,
      CRYSTAL_BASES.north.tileY - CRYSTAL_BASES.south.tileY
    );
    const distNW = Math.hypot(
      CRYSTAL_BASES.north.tileX - CRYSTAL_BASES.west.tileX,
      CRYSTAL_BASES.north.tileY - CRYSTAL_BASES.west.tileY
    );
    const distSW = Math.hypot(
      CRYSTAL_BASES.south.tileX - CRYSTAL_BASES.west.tileX,
      CRYSTAL_BASES.south.tileY - CRYSTAL_BASES.west.tileY
    );

    // Exact: 2000 tiles
    expect(distNS).toBe(2000);
    // 1732^2 + 1000^2 = 2,999,824 + 1,000,000 = 3,999,824 -> sqrt ~ 1999.95
    expect(Math.round(distNW)).toBe(2000);
    expect(Math.round(distSW)).toBe(2000);
  });

  it('should ensure all crystal bases are well within 4096 map boundaries', () => {
    const maxBound = CONFIG.MAP_SIZE_TILES / 2; // 2048 tiles
    for (const key of Object.keys(CRYSTAL_BASES) as Array<keyof typeof CRYSTAL_BASES>) {
      const base = CRYSTAL_BASES[key];
      expect(Math.abs(base.tileX)).toBeLessThanOrEqual(maxBound);
      expect(Math.abs(base.tileY)).toBeLessThanOrEqual(maxBound);
    }
  });
});
