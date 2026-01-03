/**
 * Budget data utilities for parsing and calculating state budget totals.
 * 
 * Data structure:
 * - prijmy_druhove_2026.csv: Aggregated revenue data by classification code
 * - vydaje_druhove_2026.csv: Aggregated expenditure data by type classification
 * - vydaje_odvetvove_2026.csv: Aggregated expenditure data by sector classification
 * - fact_revenues_by_chapter.csv: Revenue data by chapter (for tables)
 * - fact_expenditures_by_chapter.csv: Expenditure data by chapter (for tables)
 */

// ============================================================================
// TYPES
// ============================================================================

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

export interface BudgetItem {
  id: string;
  name: string;
  sum: number;
}

export interface TreeNode {
  code: string;
  name: string;
  children?: TreeNode[];
  value?: number;
}

// ============================================================================
// SIMPLE FORMAT PARSERS (new aggregated files)
// ============================================================================

/**
 * Parse simple CSV format (id,name,sum) used by new aggregated files.
 */
export function parseBudgetItemsCSV(text: string): BudgetItem[] {
  const lines = text.trim().split('\n');
  
  return lines.slice(1).map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    return {
      id: values[0],
      name: values[1],
      sum: parseInt(values[2], 10) || 0
    };
  });
}

/**
 * Build a value map from budget items (id -> sum).
 */
export function buildValueMapFromItems(items: BudgetItem[]): Map<string, number> {
  const map = new Map<string, number>();
  items.forEach(item => {
    if (item.sum > 0) {
      map.set(item.id, item.sum);
    }
  });
  return map;
}

/**
 * Build a name map from budget items (id -> name).
 */
export function buildNameMapFromItems(items: BudgetItem[]): Map<string, string> {
  const map = new Map<string, string>();
  items.forEach(item => {
    map.set(item.id, item.name);
  });
  return map;
}

/**
 * Build a hierarchical tree from flat budget items.
 * Items are assumed to have hierarchical codes (e.g., "11", "111", "1111").
 */
export function buildTreeFromItems(items: BudgetItem[]): TreeNode {
  // Filter out zero values and the total (id='0')
  const validItems = items.filter(item => item.sum > 0 && item.id !== '0');
  
  // Sort by code length (shorter = higher level) then by code
  validItems.sort((a, b) => {
    if (a.id.length !== b.id.length) return a.id.length - b.id.length;
    return a.id.localeCompare(b.id);
  });
  
  // Find the root code (shortest non-zero item, typically "1", "2", etc.)
  const rootCodes = new Set<string>();
  validItems.forEach(item => {
    // Root is the first character for most items
    const rootChar = item.id.charAt(0);
    if (rootChar >= '1' && rootChar <= '9') {
      rootCodes.add(rootChar);
    }
  });
  
  // Build tree recursively
  function buildNode(code: string, name: string): TreeNode {
    const children: TreeNode[] = [];
    
    // Find direct children
    validItems.forEach(item => {
      if (item.id !== code && item.id.startsWith(code)) {
        // Check if this is a direct child (no intermediate codes)
        const isDirectChild = !validItems.some(other => 
          other.id !== code && 
          other.id !== item.id && 
          item.id.startsWith(other.id) && 
          other.id.startsWith(code)
        );
        
        if (isDirectChild) {
          children.push(buildNode(item.id, item.name));
        }
      }
    });
    
    const item = validItems.find(i => i.id === code);
    const value = item?.sum;
    
    return {
      code,
      name,
      children: children.length > 0 ? children : undefined,
      value
    };
  }
  
  // Build root node containing all top-level items
  const rootChildren: TreeNode[] = [];
  rootCodes.forEach(rootCode => {
    const item = validItems.find(i => i.id === rootCode);
    if (item) {
      rootChildren.push(buildNode(rootCode, item.name));
    }
  });
  
  // Get total from original items
  const totalItem = items.find(i => i.id === '0');
  
  return {
    code: '0',
    name: totalItem?.name || 'Celkem',
    children: rootChildren,
    value: totalItem?.sum
  };
}

// ============================================================================
// LEGACY PARSERS (for per-chapter files used by tables)
// ============================================================================

/**
 * Parse CSV text into budget rows, handling quoted fields.
 */
export function parseCSV(text: string): BudgetRow[] {
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

// ============================================================================
// CALCULATIONS (for tables)
// ============================================================================

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

// ============================================================================
// FORMATTING
// ============================================================================

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
