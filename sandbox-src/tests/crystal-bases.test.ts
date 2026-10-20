import { describe, it, expect } from 'vitest';
import { CONFIG, CRYSTAL_BASES } from '../src/config';

describe('Freedom Outposts Triangulation & Architecture', () => {
  it('should define all 3 primary Freedom Outposts: north, west, and east', () => {
    expect(CRYSTAL_BASES.north).toBeDefined();
    expect(CRYSTAL_BASES.west).toBeDefined();
    expect(CRYSTAL_BASES.east).toBeDefined();

    expect(CRYSTAL_BASES.north.name).toBe('Freedom Outpost North');
    expect(CRYSTAL_BASES.west.name).toBe('Freedom Outpost West');
    expect(CRYSTAL_BASES.east.name).toBe('Freedom Outpost East');

    expect(CRYSTAL_BASES.north.tileX).toBe(0);
    expect(CRYSTAL_BASES.north.tileY).toBe(150);

    expect(CRYSTAL_BASES.west.tileX).toBe(-320);
    expect(CRYSTAL_BASES.west.tileY).toBe(-250);

    expect(CRYSTAL_BASES.east.tileX).toBe(60);
    expect(CRYSTAL_BASES.east.tileY).toBe(-180);

    // Backward-compatibility alias
    expect((CRYSTAL_BASES as any).south).toBe(CRYSTAL_BASES.east);
  });

  it('should verify realistic cluster distances between 320 and 520 tiles', () => {
    const distNE = Math.hypot(
      CRYSTAL_BASES.north.tileX - CRYSTAL_BASES.east.tileX,
      CRYSTAL_BASES.north.tileY - CRYSTAL_BASES.east.tileY
    );
    const distNW = Math.hypot(
      CRYSTAL_BASES.north.tileX - CRYSTAL_BASES.west.tileX,
      CRYSTAL_BASES.north.tileY - CRYSTAL_BASES.west.tileY
    );
    const distEW = Math.hypot(
      CRYSTAL_BASES.east.tileX - CRYSTAL_BASES.west.tileX,
      CRYSTAL_BASES.east.tileY - CRYSTAL_BASES.west.tileY
    );

    // North to East: sqrt(60^2 + 330^2) ~ 335 tiles
    expect(Math.round(distNE)).toBeGreaterThanOrEqual(300);
    expect(Math.round(distNE)).toBeLessThanOrEqual(400);

    // North to West: sqrt(320^2 + 400^2) ~ 512 tiles
    expect(Math.round(distNW)).toBeGreaterThanOrEqual(450);
    expect(Math.round(distNW)).toBeLessThanOrEqual(550);

    // East to West: sqrt(380^2 + 70^2) ~ 386 tiles
    expect(Math.round(distEW)).toBeGreaterThanOrEqual(350);
    expect(Math.round(distEW)).toBeLessThanOrEqual(450);
  });

  it('should ensure all outposts are well within 4096 map boundaries', () => {
    const maxBound = CONFIG.MAP_SIZE_TILES / 2; // 2048 tiles
    for (const key of ['north', 'west', 'east'] as Array<keyof typeof CRYSTAL_BASES>) {
      const base = CRYSTAL_BASES[key];
      expect(Math.abs(base.tileX)).toBeLessThanOrEqual(maxBound);
      expect(Math.abs(base.tileY)).toBeLessThanOrEqual(maxBound);
    }
  });
});
