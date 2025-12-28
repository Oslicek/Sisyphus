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

/**
 * Format a number in billions as Czech text
 * @param amountInBillions - The amount in billions of CZK
 * @returns Formatted string like "3 365 miliard Kč"
 */
export function formatBillionsCzech(amountInBillions: number): string {
  const rounded = Math.round(amountInBillions * 10) / 10; // 1 decimal place
  const formatted = rounded.toLocaleString('cs-CZ', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  return `${formatted} miliard Kč`;
}
