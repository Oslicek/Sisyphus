/**
 * Budget data utilities for parsing and calculating state budget totals.
 * 
 * Data structure:
 * - fact_revenues_by_chapter.csv: Revenue data by chapter
 * - fact_expenditures_by_chapter.csv: Expenditure data by chapter
 * - fact_leaf_only.csv: Leaf codes only (no subtotals) for breakdowns
 * 
 * Key rules:
 * - For total revenues: SUM(amount_czk) WHERE class_code='0' AND kind='rev'
 * - For total expenditures: SUM(amount_czk) WHERE class_code='0' AND kind='exp' AND system='exp_druhove'
 * - For non-overlapping breakdowns: use fact_leaf_only.csv or filter is_leaf=true AND is_total=false
 */

export interface BudgetRow {
  year: number;
  kind: 'rev' | 'exp';
  system: string;
  page_number: number;
  chapter_code: string;
  chapter_name: string;
  class_code: string;
  amount_czk: number;
}

export interface Chapter {
  chapter_code: string;
  chapter_name: string;
}

export interface Classification {
  kind: string;
  system: string;
  code: string;
  name: string;
  parent_code: string;
  level: number;
  is_leaf: boolean;
  is_total: boolean;
}

export interface TreeNode {
  code: string;
  name: string;
  children?: TreeNode[];
  value?: number;
}

/**
 * Parse CSV text into budget rows, handling quoted fields.
 */
export function parseCSV(text: string): BudgetRow[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    // Handle quoted fields (chapter names may contain commas)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    const row: Record<string, string | number> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    
    return {
      year: parseInt(row.year as string, 10),
      kind: row.kind as 'rev' | 'exp',
      system: row.system as string,
      page_number: parseInt(row.page_number as string, 10) || 0,
      chapter_code: row.chapter_code as string,
      chapter_name: row.chapter_name as string,
      class_code: row.class_code as string,
      amount_czk: parseInt(row.amount_czk as string, 10) || 0
    };
  });
}

/**
 * Parse chapters CSV.
 */
export function parseChaptersCSV(text: string): Chapter[] {
  const lines = text.trim().split('\n');
  return lines.slice(1).map(line => {
    const [chapter_code, ...rest] = line.split(',');
    return {
      chapter_code,
      chapter_name: rest.join(',').replace(/^"|"$/g, '')
    };
  });
}

/**
 * Parse classification CSV.
 */
export function parseClassificationCSV(text: string): Classification[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    
    return {
      kind: row.kind,
      system: row.system,
      code: row.code,
      name: row.name,
      parent_code: row.parent_code,
      level: parseInt(row.level, 10) || 0,
      is_leaf: row.is_leaf === 'True',
      is_total: row.is_total === 'True'
    };
  });
}

/**
 * Calculate total revenues for a year.
 * Uses class_code='0' (total per chapter) and sums across all chapters.
 */
export function calculateTotalRevenues(rows: BudgetRow[], year: number = 2026): number {
  return rows
    .filter(row => row.year === year && row.kind === 'rev' && row.class_code === '0')
    .reduce((sum, row) => sum + row.amount_czk, 0);
}

/**
 * Calculate total expenditures for a year.
 * Uses class_code='0', kind='exp', system='exp_druhove' and sums across all chapters.
 */
export function calculateTotalExpenditures(rows: BudgetRow[], year: number = 2026): number {
  return rows
    .filter(row => 
      row.year === year && 
      row.kind === 'exp' && 
      row.system === 'exp_druhove' && 
      row.class_code === '0'
    )
    .reduce((sum, row) => sum + row.amount_czk, 0);
}

/**
 * Get revenues by chapter (using class_code='0' for totals).
 */
export function getRevenuesByChapter(rows: BudgetRow[], year: number = 2026): Map<string, number> {
  const result = new Map<string, number>();
  
  rows
    .filter(row => row.year === year && row.kind === 'rev' && row.class_code === '0')
    .forEach(row => {
      result.set(row.chapter_code, row.amount_czk);
    });
  
  return result;
}

/**
 * Get expenditures by chapter (using class_code='0' for totals).
 */
export function getExpendituresByChapter(rows: BudgetRow[], year: number = 2026): Map<string, number> {
  const result = new Map<string, number>();
  
  rows
    .filter(row => 
      row.year === year && 
      row.kind === 'exp' && 
      row.system === 'exp_druhove' && 
      row.class_code === '0'
    )
    .forEach(row => {
      result.set(row.chapter_code, row.amount_czk);
    });
  
  return result;
}

/**
 * Format amount in CZK to human-readable format.
 */
export function formatCurrency(amount: number): string {
  const billions = amount / 1_000_000_000;
  if (Math.abs(billions) >= 1) {
    return billions.toLocaleString('cs-CZ', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + ' mld.';
  }
  const millions = amount / 1_000_000;
  if (Math.abs(millions) >= 1) {
    return millions.toLocaleString('cs-CZ', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 1 
    }) + ' mil.';
  }
  return amount.toLocaleString('cs-CZ') + ' Kč';
}

/**
 * Enrich tree nodes with values from budget data.
 */
export function enrichTreeWithValues(
  node: TreeNode, 
  rows: BudgetRow[], 
  system: string,
  year: number = 2026
): TreeNode {
  // Find direct value for this code
  const relevantRows = rows.filter(
    row => row.year === year && row.system === system && row.class_code === node.code
  );
  
  const directValue = relevantRows.reduce((sum, row) => sum + Math.abs(row.amount_czk), 0);

  if (!node.children || node.children.length === 0) {
    return {
      ...node,
      value: directValue > 0 ? directValue : undefined
    };
  }

  const enrichedChildren = node.children
    .map(child => enrichTreeWithValues(child, rows, system, year))
    .filter(child => child.value !== undefined && child.value > 0);

  const childrenValue = enrichedChildren.reduce((sum, child) => sum + (child.value || 0), 0);
  
  return {
    ...node,
    children: enrichedChildren.length > 0 ? enrichedChildren : undefined,
    value: directValue > 0 ? directValue : (childrenValue > 0 ? childrenValue : undefined)
  };
}


