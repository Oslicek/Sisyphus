/**
 * Debt anchor data structure
 * Contains the base amount and planned deficit for debt calculation
 */
export interface DebtAnchor {
  /** Base debt amount in CZK at anchor date */
  baseAmount: number;
  /** Anchor date in ISO 8601 format (YYYY-MM-DD) */
  anchorDate: string;
  /** Planned budget deficit for 2025 in CZK */
  plannedDeficit2025: number;
  /** Currency code */
  currency: string;
  /** Data source name */
  source: string;
  /** Last update date in ISO 8601 format */
  lastUpdated: string;
}

/**
 * Computed debt state for display
 */
export interface DebtState {
  /** Current computed debt amount in CZK */
  currentAmount: number;
  /** Deficit increment per second in CZK */
  deficitPerSecond: number;
  /** Timestamp when the calculation was made */
  calculatedAt: Date;
}

/**
 * Historical debt data point with optional quarterly data
 */
export interface HistoricalDebtPoint {
  year: number;
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
}

/**
 * Historical debt data structure from JSON file
 */
export interface HistoricalDebtData {
  source: string;
  sourceUrl: string;
  lastUpdated: string;
  currency: string;
  unit: string;
  description: string;
  data: HistoricalDebtPoint[];
}

/**
 * Processed data point for chart display
 */
export interface ChartDataPoint {
  year: number;
  amount: number; // in billion CZK
}
