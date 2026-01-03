import { describe, it, expect } from 'vitest';
import { formatYearLabel, getGovernmentForYear } from './chartHelpers';
import type { Government } from '../types/debt';

describe('formatYearLabel', () => {
  it('should format 1993 as full year', () => {
    expect(formatYearLabel(1993)).toBe('1993');
  });

  it('should format 1995 as full year (divisible by 5)', () => {
    expect(formatYearLabel(1995)).toBe('1995');
  });

  it('should format 2000 as full year (divisible by 5)', () => {
    expect(formatYearLabel(2000)).toBe('2000');
  });

  it('should format 2025 as full year (divisible by 5)', () => {
    expect(formatYearLabel(2025)).toBe('2025');
  });

  it('should format 1994 as two-digit year', () => {
    expect(formatYearLabel(1994)).toBe('94');
  });

  it('should format 2003 as two-digit year', () => {
    expect(formatYearLabel(2003)).toBe('03');
  });

  it('should format 2019 as two-digit year', () => {
    expect(formatYearLabel(2019)).toBe('19');
  });
});

describe('getGovernmentForYear', () => {
  const governments: Government[] = [
    { name: 'Klaus I', startDate: '1993-01-01', endDate: '1996-07-04', party: 'ODS' },
    { name: 'Klaus II', startDate: '1996-07-04', endDate: '1998-01-02', party: 'ODS' },
    { name: 'Zeman', startDate: '1998-07-22', endDate: '2002-07-15', party: 'CSSD' },
  ];

  it('should find government for year 1993', () => {
    const result = getGovernmentForYear(1993, governments);
    expect(result?.name).toBe('Klaus I');
  });

  it('should find government for year 1999 (middle of term)', () => {
    const result = getGovernmentForYear(1999, governments);
    expect(result?.name).toBe('Zeman');
  });

  it('should find government for year when term ends (using end of year)', () => {
    // 1996-12-31 should still be Klaus II
    const result = getGovernmentForYear(1996, governments);
    expect(result?.name).toBe('Klaus II');
  });

  it('should return undefined for year with no government', () => {
    const result = getGovernmentForYear(1990, governments);
    expect(result).toBeUndefined();
  });

  it('should handle ongoing government (null endDate)', () => {
    const govs: Government[] = [
      { name: 'Babiš III', startDate: '2025-01-29', endDate: null, party: 'ANO' },
    ];
    const result = getGovernmentForYear(2025, govs);
    expect(result?.name).toBe('Babiš III');
  });
});













