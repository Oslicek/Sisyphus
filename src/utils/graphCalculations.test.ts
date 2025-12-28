import { describe, it, expect } from 'vitest';
import {
  adjustForInflation,
  calculateGdpPercentage,
  calculateYearlyDeficit,
  getCumulativeInflationFactor,
} from './graphCalculations';
import type { ChartDataPoint, EconomicYearData } from '../types/debt';

const mockEconomicData: EconomicYearData[] = [
  { year: 2020, inflationRate: 3.0, gdp: 5700 },
  { year: 2021, inflationRate: 4.0, gdp: 6100 },
  { year: 2022, inflationRate: 15.0, gdp: 6800 },
  { year: 2023, inflationRate: 10.0, gdp: 7300 },
  { year: 2024, inflationRate: 2.5, gdp: 7600 },
];

const mockDebtData: ChartDataPoint[] = [
  { year: 2020, amount: 2050 },
  { year: 2021, amount: 2466 },
  { year: 2022, amount: 2847 },
  { year: 2023, amount: 3112 },
  { year: 2024, amount: 3365 },
];

describe('getCumulativeInflationFactor', () => {
  it('should return 1 for the base year (most recent)', () => {
    const factor = getCumulativeInflationFactor(2024, 2024, mockEconomicData);
    expect(factor).toBeCloseTo(1, 2);
  });

  it('should calculate cumulative inflation for previous years', () => {
    // From 2023 to 2024: need to adjust by 2024 inflation (2.5%)
    const factor = getCumulativeInflationFactor(2023, 2024, mockEconomicData);
    expect(factor).toBeCloseTo(1.025, 3);
  });

  it('should accumulate multiple years of inflation', () => {
    // From 2022 to 2024: 2023 (10%) + 2024 (2.5%)
    const factor = getCumulativeInflationFactor(2022, 2024, mockEconomicData);
    // (1 + 0.10) * (1 + 0.025) = 1.1275
    expect(factor).toBeCloseTo(1.1275, 3);
  });

  it('should handle high inflation years correctly', () => {
    // From 2021 to 2024: 2022 (15%) + 2023 (10%) + 2024 (2.5%)
    const factor = getCumulativeInflationFactor(2021, 2024, mockEconomicData);
    // (1 + 0.15) * (1 + 0.10) * (1 + 0.025) = 1.296625
    expect(factor).toBeCloseTo(1.2966, 3);
  });
});

describe('adjustForInflation', () => {
  it('should not adjust the most recent year', () => {
    const result = adjustForInflation(mockDebtData, mockEconomicData, 2024);
    const lastPoint = result.find(d => d.year === 2024);
    expect(lastPoint?.amount).toBeCloseTo(3365, 0);
  });

  it('should increase older values to account for inflation', () => {
    const result = adjustForInflation(mockDebtData, mockEconomicData, 2024);
    const point2023 = result.find(d => d.year === 2023);
    // 3112 * 1.025 = 3189.8
    expect(point2023?.amount).toBeCloseTo(3190, 0);
  });

  it('should significantly increase values from high-inflation years', () => {
    const result = adjustForInflation(mockDebtData, mockEconomicData, 2024);
    const point2021 = result.find(d => d.year === 2021);
    // 2466 * 1.2966 = 3197.8
    expect(point2021?.amount).toBeGreaterThan(3000);
  });
});

describe('calculateGdpPercentage', () => {
  it('should calculate debt as percentage of GDP', () => {
    const result = calculateGdpPercentage(mockDebtData, mockEconomicData);
    const point2024 = result.find(d => d.year === 2024);
    // 3365 / 7600 * 100 = 44.28%
    expect(point2024?.amount).toBeCloseTo(44.28, 1);
  });

  it('should handle different GDP values correctly', () => {
    const result = calculateGdpPercentage(mockDebtData, mockEconomicData);
    const point2020 = result.find(d => d.year === 2020);
    // 2050 / 5700 * 100 = 35.96%
    expect(point2020?.amount).toBeCloseTo(35.96, 1);
  });

  it('should return 0 for years without GDP data', () => {
    const dataWithMissingYear: ChartDataPoint[] = [
      { year: 2019, amount: 1640 }, // No GDP data for 2019 in mock
    ];
    const result = calculateGdpPercentage(dataWithMissingYear, mockEconomicData);
    const point2019 = result.find(d => d.year === 2019);
    expect(point2019?.amount).toBe(0);
  });
});

describe('calculateYearlyDeficit', () => {
  it('should calculate difference between consecutive years', () => {
    const result = calculateYearlyDeficit(mockDebtData);
    
    // 2021: 2466 - 2050 = 416
    const point2021 = result.find(d => d.year === 2021);
    expect(point2021?.amount).toBeCloseTo(416, 0);
  });

  it('should return 0 for the first year (no previous data)', () => {
    const result = calculateYearlyDeficit(mockDebtData);
    const point2020 = result.find(d => d.year === 2020);
    expect(point2020?.amount).toBe(0);
  });

  it('should handle decreasing debt (negative deficit = surplus)', () => {
    const dataWithSurplus: ChartDataPoint[] = [
      { year: 2013, amount: 1683 },
      { year: 2014, amount: 1664 }, // Decrease
    ];
    const result = calculateYearlyDeficit(dataWithSurplus);
    const point2014 = result.find(d => d.year === 2014);
    expect(point2014?.amount).toBeCloseTo(-19, 0);
  });

  it('should calculate all years correctly', () => {
    const result = calculateYearlyDeficit(mockDebtData);
    
    // 2022: 2847 - 2466 = 381
    const point2022 = result.find(d => d.year === 2022);
    expect(point2022?.amount).toBeCloseTo(381, 0);
    
    // 2023: 3112 - 2847 = 265
    const point2023 = result.find(d => d.year === 2023);
    expect(point2023?.amount).toBeCloseTo(265, 0);
    
    // 2024: 3365 - 3112 = 253
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(253, 0);
  });
});

