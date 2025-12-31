import { useState, useEffect, useCallback } from 'react';
import type { DebtAnchorData, DebtAnchorEntry } from '../types/debt';
import {
  calculateSecondsSinceAnchor,
  calculateCurrentDebt,
  selectActiveAnchor,
  calculateGrowthRateForAnchor,
} from '../utils/calculations';

interface UseDebtCounterResult {
  currentDebt: number;
  growthPerSecond: number;
  activeAnchorId: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that fetches debt anchor data and maintains a real-time counter
 * Supports multiple anchors with automatic switching based on current date
 * Updates every second based on calculated growth rate
 */
export function useDebtCounter(): UseDebtCounterResult {
  const [anchorData, setAnchorData] = useState<DebtAnchorData | null>(null);
  const [currentDebt, setCurrentDebt] = useState(0);
  const [growthPerSecond, setGrowthPerSecond] = useState(0);
  const [activeAnchorId, setActiveAnchorId] = useState('');
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
        const data: DebtAnchorData = await response.json();
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
    if (!anchorData || !anchorData.anchors || anchorData.anchors.length === 0) return;

    const now = new Date();
    
    // Select the active anchor based on current date
    const activeAnchor: DebtAnchorEntry = selectActiveAnchor(anchorData.anchors, now);
    setActiveAnchorId(activeAnchor.id);
    
    // Calculate growth rate for the active anchor
    const perSecond = calculateGrowthRateForAnchor(activeAnchor);
    setGrowthPerSecond(perSecond);

    // Calculate current debt
    const anchorDate = new Date(activeAnchor.anchorDate + 'T00:00:00');
    const secondsElapsed = calculateSecondsSinceAnchor(anchorDate, now);
    const debt = calculateCurrentDebt(
      activeAnchor.baseAmount,
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
    growthPerSecond,
    activeAnchorId,
    isLoading,
    error,
  };
}
