import { describe, it, expect } from 'vitest';
import {
  convertToMetricUnit,
  convertToHighwayKm,
  convertToHospitals,
  convertToSchools,
  convertToPetrolLitres,
  convertToSalaryMonths,
  convertToFoodUnits,
} from './unitConversions';
import type { ChartDataPoint, PriceYearData, WageYearData, FoodPriceYearData } from '../types/debt';

const mockPriceData: PriceYearData[] = [
  { year: 2024, petrol95: 38.2, highwayKm: 920, hospital: 5100, school: 460 },
  { year: 2025, petrol95: 39.5, highwayKm: 950, hospital: 5300, school: 480 },
];

const mockWageData: WageYearData[] = [
  { year: 2024, averageGross: 45854, averageNet: 34391, minimumGross: 18900, minimumNet: 14175 },
  { year: 2025, averageGross: 48500, averageNet: 36375, minimumGross: 20800, minimumNet: 15600 },
];

const mockChartData: ChartDataPoint[] = [
  { year: 2024, amount: 3365 },  // 3365 billion CZK
  { year: 2025, amount: 3600 },  // 3600 billion CZK
];

// Per-capita data (in CZK, not billions)
const mockPerCapitaData: ChartDataPoint[] = [
  { year: 2024, amount: 309000 },  // 309,000 CZK per person
  { year: 2025, amount: 330000 },  // 330,000 CZK per person
];

