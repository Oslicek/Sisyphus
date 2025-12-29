import type { Government } from '../types/debt';

/**
 * Format year label for X axis
 * - 1993 and years divisible by 5 from 1995: full YYYY format
 * - All others: two-digit YY format
 */
export function formatYearLabel(year: number): string {
  if (year === 1993 || (year >= 1995 && year % 5 === 0)) {
    return year.toString();
  }
  return year.toString().slice(-2);
}

/**
 * Find the government that was in power for most of a given year
 * Uses December 31st of the year as reference point
 */
export function getGovernmentForYear(
  year: number,
  governments: Government[]
): Government | undefined {
  // Use end of year as reference point
  const referenceDate = new Date(`${year}-12-31`);
  
  return governments.find((gov) => {
    const start = new Date(gov.startDate);
    const end = gov.endDate ? new Date(gov.endDate) : new Date('2099-12-31');
    return referenceDate >= start && referenceDate <= end;
  });
}



