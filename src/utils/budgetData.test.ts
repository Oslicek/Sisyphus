import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  parseCSV, 
  parseChaptersCSV,
  parseClassificationCSV,
  calculateTotalRevenues, 
  calculateTotalExpenditures,
  getRevenuesByChapter,
  getExpendituresByChapter,
  formatCurrency,
  enrichTreeWithValues,
  buildEffectiveLeafValueMap
} from './budgetData';
import type { BudgetRow, TreeNode } from './budgetData';

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

describe('parseClassificationCSV', () => {
  it('should parse classification CSV', () => {
    const csv = 'kind,system,code,name,parent_code,level,is_leaf,is_total\nrev,rev_druhove,1,Daňové příjmy,0,1,False,False';
    const classifications = parseClassificationCSV(csv);
    
    expect(classifications).toHaveLength(1);
    expect(classifications[0].kind).toBe('rev');
    expect(classifications[0].code).toBe('1');
    expect(classifications[0].name).toBe('Daňové příjmy');
    expect(classifications[0].level).toBe(1);
    expect(classifications[0].is_leaf).toBe(false);
    expect(classifications[0].is_total).toBe(false);
  });

  it('should parse is_leaf and is_total flags correctly', () => {
    const csv = 'kind,system,code,name,parent_code,level,is_leaf,is_total\nrev,rev_druhove,11,Daň z příjmů,1,2,True,False\nrev,rev_druhove,0,Celkem,,-1,False,True';
    const classifications = parseClassificationCSV(csv);
    
    expect(classifications).toHaveLength(2);
    expect(classifications[0].is_leaf).toBe(true);
    expect(classifications[0].is_total).toBe(false);
    expect(classifications[1].is_leaf).toBe(false);
    expect(classifications[1].is_total).toBe(true);
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

describe('enrichTreeWithValues', () => {
  it('should enrich leaf nodes with values', () => {
    const tree: TreeNode = {
      code: '1',
      name: 'Root',
      children: [
        { code: '11', name: 'Child 1' },
        { code: '12', name: 'Child 2' }
      ]
    };
    
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '11', amount_czk: 1000 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '302', chapter_name: 'B', class_code: '12', amount_czk: 2000 },
    ];
    
    const result = enrichTreeWithValues(tree, rows, 'rev_druhove');
    
    expect(result.children).toBeDefined();
    expect(result.children).toHaveLength(2);
    expect(result.children![0].value).toBe(1000);
    expect(result.children![1].value).toBe(2000);
  });

  it('should sum values from multiple rows for same code', () => {
    const tree: TreeNode = { code: '11', name: 'Leaf' };
    
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '11', amount_czk: 1000 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '302', chapter_name: 'B', class_code: '11', amount_czk: 2000 },
    ];
    
    const result = enrichTreeWithValues(tree, rows, 'rev_druhove');
    
    expect(result.value).toBe(3000);
  });

  it('should filter out children with no values', () => {
    const tree: TreeNode = {
      code: '1',
      name: 'Root',
      children: [
        { code: '11', name: 'Has Value' },
        { code: '12', name: 'No Value' }
      ]
    };
    
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '11', amount_czk: 1000 },
    ];
    
    const result = enrichTreeWithValues(tree, rows, 'rev_druhove');
    
    expect(result.children).toBeDefined();
    expect(result.children).toHaveLength(1);
    expect(result.children![0].code).toBe('11');
  });

  it('should calculate parent value from children when no direct value', () => {
    const tree: TreeNode = {
      code: '1',
      name: 'Parent',
      children: [
        { code: '11', name: 'Child 1' },
        { code: '12', name: 'Child 2' }
      ]
    };
    
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '11', amount_czk: 1000 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '302', chapter_name: 'B', class_code: '12', amount_czk: 2000 },
    ];
    
    const result = enrichTreeWithValues(tree, rows, 'rev_druhove');
    
    expect(result.value).toBe(3000); // sum of children
  });

  it('should filter by year', () => {
    const tree: TreeNode = { code: '11', name: 'Leaf' };
    
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '11', amount_czk: 1000 },
      { year: 2025, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '11', amount_czk: 5000 },
    ];
    
    const result = enrichTreeWithValues(tree, rows, 'rev_druhove', 2026);
    
    expect(result.value).toBe(1000);
  });
});

describe('buildEffectiveLeafValueMap', () => {
  it('should aggregate values for simple leaf codes', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '111', amount_czk: 1000 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '302', chapter_name: 'B', class_code: '111', amount_czk: 2000 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    expect(result.get('111')).toBe(3000);
  });

  it('should skip parent codes when children exist in same chapter', () => {
    const rows: BudgetRow[] = [
      // Chapter 301 has both 41 and 411 - only 411 should count
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '41', amount_czk: 5000 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '411', amount_czk: 5000 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    // 41 should be skipped because 411 exists in same chapter
    expect(result.get('41')).toBeUndefined();
    expect(result.get('411')).toBe(5000);
  });

  it('should include parent codes when children do NOT exist in same chapter', () => {
    const rows: BudgetRow[] = [
      // Chapter 301 has 411 with child 4118
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '411', amount_czk: 1000 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '4118', amount_czk: 1000 },
      // Chapter 398 has only 411, no 4118
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '398', chapter_name: 'B', class_code: '411', amount_czk: 27000 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    // 411 should include value from chapter 398 (where it has no children)
    // but NOT from chapter 301 (where 4118 exists)
    expect(result.get('411')).toBe(27000);
    // 4118 should include value from chapter 301
    expect(result.get('4118')).toBe(1000);
  });

  it('should skip combined codes when all parts exist', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '31', amount_czk: 100 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '32', amount_czk: 200 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '31_32', amount_czk: 300 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    // 31_32 should be skipped because both 31 and 32 exist
    expect(result.get('31_32')).toBeUndefined();
    expect(result.get('31')).toBe(100);
    expect(result.get('32')).toBe(200);
  });

  it('should include combined codes when NOT all parts exist', () => {
    const rows: BudgetRow[] = [
      // Only 122_123 exists, without separate 122 and 123
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '122_123', amount_czk: 500 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    expect(result.get('122_123')).toBe(500);
  });

  it('should exclude class_code 0 (totals)', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '0', amount_czk: 99999 },
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '111', amount_czk: 1000 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    expect(result.get('0')).toBeUndefined();
    expect(result.get('111')).toBe(1000);
  });

  it('should filter by year correctly', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '111', amount_czk: 1000 },
      { year: 2025, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '111', amount_czk: 9999 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    expect(result.get('111')).toBe(1000);
  });

  it('should filter by system correctly', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '111', amount_czk: 1000 },
      { year: 2026, kind: 'exp', system: 'exp_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '111', amount_czk: 9999 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    expect(result.get('111')).toBe(1000);
  });

  it('should use absolute values for negative amounts', () => {
    const rows: BudgetRow[] = [
      { year: 2026, kind: 'rev', system: 'rev_druhove', page_number: 1, chapter_code: '301', chapter_name: 'A', class_code: '111', amount_czk: -1000 },
    ];
    
    const result = buildEffectiveLeafValueMap(rows, 'rev_druhove', 2026);
    
    expect(result.get('111')).toBe(1000);
  });
});