describe('convertToHighwayKm', () => {
  it('should convert billions CZK to highway kilometers', () => {
    // 3365 billion CZK / 920 million per km = 3,657,609 km
    // 3365 * 1000 / 920 = 3657.6 km (billions to millions ratio)
    const result = convertToHighwayKm(mockChartData, mockPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(3658, 0);
  });

  it('should handle different years with different prices', () => {
    const result = convertToHighwayKm(mockChartData, mockPriceData);
    const point2025 = result.find(d => d.year === 2025);
    // 3600 * 1000 / 950 = 3789.5 km
    expect(point2025?.amount).toBeCloseTo(3789, 0);
  });

  it('should return 0 for years without price data', () => {
    const dataWithMissingYear: ChartDataPoint[] = [{ year: 1990, amount: 100 }];
    const result = convertToHighwayKm(dataWithMissingYear, mockPriceData);
    expect(result[0].amount).toBe(0);
  });
});

describe('convertToHospitals', () => {
  it('should convert billions CZK to number of hospitals', () => {
    // 3365 billion CZK / 5100 million per hospital = 659.8 hospitals
    const result = convertToHospitals(mockChartData, mockPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(660, 0);
  });

  it('should return 0 for zero hospital cost', () => {
    const priceWithZero: PriceYearData[] = [
      { year: 2024, petrol95: 38.2, highwayKm: 920, hospital: 0, school: 460 },
    ];
    const result = convertToHospitals([{ year: 2024, amount: 3365 }], priceWithZero);
    expect(result[0].amount).toBe(0);
  });
});

describe('convertToSchools', () => {
  it('should convert billions CZK to number of schools', () => {
    // 3365 billion CZK / 460 million per school = 7315.2 schools
    const result = convertToSchools(mockChartData, mockPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(7315, 0);
  });

  it('should return 0 for zero school cost', () => {
    const priceWithZero: PriceYearData[] = [
      { year: 2024, petrol95: 38.2, highwayKm: 920, hospital: 5100, school: 0 },
    ];
    const result = convertToSchools([{ year: 2024, amount: 3365 }], priceWithZero);
    expect(result[0].amount).toBe(0);
  });
});

describe('convertToPetrolLitres', () => {
  it('should convert CZK to litres of petrol', () => {
    // 309000 CZK / 38.2 per litre = 8089.0 litres
    const result = convertToPetrolLitres(mockPerCapitaData, mockPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(8089, 0);
  });

  it('should return 0 for zero petrol price', () => {
    const priceWithZero: PriceYearData[] = [
      { year: 2024, petrol95: 0, highwayKm: 920, hospital: 5100, school: 460 },
    ];
    const result = convertToPetrolLitres([{ year: 2024, amount: 309000 }], priceWithZero);
    expect(result[0].amount).toBe(0);
  });
});

describe('convertToSalaryMonths', () => {
  it('should convert CZK to months of average gross salary', () => {
    // 309000 CZK / 45854 per month = 6.74 months
    const result = convertToSalaryMonths(mockPerCapitaData, mockWageData, 'averageGross');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(6.74, 1);
  });

  it('should convert CZK to months of average net salary', () => {
    // 309000 CZK / 34391 per month = 8.98 months
    const result = convertToSalaryMonths(mockPerCapitaData, mockWageData, 'averageNet');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(8.98, 1);
  });

  it('should convert CZK to months of minimum gross wage', () => {
    // 309000 CZK / 18900 per month = 16.35 months
    const result = convertToSalaryMonths(mockPerCapitaData, mockWageData, 'minimumGross');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(16.35, 1);
  });

  it('should convert CZK to months of minimum net wage', () => {
    // 309000 CZK / 14175 per month = 21.80 months
    const result = convertToSalaryMonths(mockPerCapitaData, mockWageData, 'minimumNet');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(21.80, 1);
  });

  it('should return 0 for years without wage data', () => {
    const dataWithMissingYear: ChartDataPoint[] = [{ year: 1990, amount: 100000 }];
    const result = convertToSalaryMonths(dataWithMissingYear, mockWageData, 'averageGross');
    expect(result[0].amount).toBe(0);
  });

  it('should return 0 for zero salary', () => {
    const wageWithZero: WageYearData[] = [
      { year: 2024, averageGross: 0, averageNet: 34391, minimumGross: 18900, minimumNet: 14175 },
    ];
    const dataForZeroTest: ChartDataPoint[] = [{ year: 2024, amount: 100000 }];
    const result = convertToSalaryMonths(dataForZeroTest, wageWithZero, 'averageGross');
    expect(result[0].amount).toBe(0);
  });
});

describe('convertToMetricUnit', () => {
  it('should return original data for czk unit', () => {
    const result = convertToMetricUnit(mockChartData, 'czk', 'country', mockPriceData, mockWageData);
    expect(result).toEqual(mockChartData);
  });

  it('should convert to highway-km for country mode', () => {
    const result = convertToMetricUnit(mockChartData, 'highway-km', 'country', mockPriceData, mockWageData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(3658, 0);
  });

  it('should convert to petrol-litres for per-capita mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'petrol-litres', 'per-capita', mockPriceData, mockWageData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(8089, 0);
  });

  it('should convert to avg-gross-months for per-working mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'avg-gross-months', 'per-working', mockPriceData, mockWageData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(6.74, 1);
  });

  it('should convert to hospitals for country mode', () => {
    const result = convertToMetricUnit(mockChartData, 'hospitals', 'country', mockPriceData, mockWageData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(660, 0);
  });

  it('should convert to schools for country mode', () => {
    const result = convertToMetricUnit(mockChartData, 'schools', 'country', mockPriceData, mockWageData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(7315, 0);
  });

  it('should convert to avg-net-months for per-working mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'avg-net-months', 'per-working', mockPriceData, mockWageData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(8.98, 1);
  });

  it('should convert to min-gross-months for per-working mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'min-gross-months', 'per-working', mockPriceData, mockWageData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(16.35, 1);
  });

  it('should convert to min-net-months for per-working mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'min-net-months', 'per-working', mockPriceData, mockWageData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(21.80, 1);
  });

  it('should return original data for invalid unit in country mode', () => {
    const result = convertToMetricUnit(mockChartData, 'petrol-litres' as any, 'country', mockPriceData, mockWageData);
    expect(result).toEqual(mockChartData);
  });

  it('should return original data for invalid unit in per-capita mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'highway-km' as any, 'per-capita', mockPriceData, mockWageData);
    expect(result).toEqual(mockPerCapitaData);
  });

  it('should return original data for invalid unit in per-working mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'petrol-litres' as any, 'per-working', mockPriceData, mockWageData);
    expect(result).toEqual(mockPerCapitaData);
  });

  it('should return original data for unknown mode', () => {
    const result = convertToMetricUnit(mockChartData, 'highway-km', 'unknown' as any, mockPriceData, mockWageData);
    expect(result).toEqual(mockChartData);
  });
});

// Food price data for tests
const mockFoodPriceData: FoodPriceYearData[] = [
  { year: 2024, bread: 58.5, eggs: 52.0, butter: 268.0, potatoes: 24.5, beer: 20.5 },
  { year: 2025, bread: 62.0, eggs: 54.0, butter: 265.0, potatoes: 22.0, beer: 21.0 },
];

