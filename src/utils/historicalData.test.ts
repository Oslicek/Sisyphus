import { describe, it, expect } from 'vitest';
import { extractYearlyData, getYearlyValue, extractQ4Data, getLatestQuarterValue } from './historicalData';
import type { HistoricalDebtPoint } from '../types/debt';

describe('extractYearlyData', () => {
  it('should extract yearly values from historical data', () => {
    const data: HistoricalDebtPoint[] = [
      { year: 2020, amount: 2049.8 },
      { year: 2021, amount: 2466.4 },
    ];

    const result = extractYearlyData(data);

    expect(result).toEqual([
      { year: 2020, amount: 2049.8 },
      { year: 2021, amount: 2466.4 },
    ]);
  });

  it('should handle single year', () => {
    const data: HistoricalDebtPoint[] = [
      { year: 1993, amount: 158.8 },
    ];

    const result = extractYearlyData(data);

    expect(result).toEqual([
      { year: 1993, amount: 158.8 },
    ]);
  });

  it('should preserve all years in order', () => {
    const data: HistoricalDebtPoint[] = [
      { year: 2022, amount: 2847.2 },
      { year: 2023, amount: 3112.0 },
      { year: 2024, amount: 3365.2 },
    ];

    const result = extractYearlyData(data);

    expect(result).toHaveLength(3);
    expect(result[0].year).toBe(2022);
    expect(result[1].year).toBe(2023);
    expect(result[2].year).toBe(2024);
  });

  it('should return empty array for empty input', () => {
    const result = extractYearlyData([]);
    expect(result).toEqual([]);
  });
});

describe('getYearlyValue', () => {
  it('should return the amount value', () => {
    const point: HistoricalDebtPoint = { year: 2024, amount: 3365.2 };
    expect(getYearlyValue(point)).toBe(3365.2);
  });

  it('should handle decimal values', () => {
    const point: HistoricalDebtPoint = { year: 1993, amount: 158.8 };
    expect(getYearlyValue(point)).toBe(158.8);
  });

  it('should handle large values', () => {
    const point: HistoricalDebtPoint = { year: 2024, amount: 3365200 };
    expect(getYearlyValue(point)).toBe(3365200);
  });
});

describe('legacy aliases', () => {
  it('extractQ4Data should work as alias for extractYearlyData', () => {
    const data: HistoricalDebtPoint[] = [
      { year: 2020, amount: 2049.8 },
    ];

    const result = extractQ4Data(data);

    expect(result).toEqual([
      { year: 2020, amount: 2049.8 },
    ]);
  });

  it('getLatestQuarterValue should work as alias for getYearlyValue', () => {
    const point: HistoricalDebtPoint = { year: 2024, amount: 3365.2 };
    expect(getLatestQuarterValue(point)).toBe(3365.2);
  });
});
