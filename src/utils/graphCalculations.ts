import type { ChartDataPoint, EconomicYearData, InterestYearData } from '../types/debt';

/**
 * Get cumulative inflation factor from a source year to a target year
 * This represents how much a value needs to be multiplied to adjust for inflation
 * @param sourceYear - The year of the original value
 * @param targetYear - The year to adjust to (usually most recent)
 * @param economicData - Economic data with inflation rates
 * @returns Cumulative inflation factor (1.0 means no adjustment)
 */
export function getCumulativeInflationFactor(
  sourceYear: number,
  targetYear: number,
  economicData: EconomicYearData[]
): number {
  if (sourceYear >= targetYear) {
    return 1;
  }

  let factor = 1;
  
  // Apply inflation for each year from sourceYear+1 to targetYear
  for (let year = sourceYear + 1; year <= targetYear; year++) {
    const yearData = economicData.find(d => d.year === year);
    if (yearData) {
      factor *= (1 + yearData.inflationRate / 100);
    }
  }
  
  return factor;
}

/**
 * Adjust debt values for inflation to a target year
 * @param data - Chart data points with amounts in billion CZK
 * @param economicData - Economic data with inflation rates
 * @param targetYear - Year to adjust values to (usually most recent)
 * @returns New array with inflation-adjusted amounts
 */
export function adjustForInflation(
  data: ChartDataPoint[],
  economicData: EconomicYearData[],
  targetYear: number
): ChartDataPoint[] {
  return data.map(point => ({
    ...point,
    amount: point.amount * getCumulativeInflationFactor(point.year, targetYear, economicData),
  }));
}

/**
 * Calculate debt as percentage of GDP
 * @param data - Chart data points with amounts in billion CZK
 * @param economicData - Economic data with GDP values
 * @returns New array with amounts as GDP percentage
 */
export function calculateGdpPercentage(
  data: ChartDataPoint[],
  economicData: EconomicYearData[]
): ChartDataPoint[] {
  return data.map(point => {
    const yearData = economicData.find(d => d.year === point.year);
    if (!yearData || yearData.gdp === 0) {
      return { ...point, amount: 0 };
    }
    return {
      ...point,
      amount: (point.amount / yearData.gdp) * 100,
    };
  });
}

/**
 * Calculate yearly deficit (change from previous year)
 * @param data - Chart data points with cumulative debt amounts
 * @returns New array with yearly deficit values
 */
export function calculateYearlyDeficit(data: ChartDataPoint[]): ChartDataPoint[] {
  // Sort by year to ensure correct order
  const sorted = [...data].sort((a, b) => a.year - b.year);
  
  return sorted.map((point, index) => {
    if (index === 0) {
      // First year has no previous year to compare
      return { ...point, amount: 0 };
    }
    
    const previousPoint = sorted[index - 1];
    return {
      ...point,
      amount: point.amount - previousPoint.amount,
    };
  });
}

/**
 * Calculate cumulative interest payments adjusted for inflation
 * Each year's interest payment is first adjusted to the target year's prices,
 * then summed cumulatively.
 * @param interestData - Interest payment data by year
 * @param economicData - Economic data with inflation rates
 * @param targetYear - Year to adjust values to (2025)
 * @returns Chart data points with cumulative inflation-adjusted interest
 */
export function calculateCumulativeInterest(
  interestData: InterestYearData[],
  economicData: EconomicYearData[],
  targetYear: number
): ChartDataPoint[] {
  // Sort by year to ensure correct order
  const sorted = [...interestData].sort((a, b) => a.year - b.year);
  
  let cumulativeSum = 0;
  
  return sorted.map(point => {
    // Adjust this year's interest payment for inflation
    const inflationFactor = getCumulativeInflationFactor(point.year, targetYear, economicData);
    const adjustedInterest = point.interest * inflationFactor;
    
    // Add to cumulative sum
    cumulativeSum += adjustedInterest;
    
    return {
      year: point.year,
      amount: cumulativeSum,
      isPrediction: point.isEstimate,
      planColor: point.isEstimate ? '#0033A0' : undefined,
    };
  });
}

