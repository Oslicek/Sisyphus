import { useState, useEffect, useCallback } from 'react';
import type { DebtAnchor } from '../types/debt';
import {
  calculateDeficitPerSecond,
  calculateSecondsSinceAnchor,
  calculateCurrentDebt,
} from '../utils/calculations';

interface UseDebtCounterResult {
  currentDebt: number;
  deficitPerSecond: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that fetches debt anchor data and maintains a real-time counter
 * Updates every second based on calculated deficit rate
 */
export function useDebtCounter(): UseDebtCounterResult {
  const [anchorData, setAnchorData] = useState<DebtAnchor | null>(null);
  const [currentDebt, setCurrentDebt] = useState(0);
  const [deficitPerSecond, setDeficitPerSecond] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch anchor data on mount
  useEffect(() => {
    async function fetchAnchorData() {
      try {
        const response = await fetch('/data/debt-anchor.json');
        if (!response.ok) {
          throw new Error('Nepodařilo se načíst data');
        }
        const data: DebtAnchor = await response.json();
        setAnchorData(data);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Neznámá chyba');
        setIsLoading(false);
      }
    }

    fetchAnchorData();
  }, []);

  // Calculate and update debt every second
  const updateDebt = useCallback(() => {
    if (!anchorData) return;

    const anchorDate = new Date(anchorData.anchorDate + 'T00:00:00');
    const now = new Date();
    const currentYear = now.getFullYear();

    const perSecond = calculateDeficitPerSecond(
      anchorData.plannedDeficit2025,
      currentYear
    );
    setDeficitPerSecond(perSecond);

    const secondsElapsed = calculateSecondsSinceAnchor(anchorDate, now);
    const debt = calculateCurrentDebt(
      anchorData.baseAmount,
      perSecond,
      secondsElapsed
    );
    setCurrentDebt(debt);
  }, [anchorData]);

  // Initial calculation and interval setup
  useEffect(() => {
    if (!anchorData) return;

    // Calculate immediately
    updateDebt();

    // Update every second
    const intervalId = setInterval(updateDebt, 1000);

    return () => clearInterval(intervalId);
  }, [anchorData, updateDebt]);

  return {
    currentDebt,
    deficitPerSecond,
    isLoading,
    error,
  };
}





