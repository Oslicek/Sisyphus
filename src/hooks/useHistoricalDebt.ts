import { useState, useEffect } from 'react';
import type { HistoricalDebtData, ChartDataPoint } from '../types/debt';
import { extractQ4Data } from '../utils/historicalData';

interface UseHistoricalDebtResult {
  chartData: ChartDataPoint[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that fetches historical debt data and processes it for chart display
 */
export function useHistoricalDebt(): UseHistoricalDebtResult {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        const response = await fetch('/data/debt-historical.json');
        if (!response.ok) {
          throw new Error('Nepodařilo se načíst historická data');
        }
        const data: HistoricalDebtData = await response.json();
        const processed = extractQ4Data(data.data);
        setChartData(processed);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Neznámá chyba');
        setIsLoading(false);
      }
    }

    fetchHistoricalData();
  }, []);

  return { chartData, isLoading, error };
}

