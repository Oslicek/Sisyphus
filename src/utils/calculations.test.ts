import { describe, it, expect } from 'vitest';
import {
  calculateDeficitPerSecond,
  calculateSecondsSinceAnchor,
  calculateCurrentDebt,
} from './calculations';

describe('calculateDeficitPerSecond', () => {
  it('should calculate deficit per second from yearly deficit', () => {
    // 241 billion CZK per year
    const yearlyDeficit = 241_000_000_000;
    // 2025 is not a leap year, so 365 days
    const secondsInYear = 365 * 24 * 60 * 60; // 31,536,000
    const expected = yearlyDeficit / secondsInYear;

    const result = calculateDeficitPerSecond(yearlyDeficit, 2025);

    expect(result).toBeCloseTo(expected, 2);
  });

  it('should handle leap year correctly', () => {
    const yearlyDeficit = 241_000_000_000;
    // 2024 is a leap year, so 366 days
    const secondsInLeapYear = 366 * 24 * 60 * 60; // 31,622,400
    const expected = yearlyDeficit / secondsInLeapYear;

    const result = calculateDeficitPerSecond(yearlyDeficit, 2024);

    expect(result).toBeCloseTo(expected, 2);
  });
});

describe('calculateSecondsSinceAnchor', () => {
  it('should calculate seconds between anchor date and current date', () => {
    const anchorDate = new Date('2024-12-31T00:00:00Z');
    const currentDate = new Date('2025-01-01T00:00:00Z');
    // 1 day = 86400 seconds
    const expected = 86400;

    const result = calculateSecondsSinceAnchor(anchorDate, currentDate);

    expect(result).toBe(expected);
  });

  it('should handle same day correctly', () => {
    const anchorDate = new Date('2024-12-31T00:00:00Z');
    const currentDate = new Date('2024-12-31T00:00:00Z');

    const result = calculateSecondsSinceAnchor(anchorDate, currentDate);

    expect(result).toBe(0);
  });

  it('should handle hours and minutes', () => {
    const anchorDate = new Date('2024-12-31T00:00:00Z');
    const currentDate = new Date('2024-12-31T01:30:00Z');
    // 1 hour 30 minutes = 5400 seconds
    const expected = 5400;

    const result = calculateSecondsSinceAnchor(anchorDate, currentDate);

    expect(result).toBe(expected);
  });
});

describe('calculateCurrentDebt', () => {
  it('should calculate current debt based on base amount and elapsed time', () => {
    const baseAmount = 3_365_200_000_000;
    const deficitPerSecond = 7643.41; // approximately 241B / 31,536,000
    const secondsElapsed = 86400; // 1 day
    const expectedIncrease = deficitPerSecond * secondsElapsed;
    const expected = baseAmount + expectedIncrease;

    const result = calculateCurrentDebt(baseAmount, deficitPerSecond, secondsElapsed);

    expect(result).toBeCloseTo(expected, 0);
  });

  it('should return base amount when no time has elapsed', () => {
    const baseAmount = 3_365_200_000_000;
    const deficitPerSecond = 7643.41;
    const secondsElapsed = 0;

    const result = calculateCurrentDebt(baseAmount, deficitPerSecond, secondsElapsed);

    expect(result).toBe(baseAmount);
  });

  it('should handle large elapsed times (1 year)', () => {
    const baseAmount = 3_365_200_000_000;
    const yearlyDeficit = 241_000_000_000;
    const deficitPerSecond = yearlyDeficit / (365 * 24 * 60 * 60);
    const secondsElapsed = 365 * 24 * 60 * 60; // 1 year

    const result = calculateCurrentDebt(baseAmount, deficitPerSecond, secondsElapsed);

    // After 1 year, debt should increase by approximately the yearly deficit
    expect(result).toBeCloseTo(baseAmount + yearlyDeficit, 0);
  });
});

