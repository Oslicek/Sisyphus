import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  parseCSV, 
  parseChaptersCSV,
  parseBudgetItemsCSV,
  buildValueMapFromItems,
  buildNameMapFromItems,
  buildTreeFromItems,
  calculateTotalRevenues, 
  calculateTotalExpenditures,
  getRevenuesByChapter,
  getExpendituresByChapter,
  formatCurrency
} from './budgetData';
import type { BudgetRow, BudgetItem } from './budgetData';

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

describe('parseCSV', () => {
  it('should parse CSV with simple fields', () => {
    const csv = 'year,kind,system,page_number,chapter_code,chapter_name,class_code,amount_czk\n2026,rev,rev_druhove,1,301,Test Chapter,0,1000000';
    const rows = parseCSV(csv);
    
    expect(rows).toHaveLength(1);
    expect(rows[0].year).toBe(2026);
    expect(rows[0].kind).toBe('rev');
    expect(rows[0].chapter_code).toBe('301');
    expect(rows[0].chapter_name).toBe('Test Chapter');
    expect(rows[0].amount_czk).toBe(1000000);
  });

  it('should handle quoted fields with commas', () => {
    const csv = 'year,kind,system,page_number,chapter_code,chapter_name,class_code,amount_czk\n2026,rev,rev_druhove,1,333,"Ministerstvo školství, mládeže a tělovýchovy",0,5000000';
    const rows = parseCSV(csv);
    
    expect(rows).toHaveLength(1);
    expect(rows[0].chapter_name).toBe('Ministerstvo školství, mládeže a tělovýchovy');
  });

  it('should parse multiple rows', () => {
    const csv = `year,kind,system,page_number,chapter_code,chapter_name,class_code,amount_czk
2026,rev,rev_druhove,1,301,Chapter A,0,1000
2026,exp,exp_druhove,2,302,Chapter B,0,2000`;
    const rows = parseCSV(csv);
    
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe('rev');
    expect(rows[1].kind).toBe('exp');
  });
});

describe('parseChaptersCSV', () => {
  it('should parse chapters CSV', () => {
    const csv = 'chapter_code,chapter_name\n301,Kancelář prezidenta republiky\n302,Poslanecká sněmovna Parlamentu';
    const chapters = parseChaptersCSV(csv);
    
    expect(chapters).toHaveLength(2);
    expect(chapters[0].chapter_code).toBe('301');
    expect(chapters[0].chapter_name).toBe('Kancelář prezidenta republiky');
    expect(chapters[1].chapter_code).toBe('302');
  });

  it('should handle quoted chapter names with commas', () => {
    const csv = 'chapter_code,chapter_name\n333,"Ministerstvo školství, mládeže a tělovýchovy"';
    const chapters = parseChaptersCSV(csv);
    
    expect(chapters).toHaveLength(1);
    expect(chapters[0].chapter_name).toBe('Ministerstvo školství, mládeže a tělovýchovy');
  });
});

describe('parseBudgetItemsCSV', () => {
  it('should parse simple budget items CSV', () => {
    const csv = 'id,name,sum\n1,Daňové příjmy,1000000000\n11,Daň z příjmů,500000000';
    const items = parseBudgetItemsCSV(csv);
    
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('1');
    expect(items[0].name).toBe('Daňové příjmy');
    expect(items[0].sum).toBe(1000000000);
    expect(items[1].id).toBe('11');
    expect(items[1].sum).toBe(500000000);
  });

  it('should handle quoted names with commas', () => {
    const csv = 'id,name,sum\n333,"Ministerstvo školství, mládeže",5000000';
    const items = parseBudgetItemsCSV(csv);
    
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Ministerstvo školství, mládeže');
  });
});

describe('buildValueMapFromItems', () => {
  it('should build value map from items', () => {
    const items: BudgetItem[] = [
      { id: '1', name: 'A', sum: 1000 },
      { id: '2', name: 'B', sum: 2000 },
      { id: '3', name: 'C', sum: 0 } // should be excluded
    ];
    
    const map = buildValueMapFromItems(items);
    
    expect(map.size).toBe(2);
    expect(map.get('1')).toBe(1000);
    expect(map.get('2')).toBe(2000);
    expect(map.has('3')).toBe(false);
  });
});

describe('buildNameMapFromItems', () => {
  it('should build name map from items', () => {
    const items: BudgetItem[] = [
      { id: '1', name: 'Daňové příjmy', sum: 1000 },
      { id: '2', name: 'Nedaňové příjmy', sum: 2000 }
    ];
    
    const map = buildNameMapFromItems(items);
    
    expect(map.size).toBe(2);
    expect(map.get('1')).toBe('Daňové příjmy');
    expect(map.get('2')).toBe('Nedaňové příjmy');
  });
});

