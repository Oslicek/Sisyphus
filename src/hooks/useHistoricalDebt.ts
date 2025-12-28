import { useState, useEffect } from 'react';
import type { 
  HistoricalDebtData, 
  ChartDataPoint, 
  EventsData, 
  ChartEvent,
  GovernmentsData,
  Government,
  PartyInfo 
} from '../types/debt';
import { extractQ4Data } from '../utils/historicalData';

interface UseHistoricalDebtResult {
  chartData: ChartDataPoint[];
  events: ChartEvent[];
  governments: Government[];
  parties: Record<string, PartyInfo>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that fetches historical debt data, events, and governments
 */
export function useHistoricalDebt(): UseHistoricalDebtResult {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [events, setEvents] = useState<ChartEvent[]>([]);
  const [governments, setGovernments] = useState<Government[]>([]);
  const [parties, setParties] = useState<Record<string, PartyInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      try {
        const [debtResponse, eventsResponse, governmentsResponse] = await Promise.all([
          fetch('/data/debt-historical.json'),
          fetch('/data/events.json'),
          fetch('/data/governments.json'),
        ]);

        if (!debtResponse.ok) {
          throw new Error('Nepodařilo se načíst historická data');
        }

        const debtData: HistoricalDebtData = await debtResponse.json();
        const processed = extractQ4Data(debtData.data);
        setChartData(processed);

        if (eventsResponse.ok) {
          const eventsData: EventsData = await eventsResponse.json();
          setEvents(eventsData.events);
        }

        if (governmentsResponse.ok) {
          const governmentsData: GovernmentsData = await governmentsResponse.json();
          setGovernments(governmentsData.governments);
          setParties(governmentsData.parties);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Neznámá chyba');
        setIsLoading(false);
      }
    }

    fetchAllData();
  }, []);

  return { chartData, events, governments, parties, isLoading, error };
}
