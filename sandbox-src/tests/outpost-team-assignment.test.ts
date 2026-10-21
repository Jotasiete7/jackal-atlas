import { describe, it, expect, beforeEach } from 'vitest';
import { CRYSTAL_BASES, CONFIG } from '../src/config';
import { VisitManager } from '../src/core/visits';
import { SupabaseSyncManager } from '../src/core/supabase-sync';
import { StorageManager } from '../src/core/storage';

class LocalStorageMock {
  store: Record<string, string> = {};
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = new LocalStorageMock();
}

describe('Outpost Team Assignment & Initial Spawn', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize VisitManager anchored to Freedom Outpost East when requested', () => {
    const visits = new VisitManager('east');
    const visit = visits.getCurrentVisit();

    expect(visit.station_x).toBe(CRYSTAL_BASES.east.tileX);
    expect(visit.station_y).toBe(CRYSTAL_BASES.east.tileY);
    expect(visit.station_x).toBe(60);
    expect(visit.station_y).toBe(-180);
    expect(visit.range_tiles).toBe(CONFIG.DEFAULT_VISIT_RANGE_TILES);
  });

  it('should default VisitManager to origin 0,0 when no outpost is specified (for backward compatibility)', () => {
    const visits = new VisitManager();
    const visit = visits.getCurrentVisit();

    expect(visit.station_x).toBe(0);
    expect(visit.station_y).toBe(0);
  });

  it('should anchor to specific outpost when calling anchorToOutpost', () => {
    const visits = new VisitManager();

    // Anchor to North
    visits.anchorToOutpost('north', 'Team North');
    let v = visits.getCurrentVisit();
    expect(v.station_x).toBe(0);
    expect(v.station_y).toBe(150);
    expect(v.author).toBe('Team North');

    // Anchor to West
    visits.anchorToOutpost('west', 'Team West');
    v = visits.getCurrentVisit();
    expect(v.station_x).toBe(-320);
    expect(v.station_y).toBe(-250);
    expect(v.author).toBe('Team West');

    // Anchor back to East (EET)
    visits.anchorToOutpost('east', 'Team EET');
    v = visits.getCurrentVisit();
    expect(v.station_x).toBe(60);
    expect(v.station_y).toBe(-180);
    expect(v.author).toBe('Team EET');
  });

  it('should resolve user outpost based on guild assignment', () => {
    const storage = new StorageManager();
    const sync = new SupabaseSyncManager(storage);

    // Mock profile with guild EET assigned to East
    (sync as any).currentProfile = {
      id: 'test-user-id',
      role: 'member',
      discord_name: 'Jota7',
      guild: {
        id: 'guild-eet',
        name: 'Exploradores do Leste',
        tag: 'EET',
        color: '#f87171',
        outpost: 'east',
      },
    };

    expect(sync.getUserOutpost()).toBe('east');

    // Change guild to North
    (sync as any).currentProfile.guild.outpost = 'north';
    expect(sync.getUserOutpost()).toBe('north');

    // Change guild to West
    (sync as any).currentProfile.guild.outpost = 'west';
    expect(sync.getUserOutpost()).toBe('west');
  });

  it('should fall back to localStorage and then east if no guild outpost is set', () => {
    const storage = new StorageManager();
    const sync = new SupabaseSyncManager(storage);

    // No profile, no localStorage -> default to east
    expect(sync.getUserOutpost()).toBe('east');

    // Set localStorage
    localStorage.setItem('jackal_sandbox_active_crystal', 'west');
    expect(sync.getUserOutpost()).toBe('west');
  });

  it('should ensure each crystal base defines 100 tiles range', () => {
    expect(CONFIG.DEFAULT_VISIT_RANGE_TILES).toBe(100);
    const radiusMeters = CONFIG.DEFAULT_VISIT_RANGE_TILES * CONFIG.TILE_METERS;
    expect(radiusMeters).toBe(400); // 100 tiles * 4m = 400m
  });
});
