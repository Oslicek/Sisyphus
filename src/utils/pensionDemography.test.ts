import { describe, it, expect } from 'vitest';
import {
  mxToQx,
  calculateSurvivors,
  ageCohorts,
  calculateBirths,
  applyMigration,
  calculateLifeExpectancy,
  sumPopulation,
  createFullAgeArray,
  calibrateMortality,
} from './pensionDemography';

describe('mxToQx', () => {
  it('should convert mx to qx using formula qx = 1 - exp(-mx)', () => {
    const mx = 0.01; // 1% death rate
    const qx = mxToQx(mx);
    // qx = 1 - exp(-0.01) ≈ 0.00995
    expect(qx).toBeCloseTo(1 - Math.exp(-0.01), 10);
  });

  it('should return 0 for mx = 0', () => {
    expect(mxToQx(0)).toBe(0);
  });

  it('should approach 1 for very high mx', () => {
    const qx = mxToQx(10); // Very high mortality
    expect(qx).toBeCloseTo(1, 3); // ~0.99995
  });

  it('should handle typical adult mortality rates', () => {
    // Typical adult mx around 0.001-0.002
    const qx = mxToQx(0.001);
    expect(qx).toBeCloseTo(0.0009995, 6);
  });
});

describe('calculateSurvivors', () => {
  it('should apply mortality to get survivors', () => {
    const population = [1000, 1000, 1000];
    const qx = [0.01, 0.01, 0.01]; // 1% mortality at each age
    const survivors = calculateSurvivors(population, qx);
    
    expect(survivors[0]).toBeCloseTo(990, 0);
    expect(survivors[1]).toBeCloseTo(990, 0);
    expect(survivors[2]).toBeCloseTo(990, 0);
  });

  it('should handle zero mortality', () => {
    const population = [1000, 1000, 1000];
    const qx = [0, 0, 0];
    const survivors = calculateSurvivors(population, qx);
    
    expect(survivors).toEqual([1000, 1000, 1000]);
  });

  it('should handle 100% mortality', () => {
    const population = [1000, 1000, 1000];
    const qx = [1, 1, 1];
    const survivors = calculateSurvivors(population, qx);
    
    expect(survivors).toEqual([0, 0, 0]);
  });
});

describe('ageCohorts', () => {
  it('should shift survivors to next age group', () => {
    const survivors = [100, 200, 300, 400];
    const maxAge = 3;
    const aged = ageCohorts(survivors, maxAge);
    
    // Age 0 becomes empty (will be filled with births)
    expect(aged[0]).toBe(0);
    // Survivors[0] → aged[1]
    expect(aged[1]).toBe(100);
    // Survivors[1] → aged[2]
    expect(aged[2]).toBe(200);
    // Survivors[2] + Survivors[3] → aged[3] (open age group)
    expect(aged[3]).toBe(300 + 400);
  });

  it('should accumulate at maxAge (open age group)', () => {
    const survivors = [100, 100, 100, 100, 500]; // Last is already maxAge
    const maxAge = 4;
    const aged = ageCohorts(survivors, maxAge);
    
    // survivors[3] + survivors[4] both go to maxAge
    expect(aged[4]).toBe(100 + 500);
  });

  it('should handle single age cohort', () => {
    const survivors = [1000];
    const maxAge = 0;
    const aged = ageCohorts(survivors, maxAge);
    
    expect(aged[0]).toBe(1000); // Stays at age 0
  });
});

describe('calculateBirths', () => {
  it('should calculate births from female population and ASFR', () => {
    // Simple test: 1000 women at fertile age, fertility rate 0.1
    const femalePop = [0, 0, 0, 0, 0, 1000]; // Women at age 5
    const asfr = [0, 0, 0, 0, 0, 0.1]; // Only age 5 is fertile
    const srb = 1.05; // Sex ratio at birth
    
    const { totalBirths, maleBirths, femaleBirths } = calculateBirths(femalePop, asfr, srb);
    
    expect(totalBirths).toBe(100); // 1000 * 0.1
    const pMale = srb / (1 + srb);
    expect(maleBirths).toBeCloseTo(100 * pMale, 1);
    expect(femaleBirths).toBeCloseTo(100 * (1 - pMale), 1);
    expect(maleBirths + femaleBirths).toBeCloseTo(totalBirths, 5);
  });

  it('should handle multiple fertile age groups', () => {
    const femalePop = [0, 1000, 1000, 1000, 0];
    const asfr = [0, 0.05, 0.1, 0.05, 0];
    const srb = 1.0; // Equal sex ratio
    
    const { totalBirths, maleBirths, femaleBirths } = calculateBirths(femalePop, asfr, srb);
    
    // 1000*0.05 + 1000*0.1 + 1000*0.05 = 200
    expect(totalBirths).toBe(200);
    expect(maleBirths).toBeCloseTo(100, 1);
    expect(femaleBirths).toBeCloseTo(100, 1);
  });

  it('should return zero births when no fertile women', () => {
    const femalePop = [1000, 0, 0];
    const asfr = [0, 0.1, 0.1];
    const srb = 1.05;
    
    const { totalBirths } = calculateBirths(femalePop, asfr, srb);
    expect(totalBirths).toBe(0);
  });
});

