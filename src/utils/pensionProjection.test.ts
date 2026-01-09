import { describe, it, expect } from 'vitest';
import {
  projectOneYear,
  runProjection,
  prepareProjectionParams,
  loadPensionDataset,
} from './pensionProjection';
import type { 
  PensionDataset, 
  SliderValues, 
  PopulationBySex,
} from '../types/pension';

// Test dataset (miniature version)
const testMeta = {
  datasetId: 'TEST_2024',
  country: 'TEST',
  baseYear: 2024,
  maxAge: 20,
  currency: 'TST',
  sexes: ['M', 'F'] as ['M', 'F'],
  ageMinFert: 15,
  ageMaxFert: 49,
  ageMinWork: 15,
  ageMaxWork: 74,
  srb: 1.055,
  defaults: {
    horizonYears: 50,
    tfr: 1.8,
    e0_M: 23.0,
    e0_F: 25.0,
    netMigPer1000: 2.0,
    avgPension0: 45000,
    wageGrowthReal: 0.01,
    unemploymentRate: 0.04,
    retAge: 18,
    indexWageWeight: 0.5,
  },
  sliderRanges: {
    tfr: [0.8, 2.6] as [number, number],
    e0_M: [15, 35] as [number, number],
    e0_F: [15, 35] as [number, number],
    netMigPer1000: [-10, 20] as [number, number],
    avgPension0: [20000, 80000] as [number, number],
    wageGrowthReal: [-0.01, 0.03] as [number, number],
    unemploymentRate: [0.01, 0.2] as [number, number],
    retAge: [15, 20] as [number, number],
    indexWageWeight: [0, 1] as [number, number],
  },
};

const testPopulation = {
  unit: 'persons' as const,
  population: {
    M: [5000, 4900, 4800, 4700, 4600, 4500, 4400, 4300, 4200, 4100,
        4000, 3800, 3600, 3300, 3000, 2700, 2300, 1900, 1500, 1100, 800],
    F: [4800, 4700, 4600, 4500, 4400, 4300, 4200, 4100, 4000, 3900,
        3800, 3700, 3600, 3500, 3400, 3200, 2900, 2500, 2100, 1700, 1300],
  },
};

const testFertility = {
  unit: 'share' as const,
  ages: [15, 16, 17, 18, 19, 20],
  shape: [0.05, 0.15, 0.3, 0.25, 0.15, 0.1],
};

const testMortality = {
  type: 'mx' as const,
  unit: 'perYear' as const,
  mx: {
    M: [0.0036, 0.00123, 0.00132, 0.00147, 0.00168, 0.00195, 0.00228, 0.00267,
        0.00312, 0.00363, 0.0042, 0.00483, 0.00552, 0.00627, 0.00708, 0.00795,
        0.00888, 0.00987, 0.01092, 0.01203, 0.2],
    F: [0.003, 0.001025, 0.0011, 0.001225, 0.0014, 0.001625, 0.0019, 0.002225,
        0.0026, 0.003025, 0.0035, 0.004025, 0.0046, 0.005225, 0.0059, 0.006625,
        0.0074, 0.008225, 0.0091, 0.010025, 0.2],
  },
};

const testLabor = {
  type: 'employmentRate' as const,
  unit: 'share' as const,
  emp: {
    M: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.7, 0.7, 0.7, 0.7, 0.55],
    F: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.65, 0.65, 0.65, 0.65, 0.65, 0.5],
  },
};

const testWage = {
  unit: 'relativeToAvgWage' as const,
  wRel: {
    M: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.55, 0.75, 0.95, 1.1, 1.05, 0.85],
    F: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.7, 0.9, 1.05, 1.0, 0.8],
  },
};

const testPensionParams = {
  unit: 'annual' as const,
  contribRate: 0.2,
  avgWage0: 100000,
  avgPension0: 45000,
  cpiAssumed: 0.02,
  baselineUnemploymentRate: 0.04,
};

const testMigration = {
  unit: 'share' as const,
  shape: {
    M: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.125, 0.25, 0.125],
    F: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.125, 0.25, 0.125],
  },
};

