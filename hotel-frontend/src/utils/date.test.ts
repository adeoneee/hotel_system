import { describe, expect, it } from 'vitest';
import { getNightCount } from './date';

describe('getNightCount', () => {
  it('calculates the number of nights between dates', () => {
    expect(getNightCount('2026-11-12', '2026-11-15')).toBe(3);
  });

  it('returns zero when one of the dates is missing', () => {
    expect(getNightCount('', '2026-11-15')).toBe(0);
  });

  it('returns zero when checkout is not after check-in', () => {
    expect(getNightCount('2026-11-15', '2026-11-15')).toBe(0);
    expect(getNightCount('2026-11-16', '2026-11-15')).toBe(0);
  });
});