describe('applyMigration', () => {
  it('should add positive net migration', () => {
    const population = [1000, 1000, 1000];
    const netMig = [10, 20, 30];
    const result = applyMigration(population, netMig);
    
    expect(result).toEqual([1010, 1020, 1030]);
  });

  it('should subtract negative net migration (emigration)', () => {
    const population = [1000, 1000, 1000];
    const netMig = [-10, -20, -30];
    const result = applyMigration(population, netMig);
    
    expect(result).toEqual([990, 980, 970]);
  });

  it('should clamp population to non-negative', () => {
    const population = [100, 100, 100];
    const netMig = [-200, -50, 10]; // First would go negative
    const result = applyMigration(population, netMig);
    
    expect(result[0]).toBe(0); // Clamped to 0
    expect(result[1]).toBe(50);
    expect(result[2]).toBe(110);
  });
});

describe('calculateLifeExpectancy', () => {
  it('should calculate life expectancy at birth from mortality rates', () => {
    // Use simplified mortality for testing
    // Constant mortality of 0.05 should give e0 ≈ 1/0.05 = 20
    const maxAge = 100;
    const mx = new Array(maxAge + 1).fill(0.05);
    mx[maxAge] = 1.0; // Force death at maxAge
    
    const e0 = calculateLifeExpectancy(mx);
    
    // With constant hazard rate of 0.05, expected lifetime ≈ 20
    // This is approximate due to discrete time
    expect(e0).toBeGreaterThan(15);
    expect(e0).toBeLessThan(25);
  });

  it('should return lower e0 for higher mortality', () => {
    const maxAge = 50;
    const lowMx = new Array(maxAge + 1).fill(0.02);
    lowMx[maxAge] = 1.0;
    const highMx = new Array(maxAge + 1).fill(0.1);
    highMx[maxAge] = 1.0;
    
    const e0Low = calculateLifeExpectancy(lowMx);
    const e0High = calculateLifeExpectancy(highMx);
    
    expect(e0Low).toBeGreaterThan(e0High);
  });

  it('should handle infant mortality correctly', () => {
    const maxAge = 20;
    const mx = new Array(maxAge + 1).fill(0.01);
    mx[0] = 0.1; // High infant mortality
    mx[maxAge] = 1.0;
    
    const e0 = calculateLifeExpectancy(mx);
    
    // Should still be positive and reasonable
    expect(e0).toBeGreaterThan(0);
    expect(e0).toBeLessThan(maxAge);
  });
});

describe('sumPopulation', () => {
  it('should sum all population values', () => {
    const pop = {
      M: [100, 200, 300],
      F: [150, 250, 350],
    };
    
    expect(sumPopulation(pop)).toBe(1350);
  });

  it('should return 0 for empty arrays', () => {
    const pop = { M: [], F: [] };
    expect(sumPopulation(pop)).toBe(0);
  });
});

describe('createFullAgeArray', () => {
  it('should create full array from sparse fertility shape', () => {
    const ages = [15, 16, 17];
    const shape = [0.3, 0.5, 0.2];
    const maxAge = 20;
    
    const full = createFullAgeArray(ages, shape, maxAge);
    
    expect(full.length).toBe(21); // 0-20
    expect(full[0]).toBe(0);
    expect(full[14]).toBe(0);
    expect(full[15]).toBe(0.3);
    expect(full[16]).toBe(0.5);
    expect(full[17]).toBe(0.2);
    expect(full[18]).toBe(0);
    expect(full[20]).toBe(0);
  });

  it('should handle empty input', () => {
    const full = createFullAgeArray([], [], 10);
    expect(full.length).toBe(11);
    expect(full.every(v => v === 0)).toBe(true);
  });
});