describe('convertToFoodUnits', () => {
  it('should convert CZK to kilograms of bread', () => {
    // 309000 CZK / 58.5 per kg = 5282 kg
    const result = convertToFoodUnits(mockPerCapitaData, mockFoodPriceData, 'bread');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(5282, 0);
  });

  it('should convert CZK to 10-packs of eggs', () => {
    // 309000 CZK / 52.0 per 10eggs = 5942 packs
    const result = convertToFoodUnits(mockPerCapitaData, mockFoodPriceData, 'eggs');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(5942, 0);
  });

  it('should convert CZK to kilograms of butter', () => {
    // 309000 CZK / 268.0 per kg = 1153 kg
    const result = convertToFoodUnits(mockPerCapitaData, mockFoodPriceData, 'butter');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(1153, 0);
  });

  it('should convert CZK to kilograms of potatoes', () => {
    // 309000 CZK / 24.5 per kg = 12612 kg
    const result = convertToFoodUnits(mockPerCapitaData, mockFoodPriceData, 'potatoes');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(12612, 0);
  });

  it('should convert CZK to 0.5l bottles of beer', () => {
    // 309000 CZK / 20.5 per bottle = 15073 bottles
    const result = convertToFoodUnits(mockPerCapitaData, mockFoodPriceData, 'beer');
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(15073, 0);
  });

  it('should return 0 for years without food price data', () => {
    const dataWithMissingYear: ChartDataPoint[] = [{ year: 2000, amount: 100000 }];
    const result = convertToFoodUnits(dataWithMissingYear, mockFoodPriceData, 'bread');
    expect(result[0].amount).toBe(0);
  });

  it('should return 0 for zero food price', () => {
    const foodWithZero: FoodPriceYearData[] = [
      { year: 2024, bread: 0, eggs: 52.0, butter: 268.0, potatoes: 24.5, beer: 20.5 },
    ];
    const result = convertToFoodUnits([{ year: 2024, amount: 100000 }], foodWithZero, 'bread');
    expect(result[0].amount).toBe(0);
  });
});

describe('convertToMetricUnit with food items', () => {
  it('should convert to bread-kg for per-capita mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'bread-kg', 'per-capita', mockPriceData, mockWageData, mockFoodPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(5282, 0);
  });

  it('should convert to eggs-10 for per-capita mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'eggs-10', 'per-capita', mockPriceData, mockWageData, mockFoodPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(5942, 0);
  });

  it('should convert to butter-kg for per-capita mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'butter-kg', 'per-capita', mockPriceData, mockWageData, mockFoodPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(1153, 0);
  });

  it('should convert to potatoes-kg for per-capita mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'potatoes-kg', 'per-capita', mockPriceData, mockWageData, mockFoodPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(12612, 0);
  });

  it('should convert to beer-05l for per-capita mode', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'beer-05l', 'per-capita', mockPriceData, mockWageData, mockFoodPriceData);
    const point2024 = result.find(d => d.year === 2024);
    expect(point2024?.amount).toBeCloseTo(15073, 0);
  });
});

describe('convertToMetricUnit edge cases - missing food price data', () => {
  it('should return original data for bread-kg when foodPriceData is undefined', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'bread-kg', 'per-capita', mockPriceData, mockWageData, undefined);
    expect(result).toEqual(mockPerCapitaData);
  });

  it('should return original data for eggs-10 when foodPriceData is undefined', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'eggs-10', 'per-capita', mockPriceData, mockWageData, undefined);
    expect(result).toEqual(mockPerCapitaData);
  });

  it('should return original data for butter-kg when foodPriceData is undefined', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'butter-kg', 'per-capita', mockPriceData, mockWageData, undefined);
    expect(result).toEqual(mockPerCapitaData);
  });

  it('should return original data for potatoes-kg when foodPriceData is undefined', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'potatoes-kg', 'per-capita', mockPriceData, mockWageData, undefined);
    expect(result).toEqual(mockPerCapitaData);
  });

  it('should return original data for beer-05l when foodPriceData is undefined', () => {
    const result = convertToMetricUnit(mockPerCapitaData, 'beer-05l', 'per-capita', mockPriceData, mockWageData, undefined);
    expect(result).toEqual(mockPerCapitaData);
  });
});