const testBaseline = {
  unit: 'annual' as const,
  totalPop0: 148700,
  wageBill0: 1272825000,
  workers0: 15800,
  pensioners0: 8500,
  contribRevenue0: 254565000,
  benefitSpending0: 382500000,
  gdp0: 0,
};

const testDataset: PensionDataset = {
  meta: testMeta,
  basePopulation: testPopulation,
  fertilityCurve: testFertility,
  mortalityCurves: testMortality,
  laborParticipation: testLabor,
  wageProfile: testWage,
  pensionParams: testPensionParams,
  migrationShape: testMigration,
  baselineTotals: testBaseline,
};

describe('prepareProjectionParams', () => {
  it('should prepare projection parameters from dataset and sliders', () => {
    const sliders: SliderValues = {
      horizonYears: 10,
      tfr: 1.8,
      e0_M: 23.0,
      e0_F: 25.0,
      netMigPer1000: 2.0,
      avgPension0: 45000,
      wageGrowthReal: 0.01,
      unemploymentRate: 0.04,
      retAge: 18,
      indexWageWeight: 0.5,
    };
    
    const params = prepareProjectionParams(testDataset, sliders);
    
    expect(params.maxAge).toBe(20);
    expect(params.retAge).toBe(18);
    expect(params.contribRate).toBe(0.2);
    expect(params.asfr.length).toBe(21);
    expect(params.qxM.length).toBe(21);
    expect(params.qxF.length).toBe(21);
    expect(params.empM.length).toBe(21);
    expect(params.empF.length).toBe(21);
    // Migration is now stored as rate + shapes for dynamic calculation
    expect(params.netMigPer1000).toBe(testMeta.defaults.netMigPer1000);
    expect(params.migShapeM.length).toBe(21);
    expect(params.migShapeF.length).toBe(21);
  });

  it('should scale employment rates based on unemployment rate', () => {
    // Lower unemployment = higher employment
    // baseline = 4%, target = 2% => multiplier = (1-0.02)/(1-0.04) = 0.98/0.96 ≈ 1.0208
    const sliders: SliderValues = {
      ...testMeta.defaults,
      unemploymentRate: 0.02,
    };
    
    const params = prepareProjectionParams(testDataset, sliders);
    const expectedMultiplier = (1 - 0.02) / (1 - 0.04);
    
    // Original rate at age 15 is 0.7, scaled by ~1.0208 = ~0.7146
    expect(params.empM[15]).toBeCloseTo(0.7 * expectedMultiplier, 2);
    // But clamped to max 1.0
    expect(params.empM[15]).toBeLessThanOrEqual(1);
  });
});

describe('projectOneYear', () => {
  it('should project population forward one year', () => {
    const sliders = testMeta.defaults;
    const params = prepareProjectionParams(testDataset, sliders);
    const initialPop: PopulationBySex = { ...testPopulation.population };
    
    const { newPop, births, deaths } = projectOneYear(initialPop, params);
    
    // New population should exist
    expect(newPop.M.length).toBe(21);
    expect(newPop.F.length).toBe(21);
    
    // Births should be positive
    expect(births).toBeGreaterThan(0);
    
    // Deaths should be positive
    expect(deaths).toBeGreaterThan(0);
    
    // Population should have changed
    const oldTotal = initialPop.M.reduce((a, b) => a + b, 0) + initialPop.F.reduce((a, b) => a + b, 0);
    const newTotal = newPop.M.reduce((a, b) => a + b, 0) + newPop.F.reduce((a, b) => a + b, 0);
    expect(newTotal).not.toBe(oldTotal);
  });

  it('should age cohorts correctly', () => {
    const sliders = { ...testMeta.defaults, tfr: 0, netMigPer1000: 0 };
    const params = prepareProjectionParams(testDataset, sliders);
    const initialPop: PopulationBySex = { 
      M: [...testPopulation.population.M],
      F: [...testPopulation.population.F],
    };
    
    const { newPop } = projectOneYear(initialPop, params);
    
    // Age 1 should be approximately (age 0 - deaths)
    // This is a rough check since mortality is applied
    expect(newPop.M[1]).toBeLessThan(initialPop.M[0]);
    expect(newPop.M[1]).toBeGreaterThan(0);
  });
});

