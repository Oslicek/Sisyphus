/**
 * Deficit Game Logic
 * 
 * Allows users to adjust budget items to try to eliminate the deficit.
 * Rules:
 * - Each item can be adjusted by max ±50% of its original value
 * - Increasing revenue reduces deficit
 * - Decreasing expenditure reduces deficit
 */

export interface BudgetAdjustment {
  id: string;
  name: string;
  type: 'revenue' | 'expenditure';
  originalValue: number;
  adjustmentAmount: number; // positive = increase, negative = decrease
}

/**
 * Calculate the adjusted deficit after applying all adjustments.
 * 
 * @param originalDeficit - The original deficit (negative number)
 * @param adjustments - Array of budget adjustments
 * @returns The new deficit (negative = deficit, positive = surplus)
 */
export function calculateAdjustedDeficit(
  originalDeficit: number,
  adjustments: BudgetAdjustment[]
): number {
  let improvement = 0;

  for (const adj of adjustments) {
    if (adj.type === 'revenue') {
      // Increasing revenue reduces deficit
      improvement += adj.adjustmentAmount;
    } else {
      // Decreasing expenditure (negative adjustmentAmount) reduces deficit
      improvement -= adj.adjustmentAmount;
    }
  }

  return originalDeficit + improvement;
}

/**
 * Calculate the maximum allowed adjustment for an item (±50%).
 * 
 * @param type - 'revenue' or 'expenditure'
 * @param originalValue - The original value of the item
 * @returns Object with min and max adjustment amounts
 */
export function calculateMaxAdjustment(
  _type: 'revenue' | 'expenditure',
  originalValue: number
): { min: number; max: number } {
  const maxChange = Math.abs(originalValue) * 0.5;
  return {
    min: maxChange === 0 ? 0 : -maxChange,
    max: maxChange
  };
}

/**
 * Create a new budget adjustment object.
 * 
 * @param id - Unique identifier for the adjustment
 * @param name - Display name of the budget item
 * @param type - 'revenue' or 'expenditure'
 * @param originalValue - The original value of the item
 * @param adjustmentAmount - Initial adjustment amount (default 0)
 * @returns BudgetAdjustment object
 */
export function createBudgetAdjustment(
  id: string,
  name: string,
  type: 'revenue' | 'expenditure',
  originalValue: number,
  adjustmentAmount: number = 0
): BudgetAdjustment {
  return {
    id,
    name,
    type,
    originalValue,
    adjustmentAmount
  };
}

/**
 * Validate that an adjustment is within the allowed range (±50%).
 * 
 * @param adjustment - The adjustment to validate
 * @returns true if valid, false if adjustment exceeds limits
 */
export function validateAdjustment(adjustment: BudgetAdjustment): boolean {
  const { min, max } = calculateMaxAdjustment(adjustment.type, adjustment.originalValue);
  return adjustment.adjustmentAmount >= min && adjustment.adjustmentAmount <= max;
}

/**
 * Format an adjustment for sharing (text format).
 * 
 * @param adjustment - The adjustment to format
 * @returns Formatted string for sharing
 */
export function formatAdjustmentForShare(adjustment: BudgetAdjustment): string {
  const billions = adjustment.adjustmentAmount / 1_000_000_000;
  const sign = adjustment.adjustmentAmount >= 0 ? '+' : '';
  const formattedAmount = `${sign}${billions.toFixed(1)} mld.`;
  
  return `${adjustment.name}: ${formattedAmount}`;
}

/**
 * Calculate the progress percentage toward eliminating the deficit.
 * 
 * @param originalDeficit - The original deficit (negative number)
 * @param currentDeficit - The current deficit after adjustments
 * @returns Progress percentage (0-100), clamped to valid range
 */
export function calculateProgressPercent(
  originalDeficit: number,
  currentDeficit: number
): number {
  // Improvement is how much we moved toward zero (or positive)
  // originalDeficit is negative, currentDeficit should be less negative (closer to 0) for improvement
  // improvement = currentDeficit - originalDeficit
  // e.g., -236B - (-286B) = 50B improvement
  const improvement = currentDeficit - originalDeficit;
  
  // Calculate percentage of original deficit that has been fixed
  const percentFixed = (improvement / Math.abs(originalDeficit)) * 100;
  
  // Clamp to 0-100 range
  return Math.min(100, Math.max(0, percentFixed));
}

/**
 * Format the complete game result for sharing.
 * 
 * @param originalDeficit - The original deficit
 * @param adjustments - Array of adjustments made
 * @returns Formatted string for sharing
 */
export function formatGameResultForShare(
  originalDeficit: number,
  adjustments: BudgetAdjustment[]
): string {
  const newDeficit = calculateAdjustedDeficit(originalDeficit, adjustments);
  const originalBillions = (originalDeficit / 1_000_000_000).toFixed(0);
  const newBillions = (newDeficit / 1_000_000_000).toFixed(0);
  
  let status: string;
  if (newDeficit === 0) {
    status = '✅ Vyrovnaný rozpočet!';
  } else if (newDeficit > 0) {
    status = '💰 Přebytek rozpočtu!';
  } else {
    status = `📉 Schodek: ${newBillions} mld.`;
  }
  
  const adjustmentCount = adjustments.filter(a => a.adjustmentAmount !== 0).length;
  
  let result = `🎮 Zrušil/a jsem schodek státního rozpočtu!\n\n`;
  result += `Původní schodek: ${originalBillions} mld. Kč\n`;
  result += `${status}\n\n`;
  result += `Počet úprav: ${adjustmentCount}\n\n`;
  
  if (adjustmentCount > 0) {
    result += `Moje úpravy:\n`;
    for (const adj of adjustments) {
      if (adj.adjustmentAmount !== 0) {
        result += `• ${formatAdjustmentForShare(adj)}\n`;
      }
    }
  }
  
  result += `\n🔗 Zkuste to také: rozpoctovka.cz`;
  
  return result;
}

