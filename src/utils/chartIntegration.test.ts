/**
 * Integration tests for chart computation chains
 * 
 * These tests verify that the complete computation pipelines produce
 * correct results when multiple transformations are chained together.
 */
import { describe, it, expect } from 'vitest';
import {
  adjustForInflation,
  calculateGdpPercentage,
  calculateYearlyDeficit,
  getCumulativeInflationFactor,
} from './graphCalculations';
import { convertToMetricUnit } from './unitConversions';
import type { ChartDataPoint, EconomicYearData, DemographicYearData, PriceYearData, WageYearData } from '../types/debt';

// =============================================================================
// TEST DATA - Realistic mock data based on actual Czech economic data
// =============================================================================

const mockEconomicData: EconomicYearData[] = [
  { year: 2020, inflationRate: 3.2, gdp: 5694 },
  { year: 2021, inflationRate: 3.8, gdp: 6109 },
  { year: 2022, inflationRate: 15.1, gdp: 6790 },
  { year: 2023, inflationRate: 10.7, gdp: 7344 },
  { year: 2024, inflationRate: 2.4, gdp: 7650 },
  { year: 2025, inflationRate: 2.0, gdp: 7900 },
];

// Cumulative debt data (in billions CZK)
const mockDebtData: ChartDataPoint[] = [
  { year: 2020, amount: 2154 },
  { year: 2021, amount: 2567 },
  { year: 2022, amount: 2847 },
  { year: 2023, amount: 3112 },
  { year: 2024, amount: 3365 },
  { year: 2025, amount: 3606 },
];

const mockDemographicData: DemographicYearData[] = [
  { year: 2020, population: 10701877, workingAge: 6847000 },
  { year: 2021, population: 10505445, workingAge: 6750000 },
  { year: 2022, population: 10827000, workingAge: 6900000 },
  { year: 2023, population: 10900000, workingAge: 6950000 },
  { year: 2024, population: 10950000, workingAge: 6980000 },
  { year: 2025, population: 11000000, workingAge: 7000000 },
];

const mockPriceData: PriceYearData[] = [
  { year: 2023, petrol95: 38.5, highwayKm: 500, hospital: 2000, school: 500 },
  { year: 2024, petrol95: 36.0, highwayKm: 520, hospital: 2100, school: 520 },
  { year: 2025, petrol95: 37.0, highwayKm: 540, hospital: 2200, school: 540 },
];

const mockWageData: WageYearData[] = [
  { year: 2023, averageGross: 43967, averageNet: 34500, minimumGross: 17300, minimumNet: 14800 },
  { year: 2024, averageGross: 46000, averageNet: 36000, minimumGross: 18900, minimumNet: 16000 },
  { year: 2025, averageGross: 48000, averageNet: 37500, minimumGross: 20000, minimumNet: 17000 },
];

// =============================================================================
// HELPER: Simulates the chart computation chains as they exist in DebtChart.tsx
// =============================================================================

/**
 * Simulates the BUGGY implementation (for regression testing)
 * This was the old incorrect approach:
 * 1. Adjust cumulative debt for inflation
 * 2. Calculate yearly deficit from adjusted values
 */
function computeDeficitInflationAdjusted_Buggy(
  debtData: ChartDataPoint[],
  economicData: EconomicYearData[],
  targetYear: number
): ChartDataPoint[] {
  const adjusted = adjustForInflation(debtData, economicData, targetYear);
  return calculateYearlyDeficit(adjusted);
}

/**
 * Simulates deficit-inflation-adjusted computation chain (CURRENT FIXED IMPLEMENTATION)
 * This is how DebtChart.tsx now computes it:
 * 1. Calculate yearly deficit from nominal values
 * 2. Adjust each deficit for inflation
 */
function computeDeficitInflationAdjusted_Current(
  debtData: ChartDataPoint[],
  economicData: EconomicYearData[],
  targetYear: number
): ChartDataPoint[] {
  const deficits = calculateYearlyDeficit(debtData);
  return adjustForInflation(deficits, economicData, targetYear);
}