describe('runProjection', () => {
  it('should run multi-year projection', () => {
    const sliders = testMeta.defaults;
    const horizonYears = 10;
    
    const result = runProjection(testDataset, sliders, horizonYears);
    
    expect(result.datasetId).toBe('TEST_2024');
    expect(result.baseYear).toBe(2024);
    expect(result.horizonYears).toBe(10);
    expect(result.points.length).toBe(11); // Year 0 through 10
  });

  it('should produce valid year points', () => {
    const sliders = testMeta.defaults;
    const result = runProjection(testDataset, sliders, 5);
    
    const point = result.points[0];
    
    expect(point.year).toBe(2024);
    expect(point.totalPop).toBeGreaterThan(0);
    expect(point.wageBill).toBeGreaterThan(0);
    expect(point.pensioners).toBeGreaterThan(0);
    expect(point.workers).toBeGreaterThan(0);
    expect(point.contrib).toBeGreaterThan(0);
    expect(point.benefits).toBeGreaterThan(0);
    expect(point.avgWage).toBeGreaterThan(0);
    expect(point.avgPension).toBeGreaterThan(0);
  });

  it('should show increasing wages over time with positive growth', () => {
    const sliders = { ...testMeta.defaults, wageGrowthReal: 0.02 };
    const result = runProjection(testDataset, sliders, 10);
    
    const wage0 = result.points[0].avgWage;
    const wage10 = result.points[10].avgWage;
    
    expect(wage10).toBeGreaterThan(wage0);
    // Should be approximately 1.02^10 = 1.219 times higher
    expect(wage10 / wage0).toBeCloseTo(1.219, 1);
  });

  it('should have initial deficit matching baseline', () => {
    const sliders = testMeta.defaults;
    const result = runProjection(testDataset, sliders, 1);
    
    const point0 = result.points[0];
    
    // Balance should be negative (deficit)
    expect(point0.balance).toBeLessThan(0);
    
    // Check approximate match to baseline
    expect(point0.pensioners).toBeCloseTo(testBaseline.pensioners0, -2);
    expect(point0.workers).toBeCloseTo(testBaseline.workers0, -2);
  });

  it('should track dependency ratio changes', () => {
    // With low fertility, dependency ratio should increase
    const sliders = { ...testMeta.defaults, tfr: 0.5 };
    const result = runProjection(testDataset, sliders, 20);
    
    const ratio0 = result.points[0].dependencyRatio;
    const ratio20 = result.points[20].dependencyRatio;
    
    // Dependency ratio should generally increase with low fertility
    // (fewer young workers, stable retirees initially)
    expect(ratio20).toBeGreaterThan(ratio0 * 0.5); // Should not collapse
  });

  it('should handle extreme slider values gracefully', () => {
    const extremeSliders: SliderValues = {
      horizonYears: 10,
      tfr: 0.8,           // Very low fertility
      e0_M: 35,           // High life expectancy
      e0_F: 35,
      netMigPer1000: -10, // High emigration
      avgPension0: 80000, // High pension
      wageGrowthReal: -0.01, // Wage decline
      unemploymentRate: 0.15, // High unemployment
      retAge: 15,         // Early retirement
      indexWageWeight: 1,
    };
    
    const result = runProjection(testDataset, extremeSliders, 10);
    
    // Should not crash and produce valid points
    expect(result.points.length).toBe(11);
    result.points.forEach(point => {
      expect(Number.isFinite(point.totalPop)).toBe(true);
      expect(Number.isFinite(point.balance)).toBe(true);
      expect(point.totalPop).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('loadPensionDataset', () => {
  it('should be a function that returns a Promise', () => {
    expect(typeof loadPensionDataset).toBe('function');
    // Can't test actual loading in unit tests without mocking fetch
  });
});
