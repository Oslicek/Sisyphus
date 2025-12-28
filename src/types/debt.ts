/**
 * Debt anchor data structure
 * Contains the base amount and planned deficit for debt calculation
 */
export interface DebtAnchor {
  /** Base debt amount in CZK (haléře - smallest unit) at anchor date */
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

