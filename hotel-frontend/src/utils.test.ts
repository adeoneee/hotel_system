import { describe, it, expect } from 'vitest';
import { formatPrice } from './utils/format';

describe('formatPrice', () => {
  it('formats number as rubles', () => {
    expect(formatPrice(1500)).toBe('1500.00 ₽');
  });

  it('handles decimals', () => {
    expect(formatPrice(99.5)).toBe('99.50 ₽');
  });
});
