import { useState, useEffect } from 'react';
import type { 
  HistoricalDebtData, 
  ChartDataPoint, 
  EventsData, 
  ChartEvent,
  GovernmentsData,
  Government,
  PartyInfo,
  BudgetPlansData,
  BudgetPlan,
  EconomicData,
  EconomicYearData,
  DemographicData,
  DemographicYearData,
  WageData,
  WageYearData,
  PriceData,
  PriceYearData
} from '../types/debt';
import { extractQ4Data } from '../utils/historicalData';

interface UseHistoricalDebtResult {
  chartData: ChartDataPoint[];
  events: ChartEvent[];
  governments: Government[];
  parties: Record<string, PartyInfo>;
  budgetPlans: BudgetPlan[];
  economicData: EconomicYearData[];
  demographicData: DemographicYearData[];
  wageData: WageYearData[];
  priceData: PriceYearData[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that fetches historical debt data, events, governments, budget plans, and economic data
 */
export function useHistoricalDebt(): UseHistoricalDebtResult {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [events, setEvents] = useState<ChartEvent[]>([]);
  const [governments, setGovernments] = useState<Government[]>([]);
  const [parties, setParties] = useState<Record<string, PartyInfo>>({});
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [economicData, setEconomicData] = useState<EconomicYearData[]>([]);
  const [demographicData, setDemographicData] = useState<DemographicYearData[]>([]);
  const [wageData, setWageData] = useState<WageYearData[]>([]);
  const [priceData, setPriceData] = useState<PriceYearData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      try {
        const fetchOptions = { cache: 'no-store' as RequestCache };
        const [
          debtResponse, 
          eventsResponse, 
          governmentsResponse, 
          budgetResponse, 
          economicResponse, 
          demographicResponse,
          wageResponse,
          priceResponse
        ] = await Promise.all([
          fetch('/data/debt-historical.json', fetchOptions),
          fetch('/data/events.json', fetchOptions),
          fetch('/data/governments.json', fetchOptions),
          fetch('/data/budget-plans.json', fetchOptions),
          fetch('/data/economic-data.json', fetchOptions),
          fetch('/data/demographic-data.json', fetchOptions),
          fetch('/data/wage-data.json', fetchOptions),
          fetch('/data/price-data.json', fetchOptions),
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

        if (budgetResponse.ok) {
          const budgetData: BudgetPlansData = await budgetResponse.json();
          setBudgetPlans(budgetData.plans);
        }

        if (economicResponse.ok) {
          const economicDataJson: EconomicData = await economicResponse.json();
          setEconomicData(economicDataJson.data);
        }

        if (demographicResponse.ok) {
          const demographicDataJson: DemographicData = await demographicResponse.json();
          setDemographicData(demographicDataJson.data);
        }

        if (wageResponse.ok) {
          const wageDataJson: WageData = await wageResponse.json();
          setWageData(wageDataJson.data);
        }

        if (priceResponse.ok) {
          const priceDataJson: PriceData = await priceResponse.json();
          setPriceData(priceDataJson.data);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Neznámá chyba');
        setIsLoading(false);
      }
    }

    fetchAllData();
  }, []);

  return { chartData, events, governments, parties, budgetPlans, economicData, demographicData, wageData, priceData, isLoading, error };
}
