import { describe, it, expect } from 'vitest';
import { pt } from '../src/i18n/locales/pt';
import { en } from '../src/i18n/locales/en';

describe('i18n Localization Dictionaries Parity', () => {
  it('should have exact same keys in PT and EN locales', () => {
    const ptKeys = Object.keys(pt).sort();
    const enKeys = Object.keys(en).sort();

    expect(ptKeys).toEqual(enKeys);
  });

  it('should have non-empty string values for all keys', () => {
    for (const [key, value] of Object.entries(pt)) {
      expect(typeof value).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
    }

    for (const [key, value] of Object.entries(en)) {
      expect(typeof value).toBe('string');
      expect((value as string).trim().length).toBeGreaterThan(0);
    }
  });
});
