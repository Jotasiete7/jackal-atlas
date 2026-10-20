import { describe, it, expect } from 'vitest';
import { CONFIG, CRYSTAL_BASES } from '../src/config';

describe('Crystal Bases & Official Preview Triangulation', () => {
  it('should define all 3 primary crystal bases: north, west, and south', () => {
    expect(CRYSTAL_BASES.north).toBeDefined();
    expect(CRYSTAL_BASES.west).toBeDefined();
    expect(CRYSTAL_BASES.south).toBeDefined();

    expect(CRYSTAL_BASES.north.tileX).toBe(0);
    expect(CRYSTAL_BASES.north.tileY).toBe(150);

    expect(CRYSTAL_BASES.west.tileX).toBe(-320);
    expect(CRYSTAL_BASES.west.tileY).toBe(-250);

    expect(CRYSTAL_BASES.south.tileX).toBe(60);
    expect(CRYSTAL_BASES.south.tileY).toBe(-180);
  });

  it('should verify realistic cluster distances between 320 and 520 tiles', () => {
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

    // North to South: sqrt(60^2 + 330^2) ~ 335 tiles
    expect(Math.round(distNS)).toBeGreaterThanOrEqual(300);
    expect(Math.round(distNS)).toBeLessThanOrEqual(400);

    // North to West: sqrt(320^2 + 400^2) ~ 512 tiles
    expect(Math.round(distNW)).toBeGreaterThanOrEqual(450);
    expect(Math.round(distNW)).toBeLessThanOrEqual(550);

    // South to West: sqrt(380^2 + 70^2) ~ 386 tiles
    expect(Math.round(distSW)).toBeGreaterThanOrEqual(350);
    expect(Math.round(distSW)).toBeLessThanOrEqual(450);
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
