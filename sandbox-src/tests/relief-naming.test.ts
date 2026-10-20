import { describe, it, expect } from 'vitest';
import {
  RELIEF_NAME_PREFIX,
  formatReliefVersion,
  buildReliefCommitName,
} from '../src/core/relief-naming';

describe('Relief Naming Utilities', () => {
  it('formats version with 4 digits zero-padding', () => {
    expect(formatReliefVersion(1)).toBe('v0001');
    expect(formatReliefVersion(7)).toBe('v0007');
    expect(formatReliefVersion(42)).toBe('v0042');
    expect(formatReliefVersion(1234)).toBe('v1234');
    expect(formatReliefVersion(10050)).toBe('v10050');
    expect(formatReliefVersion(0)).toBe('v0000');
    expect(formatReliefVersion(-5)).toBe('v0000');
  });

  it('builds clean official name without optional note', () => {
    expect(buildReliefCommitName(7)).toBe(`${RELIEF_NAME_PREFIX} · v0007`);
    expect(buildReliefCommitName(7, '')).toBe(`${RELIEF_NAME_PREFIX} · v0007`);
    expect(buildReliefCommitName(7, '   ')).toBe(`${RELIEF_NAME_PREFIX} · v0007`);
  });

  it('builds official name with formatted note', () => {
    expect(buildReliefCommitName(7, 'cleaned outside ring')).toBe(
      `${RELIEF_NAME_PREFIX} · v0007 — cleaned outside ring`
    );
    expect(buildReliefCommitName(7, '   cleaned   outside   ring   ')).toBe(
      `${RELIEF_NAME_PREFIX} · v0007 — cleaned outside ring`
    );
  });

  it('truncates excessively long notes to safe limits', () => {
    const longNote = 'A'.repeat(150);
    const result = buildReliefCommitName(7, longNote);
    expect(result.length).toBeLessThanOrEqual(
      RELIEF_NAME_PREFIX.length + 3 + 5 + 3 + 100
    );
    expect(result.startsWith(`${RELIEF_NAME_PREFIX} · v0007 — AAAAA`)).toBe(true);
  });
});
