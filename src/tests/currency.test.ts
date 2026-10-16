import { describe, it, expect } from 'vitest';
import { formatPrice, toMinorUnits } from '../lib/currency';

describe('formatPrice', () => {
  it('formats GBP correctly', () => {
    expect(formatPrice(1000)).toBe('£10.00');
  });

  it('formats zero correctly', () => {
    expect(formatPrice(0)).toBe('£0.00');
  });

  it('formats large amounts with commas', () => {
    expect(formatPrice(1234567)).toBe('£12,345.67');
  });

  it('handles single-digit pence', () => {
    expect(formatPrice(5)).toBe('£0.05');
  });
});

describe('toMinorUnits', () => {
  it('converts pounds to pence', () => {
    expect(toMinorUnits(10)).toBe(1000);
  });

  it('handles decimal pounds', () => {
    expect(toMinorUnits(9.99)).toBe(999);
  });

  it('rounds correctly', () => {
    expect(toMinorUnits(0.005)).toBe(1);
  });
});
