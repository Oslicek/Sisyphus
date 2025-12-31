import { describe, it, expect } from 'vitest';
import {
  calculateDeficitPerSecond,
  calculateSecondsSinceAnchor,
  calculateCurrentDebt,
  calculateDebtGrowthRate,
  selectActiveAnchor,
  calculateGrowthRateForAnchor,
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

describe('calculateDebtGrowthRate', () => {
  it('should calculate growth rate from anchor to planned EOY debt', () => {
    // Anchor: 2025-10-01, value: 3517.95 billion
    // Planned EOY: 3613.6 billion
    // Time from Oct 1 to Dec 31 23:59:59 = 92 days (Oct 31 + Nov 30 + Dec 31)
    const anchorAmount = 3_517_950_000_000;
    const plannedEoyDebt = 3_613_600_000_000;
    const anchorDate = new Date('2025-10-01T00:00:00Z');
    const eoyDate = new Date('2026-01-01T00:00:00Z'); // Start of next year = end of current year
    
    const result = calculateDebtGrowthRate(anchorAmount, plannedEoyDebt, anchorDate, eoyDate);
    
    // Growth rate should be positive (debt is increasing)
    expect(result).toBeGreaterThan(0);
    
    // Verify: (plannedEoyDebt - anchorAmount) / seconds from anchor to EOY
    const secondsToEoy = (eoyDate.getTime() - anchorDate.getTime()) / 1000;
    const expectedRate = (plannedEoyDebt - anchorAmount) / secondsToEoy;
    expect(result).toBeCloseTo(expectedRate, 2);
  });
});

describe('debt counter at specific dates', () => {
  it('should be exactly 3613.6 billion CZK at 2026-01-01 00:00:00', () => {
    // This is the key acceptance test
    // Anchor: 2025-10-01 00:00:00 with 3517.95 billion CZK
    // Planned EOY debt: 3613.6 billion CZK
    // At exactly 2026-01-01 00:00:00, the debt should equal the planned EOY debt
    
    const anchorDate = new Date('2025-10-01T00:00:00Z');
    const anchorAmount = 3_517_950_000_000; // 3517.95 billion
    const plannedEoyDebt = 3_613_600_000_000; // 3613.6 billion
    const targetDate = new Date('2026-01-01T00:00:00Z');
    
    // Calculate growth rate
    const eoyDate = new Date('2026-01-01T00:00:00Z');
    const growthRate = calculateDebtGrowthRate(anchorAmount, plannedEoyDebt, anchorDate, eoyDate);
    
    // Calculate seconds elapsed
    const secondsElapsed = calculateSecondsSinceAnchor(anchorDate, targetDate);
    
    // Calculate current debt
    const currentDebt = calculateCurrentDebt(anchorAmount, growthRate, secondsElapsed);
    
    // At 2026-01-01 00:00:00, debt should be exactly 3613.6 billion
    expect(currentDebt).toBeCloseTo(plannedEoyDebt, 0);
    expect(currentDebt / 1_000_000_000).toBeCloseTo(3613.6, 1);
  });
});

describe('selectActiveAnchor', () => {
  const anchors = [
    {
      id: '2025',
      baseAmount: 3_517_950_000_000,
      anchorDate: '2025-10-01',
      plannedEoyDebt: 3_613_600_000_000,
      eoyDate: '2026-01-01',
      calculationType: 'eoy-target' as const,
    },
    {
      id: '2026',
      baseAmount: 3_613_600_000_000,
      anchorDate: '2026-01-01',
      plannedDeficit: 286_000_000_000,
      eoyDate: '2027-01-01',
      calculationType: 'deficit-based' as const,
    },
  ];

  it('should select 2025 anchor before 2026-01-01', () => {
    const currentDate = new Date('2025-12-15T12:00:00Z');
    const result = selectActiveAnchor(anchors, currentDate);
    expect(result.id).toBe('2025');
  });

  it('should select 2026 anchor at exactly 2026-01-01 00:00:00', () => {
    const currentDate = new Date('2026-01-01T00:00:00Z');
    const result = selectActiveAnchor(anchors, currentDate);
    expect(result.id).toBe('2026');
  });

  it('should select 2026 anchor after 2026-01-01', () => {
    const currentDate = new Date('2026-06-15T12:00:00Z');
    const result = selectActiveAnchor(anchors, currentDate);
    expect(result.id).toBe('2026');
  });

  it('should return first anchor if current date is before all anchors', () => {
    const currentDate = new Date('2020-01-01T00:00:00Z');
    const result = selectActiveAnchor(anchors, currentDate);
    // Falls back to first anchor in original array
    expect(result.id).toBe('2025');
  });
});

describe('calculateGrowthRateForAnchor', () => {
  it('should calculate growth rate from EOY target for 2025 anchor', () => {
    const anchor = {
      id: '2025',
      baseAmount: 3_517_950_000_000,
      anchorDate: '2025-10-01',
      plannedEoyDebt: 3_613_600_000_000,
      eoyDate: '2026-01-01',
      calculationType: 'eoy-target' as const,
    };
    
    const result = calculateGrowthRateForAnchor(anchor);
    
    // Growth rate should be positive
    expect(result).toBeGreaterThan(0);
    
    // Verify calculation: (3613.6B - 3517.95B) / seconds from Oct 1 to Jan 1
    const anchorDate = new Date('2025-10-01T00:00:00Z');
    const eoyDate = new Date('2026-01-01T00:00:00Z');
    const secondsToEoy = (eoyDate.getTime() - anchorDate.getTime()) / 1000;
    const expectedRate = (3_613_600_000_000 - 3_517_950_000_000) / secondsToEoy;
    expect(result).toBeCloseTo(expectedRate, 2);
  });

  it('should calculate growth rate from deficit for 2026 anchor', () => {
    const anchor = {
      id: '2026',
      baseAmount: 3_613_600_000_000,
      anchorDate: '2026-01-01',
      plannedDeficit: 286_000_000_000,
      eoyDate: '2027-01-01',
      calculationType: 'deficit-based' as const,
    };
    
    const result = calculateGrowthRateForAnchor(anchor);
    
    // Growth rate should be positive
    expect(result).toBeGreaterThan(0);
    
    // Verify calculation: 286B / seconds in 2026 (not a leap year = 365 days)
    const secondsIn2026 = 365 * 24 * 60 * 60;
    const expectedRate = 286_000_000_000 / secondsIn2026;
    expect(result).toBeCloseTo(expectedRate, 2);
  });

  it('should return 0 for invalid calculation type with missing data', () => {
    const anchor = {
      id: 'invalid',
      baseAmount: 1_000_000_000_000,
      anchorDate: '2025-01-01',
      eoyDate: '2026-01-01',
      // Missing both plannedEoyDebt and plannedDeficit
      calculationType: 'eoy-target' as const,
    };
    
    const result = calculateGrowthRateForAnchor(anchor);
    expect(result).toBe(0);
  });

  it('should return 0 for deficit-based type with missing plannedDeficit', () => {
    const anchor = {
      id: 'invalid',
      baseAmount: 1_000_000_000_000,
      anchorDate: '2025-01-01',
      eoyDate: '2026-01-01',
      // Missing plannedDeficit
      calculationType: 'deficit-based' as const,
    };
    
    const result = calculateGrowthRateForAnchor(anchor);
    expect(result).toBe(0);
  });
});

describe('multi-anchor debt counter integration', () => {
  it('should be exactly 3613.6 billion at 2026-01-01 using 2025 anchor', () => {
    const anchor2025 = {
      id: '2025',
      baseAmount: 3_517_950_000_000,
      anchorDate: '2025-10-01',
      plannedEoyDebt: 3_613_600_000_000,
      eoyDate: '2026-01-01',
      calculationType: 'eoy-target' as const,
    };
    
    const targetDate = new Date('2026-01-01T00:00:00Z');
    const anchorDate = new Date(anchor2025.anchorDate + 'T00:00:00Z');
    const growthRate = calculateGrowthRateForAnchor(anchor2025);
    const secondsElapsed = calculateSecondsSinceAnchor(anchorDate, targetDate);
    const debt = calculateCurrentDebt(anchor2025.baseAmount, growthRate, secondsElapsed);
    
    expect(debt / 1_000_000_000).toBeCloseTo(3613.6, 1);
  });

  it('should be exactly 3899.6 billion at 2027-01-01 using 2026 anchor', () => {
    // EOY 2026 = 3613.6 + 286 = 3899.6 billion
    const anchor2026 = {
      id: '2026',
      baseAmount: 3_613_600_000_000,
      anchorDate: '2026-01-01',
      plannedDeficit: 286_000_000_000,
      eoyDate: '2027-01-01',
      calculationType: 'deficit-based' as const,
    };
    
    const targetDate = new Date('2027-01-01T00:00:00Z');
    const anchorDate = new Date(anchor2026.anchorDate + 'T00:00:00Z');
    const growthRate = calculateGrowthRateForAnchor(anchor2026);
    const secondsElapsed = calculateSecondsSinceAnchor(anchorDate, targetDate);
    const debt = calculateCurrentDebt(anchor2026.baseAmount, growthRate, secondsElapsed);
    
    // EOY 2026 = 3613.6 + 286 = 3899.6 billion
    expect(debt / 1_000_000_000).toBeCloseTo(3899.6, 1);
  });

  it('should transition smoothly at 2026-01-01 boundary', () => {
    const anchors = [
      {
        id: '2025',
        baseAmount: 3_517_950_000_000,
        anchorDate: '2025-10-01',
        plannedEoyDebt: 3_613_600_000_000,
        eoyDate: '2026-01-01',
        calculationType: 'eoy-target' as const,
      },
      {
        id: '2026',
        baseAmount: 3_613_600_000_000,
        anchorDate: '2026-01-01',
        plannedDeficit: 286_000_000_000,
        eoyDate: '2027-01-01',
        calculationType: 'deficit-based' as const,
      },
    ];
    
    // Just before midnight - use 2025 anchor
    const beforeMidnight = new Date('2025-12-31T23:59:59Z');
    const anchor2025 = selectActiveAnchor(anchors, beforeMidnight);
    const growthRate2025 = calculateGrowthRateForAnchor(anchor2025);
    const seconds2025 = calculateSecondsSinceAnchor(new Date('2025-10-01T00:00:00Z'), beforeMidnight);
    const debtBefore = calculateCurrentDebt(anchor2025.baseAmount, growthRate2025, seconds2025);
    
    // At midnight - switch to 2026 anchor
    const atMidnight = new Date('2026-01-01T00:00:00Z');
    const anchor2026 = selectActiveAnchor(anchors, atMidnight);
    const growthRate2026 = calculateGrowthRateForAnchor(anchor2026);
    const seconds2026 = calculateSecondsSinceAnchor(new Date('2026-01-01T00:00:00Z'), atMidnight);
    const debtAt = calculateCurrentDebt(anchor2026.baseAmount, growthRate2026, seconds2026);
    
    // Debt should be very close (within 1 second of growth)
    expect(Math.abs(debtAt - debtBefore)).toBeLessThan(growthRate2025 + growthRate2026);
    // 2026 anchor starts exactly at planned EOY debt
    expect(debtAt).toBe(3_613_600_000_000);
  });
});