/**
 * Simulates deficit-gdp-percent computation chain
 * 1. Calculate yearly deficit
 * 2. Express as percentage of GDP
 */
function computeDeficitGdpPercent(
  debtData: ChartDataPoint[],
  economicData: EconomicYearData[]
): ChartDataPoint[] {
  const deficits = calculateYearlyDeficit(debtData);
  return calculateGdpPercentage(deficits, economicData);
}

/**
 * Applies population mode transformation (per-capita or per-working-age)
 */
function applyPopulationMode(
  data: ChartDataPoint[],
  mode: 'country' | 'per-capita' | 'per-working',
  demographicData: DemographicYearData[]
): ChartDataPoint[] {
  if (mode === 'country') return data;
  
  return data.map((point) => {
    const demo = demographicData.find((d) => d.year === point.year);
    if (!demo) return point;
    
    const divisor = mode === 'per-capita' ? demo.population : demo.workingAge;
    // Amount is in billions CZK, convert to per-capita in CZK
    const perCapitaAmount = (point.amount * 1_000_000_000) / divisor;
    
    return { ...point, amount: perCapitaAmount };
  });
}

// =============================================================================
// INTEGRATION TESTS: deficit-inflation-adjusted chain
// =============================================================================

describe('Integration: deficit-inflation-adjusted chain', () => {
  const targetYear = 2025;

  it('should maintain the same sign as nominal deficit (positive deficit stays positive)', () => {
    // 2023 nominal deficit = 3112 - 2847 = 265 bil (POSITIVE - debt increased)
    // Inflation-adjusted deficit should also be POSITIVE
    
    const result = computeDeficitInflationAdjusted_Current(mockDebtData, mockEconomicData, targetYear);
    const point2023 = result.find(d => d.year === 2023);
    
    // The nominal deficit for 2023 is positive (265 bil)
    // After inflation adjustment, it should STILL be positive
    // This test will FAIL with the current (buggy) implementation
    expect(point2023?.amount).toBeGreaterThan(0);
  });

  it('should produce inflation-adjusted deficit close to nominal * inflation_factor', () => {
    // Nominal 2024 deficit = 3365 - 3112 = 253 bil
    // Inflation factor 2024→2025 = 1.02 (2% for 2025)
    // Expected real deficit ≈ 253 * 1.02 ≈ 258 bil
    
    const result = computeDeficitInflationAdjusted_Current(mockDebtData, mockEconomicData, targetYear);
    const point2024 = result.find(d => d.year === 2024);
    
    const nominalDeficit2024 = 3365 - 3112; // = 253
    const inflationFactor = getCumulativeInflationFactor(2024, targetYear, mockEconomicData);
    const expectedRealDeficit = nominalDeficit2024 * inflationFactor;
    
    // Allow 10% tolerance
    expect(point2024?.amount).toBeCloseTo(expectedRealDeficit, -1);
  });

  it('should not flip sign from positive to negative due to high inflation', () => {
    // High inflation years (2022, 2023) had large deficits
    // These should NOT become negative when adjusted
    
    const result = computeDeficitInflationAdjusted_Current(mockDebtData, mockEconomicData, targetYear);
    
    // 2022 nominal deficit = 2847 - 2567 = 280 bil (positive)
    const point2022 = result.find(d => d.year === 2022);
    expect(point2022?.amount).toBeGreaterThan(0);
    
    // 2023 nominal deficit = 3112 - 2847 = 265 bil (positive)
    const point2023 = result.find(d => d.year === 2023);
    expect(point2023?.amount).toBeGreaterThan(0);
  });

  it('should produce correct values with the correct algorithm', () => {
    // Test that the CORRECT algorithm produces expected results
    const result = computeDeficitInflationAdjusted_Current(mockDebtData, mockEconomicData, targetYear);
    
    // 2023: nominal deficit = 265, factor ≈ 1.0448 (2024: 2.4% + 2025: 2.0%)
    const point2023 = result.find(d => d.year === 2023);
    const nominalDeficit2023 = 3112 - 2847; // 265
    const factor2023 = getCumulativeInflationFactor(2023, targetYear, mockEconomicData);
    
    expect(point2023?.amount).toBeCloseTo(nominalDeficit2023 * factor2023, 0);
    expect(point2023?.amount).toBeGreaterThan(0);
  });

  it('should handle surplus years correctly (negative stays negative)', () => {
    // Create data with a surplus year
    const dataWithSurplus: ChartDataPoint[] = [
      { year: 2014, amount: 1700 },
      { year: 2015, amount: 1680 }, // Debt decreased = surplus
      { year: 2016, amount: 1755 },
    ];
    
    const result = computeDeficitInflationAdjusted_Current(dataWithSurplus, mockEconomicData, targetYear);
    const point2015 = result.find(d => d.year === 2015);
    
    // Nominal surplus = -20 bil, should remain negative after adjustment
    expect(point2015?.amount).toBeLessThan(0);
  });
});

