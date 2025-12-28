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

