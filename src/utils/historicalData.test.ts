import { describe, it, expect } from 'vitest';
import { extractQ4Data, getLatestQuarterValue } from './historicalData';
import type { HistoricalDebtPoint } from '../types/debt';

describe('extractQ4Data', () => {
  it('should extract Q4 values from historical data', () => {
    const data: HistoricalDebtPoint[] = [
      { year: 2020, q1: 100, q2: 110, q3: 120, q4: 130 },
      { year: 2021, q1: 140, q2: 150, q3: 160, q4: 170 },
    ];

    const result = extractQ4Data(data);

    expect(result).toEqual([
      { year: 2020, amount: 130 },
      { year: 2021, amount: 170 },
    ]);
  });

  it('should use Q4 value when only Q4 is available', () => {
    const data: HistoricalDebtPoint[] = [
      { year: 1993, q4: 158.8 },
      { year: 1994, q4: 157.3 },
    ];

    const result = extractQ4Data(data);

    expect(result).toEqual([
      { year: 1993, amount: 158.8 },
      { year: 1994, amount: 157.3 },
    ]);
  });

  it('should use latest available quarter if Q4 is missing', () => {
    const data: HistoricalDebtPoint[] = [
      { year: 2025, q1: 3410.22, q2: 3504.16, q3: 3517.95 },
    ];

    const result = extractQ4Data(data);

    expect(result).toEqual([
      { year: 2025, amount: 3517.95 },
    ]);
  });

  it('should skip years with no quarter data', () => {
    const data: HistoricalDebtPoint[] = [
      { year: 2020, q4: 100 },
      { year: 2021 }, // no data
      { year: 2022, q4: 200 },
    ];

    const result = extractQ4Data(data);

    expect(result).toEqual([
      { year: 2020, amount: 100 },
      { year: 2022, amount: 200 },
    ]);
  });

  it('should return empty array for empty input', () => {
    const result = extractQ4Data([]);
    expect(result).toEqual([]);
  });
});

describe('getLatestQuarterValue', () => {
  it('should return Q4 if available', () => {
    const point: HistoricalDebtPoint = { year: 2024, q1: 100, q2: 110, q3: 120, q4: 130 };
    expect(getLatestQuarterValue(point)).toBe(130);
  });

  it('should return Q3 if Q4 is missing', () => {
    const point: HistoricalDebtPoint = { year: 2025, q1: 100, q2: 110, q3: 120 };
    expect(getLatestQuarterValue(point)).toBe(120);
  });

  it('should return Q2 if Q3 and Q4 are missing', () => {
    const point: HistoricalDebtPoint = { year: 2025, q1: 100, q2: 110 };
    expect(getLatestQuarterValue(point)).toBe(110);
  });

  it('should return Q1 if only Q1 is available', () => {
    const point: HistoricalDebtPoint = { year: 2025, q1: 100 };
    expect(getLatestQuarterValue(point)).toBe(100);
  });

  it('should return undefined if no quarter data', () => {
    const point: HistoricalDebtPoint = { year: 2025 };
    expect(getLatestQuarterValue(point)).toBeUndefined();
  });
});