describe('buildTreeFromItems', () => {
  it('should build tree from simple items', () => {
    const items: BudgetItem[] = [
      { id: '0', name: 'Celkem', sum: 3000 },
      { id: '1', name: 'Parent', sum: 3000 },
      { id: '11', name: 'Child 1', sum: 1000 },
      { id: '12', name: 'Child 2', sum: 2000 }
    ];
    
    const tree = buildTreeFromItems(items);
    
    expect(tree).not.toBeNull();
    expect(tree.code).toBe('0');
    expect(tree.name).toBe('Celkem');
    expect(tree.value).toBe(3000);
    expect(tree.children).toHaveLength(1);
    expect(tree.children![0].code).toBe('1');
    expect(tree.children![0].children).toHaveLength(2);
  });

  it('should filter out zero-value items', () => {
    const items: BudgetItem[] = [
      { id: '0', name: 'Celkem', sum: 1000 },
      { id: '1', name: 'Has value', sum: 1000 },
      { id: '2', name: 'No value', sum: 0 }
    ];
    
    const tree = buildTreeFromItems(items);
    
    expect(tree.children).toHaveLength(1);
    expect(tree.children![0].code).toBe('1');
  });
});

describe('getRevenuesByChapter', () => {
  it('should return revenues by chapter for class_code=0', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '0', amount_czk: 1000 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '302', chapter_name: 'B', class_code: '0', amount_czk: 2000 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '1', amount_czk: 500 }, // should be ignored
    ];
    
    const result = getRevenuesByChapter(rows);
    
    expect(result.size).toBe(2);
    expect(result.get('301')).toBe(1000);
    expect(result.get('302')).toBe(2000);
  });

  it('should filter by year', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '0', amount_czk: 1000 },
      { year: 2025, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '302', chapter_name: 'B', class_code: '0', amount_czk: 2000 },
    ];
    
    const result = getRevenuesByChapter(rows, 2026);
    
    expect(result.size).toBe(1);
    expect(result.get('301')).toBe(1000);
  });
});

describe('getExpendituresByChapter', () => {
  it('should return expenditures by chapter for class_code=0 and system=exp_druhove', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'exp', system: 'exp_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '0', amount_czk: 5000 },
      { year: 2026, kind: 'exp', system: 'exp_odvetvove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '0', amount_czk: 5000 }, // should be ignored
      { year: 2026, kind: 'exp', system: 'exp_druhove', page_number: 1, chapter_code: '302', chapter_name: 'B', class_code: '0', amount_czk: 3000 },
    ];
    
    const result = getExpendituresByChapter(rows);
    
    expect(result.size).toBe(2);
    expect(result.get('301')).toBe(5000);
    expect(result.get('302')).toBe(3000);
  });

  it('should filter by year', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'exp', system: 'exp_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '0', amount_czk: 5000 },
      { year: 2025, kind: 'exp', system: 'exp_druhove', page_number: 1, chapter_code: '302', chapter_name: 'B', class_code: '0', amount_czk: 3000 },
    ];
    
    const result = getExpendituresByChapter(rows, 2026);
    
    expect(result.size).toBe(1);
    expect(result.get('301')).toBe(5000);
  });
});

describe('formatCurrency', () => {
  it('should format billions with mld. suffix', () => {
    const result = formatCurrency(2_122_672_638_307);
    expect(result).toContain('mld.');
    expect(result).toContain('2');
    expect(result).toContain('122');
    expect(result).toContain('67');
  });

  it('should format small billions correctly', () => {
    const result = formatCurrency(286_000_000_000);
    expect(result).toContain('286');
    expect(result).toContain('mld.');
  });

  it('should format millions with mil. suffix', () => {
    const result = formatCurrency(500_000_000);
    expect(result).toContain('500');
    expect(result).toContain('mil.');
  });

  it('should format smaller amounts in Kč', () => {
    const result = formatCurrency(999_999);
    expect(result).toContain('999');
    expect(result).toContain('Kč');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('0 Kč');
  });

  it('should handle negative values', () => {
    const negBillion = formatCurrency(-286_000_000_000);
    expect(negBillion).toContain('-');
    expect(negBillion).toContain('286');
    expect(negBillion).toContain('mld.');

    const negMillion = formatCurrency(-500_000_000);
    expect(negMillion).toContain('-');
    expect(negMillion).toContain('mil.');
  });
});

describe('New aggregated data files validation', () => {
  it('should have revenue total matching expected value', () => {
    const csvPath = join(__dirname, '../../public/data/budget/prijmy_druhove_2026.csv');
    const text = readFileSync(csvPath, 'utf-8');
    const items = parseBudgetItemsCSV(text);
    
    const totalItem = items.find(i => i.id === '0');
    expect(totalItem).toBeDefined();
    expect(totalItem!.sum).toBe(EXPECTED_TOTAL_REVENUES);
  });

  it('should have expenditure (druhové) total matching expected value', () => {
    const csvPath = join(__dirname, '../../public/data/budget/vydaje_druhove_2026.csv');
    const text = readFileSync(csvPath, 'utf-8');
    const items = parseBudgetItemsCSV(text);
    
    const totalItem = items.find(i => i.id === '0');
    expect(totalItem).toBeDefined();
    expect(totalItem!.sum).toBe(EXPECTED_TOTAL_EXPENDITURES);
  });

  it('should have expenditure (odvětvové) total matching expected value', () => {
    const csvPath = join(__dirname, '../../public/data/budget/vydaje_odvetvove_2026.csv');
    const text = readFileSync(csvPath, 'utf-8');
    const items = parseBudgetItemsCSV(text);
    
    const totalItem = items.find(i => i.id === '0');
    expect(totalItem).toBeDefined();
    expect(totalItem!.sum).toBe(EXPECTED_TOTAL_EXPENDITURES);
  });
});