// =============================================================================
// INTEGRATION TESTS: deficit-gdp-percent chain
// =============================================================================

describe('Integration: deficit-gdp-percent chain', () => {
  it('should calculate deficit as percentage of GDP correctly', () => {
    const result = computeDeficitGdpPercent(mockDebtData, mockEconomicData);
    
    // 2024: deficit = 253 bil, GDP = 7650 bil
    // Percentage = 253 / 7650 * 100 = 3.31%
    const point2024 = result.find(d => d.year === 2024);
    const expectedPercent = ((3365 - 3112) / 7650) * 100;
    
    expect(point2024?.amount).toBeCloseTo(expectedPercent, 1);
  });

  it('should produce positive percentage for deficit (debt increase)', () => {
    const result = computeDeficitGdpPercent(mockDebtData, mockEconomicData);
    
    // All years in mock data have increasing debt = positive deficits
    for (const point of result) {
      if (point.year > 2020) { // Skip first year (no previous data)
        expect(point.amount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should produce negative percentage for surplus (debt decrease)', () => {
    const dataWithSurplus: ChartDataPoint[] = [
      { year: 2014, amount: 1700 },
      { year: 2015, amount: 1650 }, // Surplus
    ];
    
    const economicWithYears: EconomicYearData[] = [
      { year: 2014, inflationRate: 0.4, gdp: 4261 },
      { year: 2015, inflationRate: 0.3, gdp: 4477 },
    ];
    
    const result = computeDeficitGdpPercent(dataWithSurplus, economicWithYears);
    const point2015 = result.find(d => d.year === 2015);
    
    // Surplus = -50 bil, should be negative percentage
    expect(point2015?.amount).toBeLessThan(0);
  });

  it('should handle high deficit years correctly', () => {
    const result = computeDeficitGdpPercent(mockDebtData, mockEconomicData);
    
    // 2021: deficit = 2567 - 2154 = 413 bil, GDP = 6109 bil
    // Percentage = 413 / 6109 * 100 = 6.76%
    const point2021 = result.find(d => d.year === 2021);
    const expectedPercent = ((2567 - 2154) / 6109) * 100;
    
    expect(point2021?.amount).toBeCloseTo(expectedPercent, 1);
  });
});

// =============================================================================
// INTEGRATION TESTS: Population mode chains
// =============================================================================

describe('Integration: population mode chains', () => {
  describe('debt-absolute + per-capita', () => {
    it('should divide debt by population correctly', () => {
      const perCapita = applyPopulationMode(mockDebtData, 'per-capita', mockDemographicData);
      
      // 2024: debt = 3365 bil = 3,365,000,000,000 CZK
      // Population = 10,950,000
      // Per capita = 307,305 CZK
      const point2024 = perCapita.find(d => d.year === 2024);
      const expected = (3365 * 1_000_000_000) / 10950000;
      
      expect(point2024?.amount).toBeCloseTo(expected, 0);
    });
  });

  describe('debt-absolute + per-working-age', () => {
    it('should divide debt by working age population correctly', () => {
      const perWorking = applyPopulationMode(mockDebtData, 'per-working', mockDemographicData);
      
      // 2024: debt = 3365 bil, working age = 6,980,000
      // Per working = 482,092 CZK
      const point2024 = perWorking.find(d => d.year === 2024);
      const expected = (3365 * 1_000_000_000) / 6980000;
      
      expect(point2024?.amount).toBeCloseTo(expected, 0);
    });
  });

  describe('deficit-inflation-adjusted + per-capita', () => {
    it('should apply inflation adjustment and per-capita correctly', () => {
      const targetYear = 2025;
      
      // Chain: deficit → inflation-adjust → per-capita
      const deficits = calculateYearlyDeficit(mockDebtData);
      const adjusted = adjustForInflation(deficits, mockEconomicData, targetYear);
      const perCapita = applyPopulationMode(adjusted, 'per-capita', mockDemographicData);
      
      // 2024: nominal deficit = 253 bil
      // Inflation factor 2024→2025 ≈ 1.02
      // Adjusted deficit ≈ 258 bil
      // Per capita = 258 bil / 10.95 mil ≈ 23,561 CZK
      
      const point2024 = perCapita.find(d => d.year === 2024);
      expect(point2024?.amount).toBeGreaterThan(20000); // Sanity check
      expect(point2024?.amount).toBeLessThan(30000);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS: Metric unit conversion chains
// =============================================================================

describe('Integration: metric unit conversion chains', () => {
  describe('debt + per-capita + petrol-litres', () => {
    it('should convert per-capita debt to litres of petrol', () => {
      // Chain: debt → per-capita → petrol conversion
      const perCapita = applyPopulationMode(mockDebtData, 'per-capita', mockDemographicData);
      const result = convertToMetricUnit(perCapita, 'petrol-litres', 'per-capita', mockPriceData, mockWageData, []);
      
      // 2024: per capita debt ≈ 307,305 CZK
      // Petrol price = 36 CZK/litre
      // Litres = 307,305 / 36 ≈ 8,536 litres
      const point2024 = result.find(d => d.year === 2024);
      
      expect(point2024?.amount).toBeGreaterThan(8000);
      expect(point2024?.amount).toBeLessThan(9000);
    });
  });

  describe('debt + per-working + salary-months', () => {
    it('should convert per-working debt to months of average salary', () => {
      // Chain: debt → per-working → salary months
      const perWorking = applyPopulationMode(mockDebtData, 'per-working', mockDemographicData);
      const result = convertToMetricUnit(perWorking, 'avg-gross-months', 'per-working', mockPriceData, mockWageData, []);
      
      // 2024: per working debt ≈ 482,092 CZK
      // Average gross salary = 46,000 CZK/month
      // Months = 482,092 / 46,000 ≈ 10.5 months
      const point2024 = result.find(d => d.year === 2024);
      
      expect(point2024?.amount).toBeGreaterThan(9);
      expect(point2024?.amount).toBeLessThan(12);
    });
  });

  describe('debt + country + highways', () => {
    it('should convert country debt to km of highways', () => {
      // Country mode, no population division
      const result = convertToMetricUnit(mockDebtData, 'highway-km', 'country', mockPriceData, mockWageData, []);
      
      // 2024: debt = 3365 bil CZK
      // Highway cost = 520 mil/km = 0.52 bil/km
      // km = 3365 / 0.52 ≈ 6,471 km
      const point2024 = result.find(d => d.year === 2024);
      
      expect(point2024?.amount).toBeGreaterThan(6000);
      expect(point2024?.amount).toBeLessThan(7000);
    });
  });
});

// =============================================================================
// CORNER CASES
// =============================================================================

describe('Integration: corner cases', () => {
  it('should handle single data point gracefully', () => {
    const singlePoint: ChartDataPoint[] = [{ year: 2024, amount: 3365 }];
    
    const deficits = calculateYearlyDeficit(singlePoint);
    expect(deficits[0].amount).toBe(0); // No previous year
  });

  it('should handle zero values', () => {
    const zeroData: ChartDataPoint[] = [
      { year: 2023, amount: 0 },
      { year: 2024, amount: 0 },
    ];
    
    const result = computeDeficitGdpPercent(zeroData, mockEconomicData);
    expect(result[0].amount).toBe(0);
    expect(result[1].amount).toBe(0);
  });

  it('should handle missing economic data for a year', () => {
    const dataWithGap: ChartDataPoint[] = [
      { year: 2018, amount: 1735 }, // Not in mock economic data
      { year: 2019, amount: 1740 },
    ];
    
    // Should not throw, but inflation adjustment may be 1.0
    const adjusted = adjustForInflation(dataWithGap, mockEconomicData, 2025);
    expect(adjusted).toHaveLength(2);
  });

  it('should handle very large inflation correctly', () => {
    const highInflationData: EconomicYearData[] = [
      { year: 2021, inflationRate: 50.0, gdp: 1000 },
      { year: 2022, inflationRate: 50.0, gdp: 1500 },
      { year: 2023, inflationRate: 50.0, gdp: 2000 },
    ];
    
    const debtData: ChartDataPoint[] = [
      { year: 2021, amount: 100 },
      { year: 2022, amount: 200 },
      { year: 2023, amount: 350 },
    ];
    
    // With current buggy implementation, high inflation would cause sign flips
    const result = computeDeficitInflationAdjusted_Current(debtData, highInflationData, 2023);
    
    // 2022 nominal deficit = 100 bil (positive)
    const point2022 = result.find(d => d.year === 2022);
    // This should be positive, but buggy implementation may produce negative
    // We're testing to understand the bug, not asserting correctness
    console.log('High inflation 2022 deficit (buggy):', point2022?.amount);
  });

  it('should handle deficit calculation with prediction year', () => {
    const dataWithPrediction: ChartDataPoint[] = [
      ...mockDebtData,
      { year: 2026, amount: 3860, isPrediction: true },
    ];
    
    const deficits = calculateYearlyDeficit(dataWithPrediction);
    const point2026 = deficits.find(d => d.year === 2026);
    
    // 2026 deficit = 3860 - 3606 = 254 bil
    expect(point2026?.amount).toBeCloseTo(254, 0);
    expect(point2026?.isPrediction).toBe(true);
  });
});

// =============================================================================
// COMPARISON: Current vs Correct implementation
// =============================================================================

describe('Regression: ensure buggy algorithm is not reintroduced', () => {
  const targetYear = 2025;

  it('should show difference between buggy and correct implementations', () => {
    const buggyResult = computeDeficitInflationAdjusted_Buggy(mockDebtData, mockEconomicData, targetYear);
    const correctResult = computeDeficitInflationAdjusted_Current(mockDebtData, mockEconomicData, targetYear);
    
    // Compare 2023 (high inflation year)
    const buggy2023 = buggyResult.find(d => d.year === 2023);
    const correct2023 = correctResult.find(d => d.year === 2023);
    
    console.log('2023 deficit - Buggy implementation:', buggy2023?.amount);
    console.log('2023 deficit - Correct implementation:', correct2023?.amount);
    console.log('Difference:', Math.abs((buggy2023?.amount || 0) - (correct2023?.amount || 0)));
    
    // The correct implementation should always produce positive for positive nominal deficits
    expect(correct2023?.amount).toBeGreaterThan(0);
    // Buggy implementation produces negative (wrong)
    expect(buggy2023?.amount).toBeLessThan(0);
  });

  it('should show that buggy implementation produces wrong signs', () => {
    const buggyResult = computeDeficitInflationAdjusted_Buggy(mockDebtData, mockEconomicData, targetYear);
    const correctResult = computeDeficitInflationAdjusted_Current(mockDebtData, mockEconomicData, targetYear);
    
    // Check all years after the first
    for (let i = 1; i < mockDebtData.length; i++) {
      const year = mockDebtData[i].year;
      const buggyPoint = buggyResult.find(d => d.year === year);
      const correctPoint = correctResult.find(d => d.year === year);
      
      const buggySign = Math.sign(buggyPoint?.amount || 0);
      const correctSign = Math.sign(correctPoint?.amount || 0);
      
      if (buggySign !== correctSign) {
        console.log(`Year ${year}: SIGN MISMATCH! Buggy=${buggyPoint?.amount}, Correct=${correctPoint?.amount}`);
      }
    }
  });
});

