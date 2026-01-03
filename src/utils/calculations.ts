/**
 * Check if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calculate deficit per second based on yearly deficit
 * @param yearlyDeficit - Total planned deficit for the year in CZK
 * @param year - The year (to determine if leap year)
 * @returns Deficit per second in CZK
 */
export function calculateDeficitPerSecond(yearlyDeficit: number, year: number): number {
  const daysInYear = isLeapYear(year) ? 366 : 365;
  const secondsInYear = daysInYear * 24 * 60 * 60;
  return yearlyDeficit / secondsInYear;
}

/**
 * Calculate seconds elapsed since anchor date
 * @param anchorDate - The reference date
 * @param currentDate - The current date
 * @returns Number of seconds between the two dates
 */
export function calculateSecondsSinceAnchor(anchorDate: Date, currentDate: Date): number {
  const diffMs = currentDate.getTime() - anchorDate.getTime();
  return Math.floor(diffMs / 1000);
}

/**
 * Calculate current debt based on base amount and elapsed time
 * @param baseAmount - Base debt amount at anchor date in CZK
 * @param deficitPerSecond - Deficit increment per second in CZK
 * @param secondsElapsed - Seconds since anchor date
 * @returns Current debt amount in CZK
 */
export function calculateCurrentDebt(
  baseAmount: number,
  deficitPerSecond: number,
  secondsElapsed: number
): number {
  return baseAmount + deficitPerSecond * secondsElapsed;
}

/**
 * Calculate debt growth rate per second from anchor amount to planned EOY debt
 * @param anchorAmount - Debt amount at anchor date in CZK
 * @param plannedEoyDebt - Planned end-of-year debt amount in CZK
 * @param anchorDate - The anchor date
 * @param eoyDate - End of year date (typically Jan 1 of next year at 00:00:00)
 * @returns Growth rate per second in CZK
 */
export function calculateDebtGrowthRate(
  anchorAmount: number,
  plannedEoyDebt: number,
  anchorDate: Date,
  eoyDate: Date
): number {
  const debtIncrease = plannedEoyDebt - anchorAmount;
  const secondsToEoy = (eoyDate.getTime() - anchorDate.getTime()) / 1000;
  return debtIncrease / secondsToEoy;
}

/**
 * Anchor entry type for multi-anchor support
 */
interface AnchorEntry {
  id: string;
  baseAmount: number;
  anchorDate: string;
  plannedEoyDebt?: number;
  plannedDeficit?: number;
  dailyIncrement?: number;
  eoyDate: string;
  calculationType: 'eoy-target' | 'deficit-based' | 'daily-increment';
}

/**
 * Select the active anchor based on current date
 * Returns the anchor whose period contains the current date
 * @param anchors - Array of anchor entries sorted by anchorDate
 * @param currentDate - The current date
 * @returns The active anchor entry
 */
export function selectActiveAnchor(
  anchors: AnchorEntry[],
  currentDate: Date
): AnchorEntry {
  // Sort anchors by anchorDate descending to find the most recent applicable one
  const sortedAnchors = [...anchors].sort((a, b) => {
    return new Date(b.anchorDate).getTime() - new Date(a.anchorDate).getTime();
  });
  
  // Find the first anchor whose anchorDate is <= currentDate
  for (const anchor of sortedAnchors) {
    const anchorDate = new Date(anchor.anchorDate + 'T00:00:00Z');
    if (currentDate >= anchorDate) {
      return anchor;
    }
  }
  
  // If no anchor found (shouldn't happen), return the first one
  return anchors[0];
}

/**
 * Calculate growth rate per second for a given anchor entry
 * Supports EOY target, deficit-based, and daily-increment calculation types
 * @param anchor - The anchor entry
 * @returns Growth rate per second in CZK
 */
export function calculateGrowthRateForAnchor(anchor: AnchorEntry): number {
  const anchorDate = new Date(anchor.anchorDate + 'T00:00:00Z');
  const eoyDate = new Date(anchor.eoyDate + 'T00:00:00Z');
  
  if (anchor.calculationType === 'eoy-target' && anchor.plannedEoyDebt !== undefined) {
    // Calculate rate to reach planned EOY debt
    return calculateDebtGrowthRate(anchor.baseAmount, anchor.plannedEoyDebt, anchorDate, eoyDate);
  } else if (anchor.calculationType === 'deficit-based' && anchor.plannedDeficit !== undefined) {
    // Calculate rate from deficit spread across the year
    const secondsInPeriod = (eoyDate.getTime() - anchorDate.getTime()) / 1000;
    return anchor.plannedDeficit / secondsInPeriod;
  } else if (anchor.calculationType === 'daily-increment' && anchor.dailyIncrement !== undefined) {
    // Calculate rate from fixed daily increment (for budget provisorium)
    const secondsPerDay = 24 * 60 * 60;
    return anchor.dailyIncrement / secondsPerDay;
  }
  
  // Fallback: return 0 if no valid calculation type
  return 0;
}





