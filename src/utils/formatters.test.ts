import { describe, it, expect } from 'vitest';
import { formatCzechCurrency, formatBillionsCzech, formatCzechNumber } from './formatters';

describe('formatCzechCurrency', () => {
  it('should format number with Czech thousand separators (spaces)', () => {
    const amount = 1234567890;
    const result = formatCzechCurrency(amount);
    // Czech uses non-breaking spaces as thousand separators
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('567');
    expect(result).toContain('890');
  });

  it('should format trillion-scale numbers correctly', () => {
    const amount = 3_365_200_000_000;
    const result = formatCzechCurrency(amount);
    // Should contain the formatted number
    expect(result).toContain('3');
    expect(result).toContain('365');
    expect(result).toContain('200');
    expect(result).toContain('000');
  });

  it('should round to whole numbers', () => {
    const amount = 1234.56;
    const result = formatCzechCurrency(amount);
    // Should not contain decimal point
    expect(result).not.toContain(',');
    expect(result).not.toContain('.');
  });

  it('should handle zero', () => {
    const amount = 0;
    const result = formatCzechCurrency(amount);
    expect(result).toBe('0');
  });
});

describe('formatBillionsCzech', () => {
  it('should format whole billions with "miliard Kč"', () => {
    const result = formatBillionsCzech(3365);
    expect(result).toContain('3');
    expect(result).toContain('365');
    expect(result).toContain('miliard Kč');
  });

  it('should format with one decimal when needed', () => {
    const result = formatBillionsCzech(241.5);
    expect(result).toContain('241');
    expect(result).toContain('miliard Kč');
  });

  it('should handle zero', () => {
    const result = formatBillionsCzech(0);
    expect(result).toBe('0 miliard Kč');
  });

  it('should round to one decimal place', () => {
    const result = formatBillionsCzech(123.456);
    expect(result).toContain('123');
    expect(result).toContain('miliard Kč');
  });
});

describe('formatCzechNumber', () => {
  it('should format number with Czech thousand separators (spaces)', () => {
    const result = formatCzechNumber(1234567);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('567');
  });

  it('should round to whole numbers (floor)', () => {
    const result = formatCzechNumber(1234.99);
    // Should floor to 1234, not round to 1235
    expect(result).toContain('234');
    expect(result).not.toContain('235');
  });

  it('should handle zero', () => {
    const result = formatCzechNumber(0);
    expect(result).toBe('0');
  });

  it('should handle negative numbers', () => {
    const result = formatCzechNumber(-1234567);
    expect(result).toContain('-');
    expect(result).toContain('1');
    expect(result).toContain('234');
  });
});
