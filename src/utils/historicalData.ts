import type { HistoricalDebtPoint, ChartDataPoint } from '../types/debt';

/**
 * Get the latest available quarter value from a data point
 * Prefers Q4, falls back to Q3, Q2, Q1 in order
 */
export function getLatestQuarterValue(point: HistoricalDebtPoint): number | undefined {
  if (point.q4 !== undefined) return point.q4;
  if (point.q3 !== undefined) return point.q3;
  if (point.q2 !== undefined) return point.q2;
  if (point.q1 !== undefined) return point.q1;
  return undefined;
}

/**
 * Extract Q4 (or latest available quarter) data for chart display
 * Filters out years with no data
 */
export function extractQ4Data(data: HistoricalDebtPoint[]): ChartDataPoint[] {
  return data
    .map((point) => {
      const amount = getLatestQuarterValue(point);
      if (amount === undefined) return null;
      return { year: point.year, amount };
    })
    .filter((point): point is ChartDataPoint => point !== null);
}




