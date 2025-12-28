/**
 * Format a number as Czech currency (without currency symbol)
 * Uses spaces as thousand separators and rounds to whole numbers
 * @param amount - The amount in CZK
 * @returns Formatted string with Czech locale formatting
 */
export function formatCzechCurrency(amount: number): string {
  const rounded = Math.floor(amount);
  // Czech locale uses non-breaking spaces as thousand separators
  return rounded.toLocaleString('cs-CZ', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

