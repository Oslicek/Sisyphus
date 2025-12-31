import type { HistoricalDebtPoint, ChartDataPoint } from '../types/debt';

/**
 * Get the yearly debt value from a data point
 */
export function getYearlyValue(point: HistoricalDebtPoint): number {
  return point.amount;
}

/**
 * Extract yearly debt data for chart display
 * Converts HistoricalDebtPoint[] to ChartDataPoint[]
 */
export function extractYearlyData(data: HistoricalDebtPoint[]): ChartDataPoint[] {
  return data.map((point) => ({
    year: point.year,
    amount: point.amount,
  }));
}

// Legacy alias for backwards compatibility
export const extractQ4Data = extractYearlyData;
export const getLatestQuarterValue = getYearlyValue;