describe('calibrateMortality (bisection)', () => {
  it('should find scaling factor to achieve target life expectancy', () => {
    // Test mortality from test-cz-2024
    const baseMx = [
      0.0036, 0.00123, 0.00132, 0.00147, 0.00168, 0.00195, 0.00228, 0.00267,
      0.00312, 0.00363, 0.0042, 0.00483, 0.00552, 0.00627, 0.00708, 0.00795,
      0.00888, 0.00987, 0.01092, 0.01203, 0.2
    ];
    
    // Get baseline e0
    const baselineE0 = calculateLifeExpectancy(baseMx);
    
    // Target higher life expectancy
    const targetE0 = baselineE0 + 2;
    
    const { scaledMx, actualE0, scalingFactor } = calibrateMortality(baseMx, targetE0);
    
    expect(actualE0).toBeCloseTo(targetE0, 0);
    expect(scalingFactor).toBeLessThan(1); // Lower mortality = higher e0
    expect(scaledMx.length).toBe(baseMx.length);
  });

  it('should find scaling factor for lower target life expectancy', () => {
    const baseMx = [
      0.0036, 0.00123, 0.00132, 0.00147, 0.00168, 0.00195, 0.00228, 0.00267,
      0.00312, 0.00363, 0.0042, 0.00483, 0.00552, 0.00627, 0.00708, 0.00795,
      0.00888, 0.00987, 0.01092, 0.01203, 0.2
    ];
    
    const baselineE0 = calculateLifeExpectancy(baseMx);
    const targetE0 = baselineE0 - 2;
    
    const { actualE0, scalingFactor } = calibrateMortality(baseMx, targetE0);
    
    expect(actualE0).toBeCloseTo(targetE0, 0);
    expect(scalingFactor).toBeGreaterThan(1); // Higher mortality = lower e0
  });

  it('should handle extreme target values gracefully', () => {
    const baseMx = new Array(21).fill(0.01);
    baseMx[20] = 0.5;
    
    // Very low target
    const { actualE0: lowE0 } = calibrateMortality(baseMx, 5);
    expect(lowE0).toBeGreaterThan(0);
    
    // Very high target
    const { actualE0: highE0 } = calibrateMortality(baseMx, 50);
    expect(highE0).toBeGreaterThan(0);
  });

  it('should return baseline when target equals current e0', () => {
    const baseMx = [
      0.0036, 0.00123, 0.00132, 0.00147, 0.00168, 0.00195, 0.00228, 0.00267,
      0.00312, 0.00363, 0.0042, 0.00483, 0.00552, 0.00627, 0.00708, 0.00795,
      0.00888, 0.00987, 0.01092, 0.01203, 0.2
    ];
    
    const baselineE0 = calculateLifeExpectancy(baseMx);
    const { scalingFactor, actualE0 } = calibrateMortality(baseMx, baselineE0);
    
    expect(scalingFactor).toBeCloseTo(1, 1);
    expect(actualE0).toBeCloseTo(baselineE0, 1);
  });
});

describe('integration: test dataset validation', () => {
  it('should produce valid qx from test mortality data', () => {
    // Test mortality from test-cz-2024
    const testMxMale = [
      0.0036, 0.00123, 0.00132, 0.00147, 0.00168, 0.00195, 0.00228, 0.00267,
      0.00312, 0.00363, 0.0042, 0.00483, 0.00552, 0.00627, 0.00708, 0.00795,
      0.00888, 0.00987, 0.01092, 0.01203, 0.2
    ];
    
    const qx = testMxMale.map(mxToQx);
    
    // All qx should be in [0, 1]
    qx.forEach((q, i) => {
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThanOrEqual(1);
      // qx should be slightly less than mx for small mx
      if (testMxMale[i] < 0.1) {
        expect(q).toBeLessThan(testMxMale[i]);
      }
    });
    
    // Last age should have high mortality
    expect(qx[20]).toBeCloseTo(1 - Math.exp(-0.2), 5);
  });

  it('should calculate reasonable life expectancy for test data', () => {
    const testMxMale = [
      0.0036, 0.00123, 0.00132, 0.00147, 0.00168, 0.00195, 0.00228, 0.00267,
      0.00312, 0.00363, 0.0042, 0.00483, 0.00552, 0.00627, 0.00708, 0.00795,
      0.00888, 0.00987, 0.01092, 0.01203, 0.2
    ];
    
    const e0 = calculateLifeExpectancy(testMxMale);
    
    // Expected around 20-25 based on test meta.json defaults
    expect(e0).toBeGreaterThan(15);
    expect(e0).toBeLessThan(30);
  });
});
