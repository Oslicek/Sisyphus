import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV, calculateTotalRevenues, calculateTotalExpenditures } from './budgetData';

// Expected totals from P01 (official budget document)
const EXPECTED_TOTAL_REVENUES = 2_122_672_638_307;
const EXPECTED_TOTAL_EXPENDITURES = 2_408_672_638_307;

describe('Budget Data Validation', () => {
  describe('Total Revenues', () => {
    it('should calculate total revenues matching P01 (2 122 672 638 307 Kč)', () => {
      const csvPath = join(__dirname, '../../public/data/budget/fact_revenues_by_chapter.csv');
      const text = readFileSync(csvPath, 'utf-8');
      const rows = parseCSV(text);
      
      // Sum where class_code == '0' and kind == 'rev'
      const totalRevenues = calculateTotalRevenues(rows);
      
      expect(totalRevenues).toBe(EXPECTED_TOTAL_REVENUES);
    });
  });

  describe('Total Expenditures', () => {
    it('should calculate total expenditures matching P01 (2 408 672 638 307 Kč)', () => {
      const csvPath = join(__dirname, '../../public/data/budget/fact_expenditures_by_chapter.csv');
      const text = readFileSync(csvPath, 'utf-8');
      const rows = parseCSV(text);
      
      // Sum where class_code == '0', kind == 'exp', system == 'exp_druhove'
      const totalExpenditures = calculateTotalExpenditures(rows);
      
      expect(totalExpenditures).toBe(EXPECTED_TOTAL_EXPENDITURES);
    });
  });

  describe('Budget Deficit', () => {
    it('should calculate deficit as 286 billion Kč', () => {
      const deficit = EXPECTED_TOTAL_EXPENDITURES - EXPECTED_TOTAL_REVENUES;
      
      // Deficit should be exactly 286 billion (286 000 000 000)
      expect(deficit).toBe(286_000_000_000);
    });
  });
});
