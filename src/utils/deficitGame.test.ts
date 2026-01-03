import { describe, it, expect } from 'vitest';
import {
  calculateAdjustedDeficit,
  calculateMaxAdjustment,
  createBudgetAdjustment,
  validateAdjustment,
  formatAdjustmentForShare,
  formatGameResultForShare,
  calculateProgressPercent,
  type BudgetAdjustment
} from './deficitGame';

describe('Deficit Game Logic', () => {
  describe('calculateAdjustedDeficit', () => {
    it('should return original deficit when no adjustments', () => {
      const originalDeficit = -286_000_000_000;
      const adjustments: BudgetAdjustment[] = [];
      
      expect(calculateAdjustedDeficit(originalDeficit, adjustments)).toBe(-286_000_000_000);
    });

    it('should reduce deficit when revenue is increased', () => {
      const originalDeficit = -286_000_000_000;
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daň z příjmů', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 50_000_000_000 }
      ];
      
      // Increasing revenue by 50B reduces deficit by 50B
      expect(calculateAdjustedDeficit(originalDeficit, adjustments)).toBe(-236_000_000_000);
    });

    it('should reduce deficit when expenditure is decreased', () => {
      const originalDeficit = -286_000_000_000;
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Obrana', type: 'expenditure', originalValue: 175_000_000_000, adjustmentAmount: -30_000_000_000 }
      ];
      
      // Decreasing expenditure by 30B reduces deficit by 30B
      expect(calculateAdjustedDeficit(originalDeficit, adjustments)).toBe(-256_000_000_000);
    });

    it('should handle multiple adjustments', () => {
      const originalDeficit = -286_000_000_000;
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 50_000_000_000 },
        { id: '2', name: 'Obrana', type: 'expenditure', originalValue: 175_000_000_000, adjustmentAmount: -30_000_000_000 },
        { id: '3', name: 'Školství', type: 'expenditure', originalValue: 280_000_000_000, adjustmentAmount: -20_000_000_000 }
      ];
      
      // +50B revenue, -30B exp, -20B exp = 100B improvement
      expect(calculateAdjustedDeficit(originalDeficit, adjustments)).toBe(-186_000_000_000);
    });

    it('should be able to reach zero deficit', () => {
      const originalDeficit = -286_000_000_000;
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 500_000_000_000, adjustmentAmount: 150_000_000_000 },
        { id: '2', name: 'Výdaje', type: 'expenditure', originalValue: 400_000_000_000, adjustmentAmount: -136_000_000_000 }
      ];
      
      expect(calculateAdjustedDeficit(originalDeficit, adjustments)).toBe(0);
    });

    it('should allow positive balance (surplus)', () => {
      const originalDeficit = -286_000_000_000;
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 1000_000_000_000, adjustmentAmount: 300_000_000_000 }
      ];
      
      expect(calculateAdjustedDeficit(originalDeficit, adjustments)).toBe(14_000_000_000);
    });
  });

  describe('calculateMaxAdjustment', () => {
    it('should allow max 50% increase for revenue', () => {
      const originalValue = 100_000_000_000;
      const { min, max } = calculateMaxAdjustment('revenue', originalValue);
      
      expect(max).toBe(50_000_000_000); // +50%
      expect(min).toBe(-50_000_000_000); // -50%
    });

    it('should allow max 50% decrease for expenditure', () => {
      const originalValue = 200_000_000_000;
      const { min, max } = calculateMaxAdjustment('expenditure', originalValue);
      
      expect(max).toBe(100_000_000_000); // +50%
      expect(min).toBe(-100_000_000_000); // -50%
    });

    it('should handle zero value', () => {
      const { min, max } = calculateMaxAdjustment('revenue', 0);
      
      expect(max).toBe(0);
      expect(min).toBe(0);
    });
  });

  describe('createBudgetAdjustment', () => {
    it('should create adjustment with default zero amount', () => {
      const adjustment = createBudgetAdjustment('1', 'Daně', 'revenue', 100_000_000_000);
      
      expect(adjustment).toEqual({
        id: '1',
        name: 'Daně',
        type: 'revenue',
        originalValue: 100_000_000_000,
        adjustmentAmount: 0
      });
    });

    it('should create adjustment with specified amount', () => {
      const adjustment = createBudgetAdjustment('2', 'Obrana', 'expenditure', 175_000_000_000, -20_000_000_000);
      
      expect(adjustment).toEqual({
        id: '2',
        name: 'Obrana',
        type: 'expenditure',
        originalValue: 175_000_000_000,
        adjustmentAmount: -20_000_000_000
      });
    });
  });

  describe('validateAdjustment', () => {
    it('should return true for valid revenue increase within 50%', () => {
      const adjustment: BudgetAdjustment = {
        id: '1', name: 'Test', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 40_000_000_000
      };
      
      expect(validateAdjustment(adjustment)).toBe(true);
    });

    it('should return false for revenue increase over 50%', () => {
      const adjustment: BudgetAdjustment = {
        id: '1', name: 'Test', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 60_000_000_000
      };
      
      expect(validateAdjustment(adjustment)).toBe(false);
    });

    it('should return true for valid expenditure decrease within 50%', () => {
      const adjustment: BudgetAdjustment = {
        id: '1', name: 'Test', type: 'expenditure', originalValue: 100_000_000_000, adjustmentAmount: -40_000_000_000
      };
      
      expect(validateAdjustment(adjustment)).toBe(true);
    });

    it('should return false for expenditure decrease over 50%', () => {
      const adjustment: BudgetAdjustment = {
        id: '1', name: 'Test', type: 'expenditure', originalValue: 100_000_000_000, adjustmentAmount: -60_000_000_000
      };
      
      expect(validateAdjustment(adjustment)).toBe(false);
    });

    it('should handle edge case at exactly 50%', () => {
      const adjustment: BudgetAdjustment = {
        id: '1', name: 'Test', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 50_000_000_000
      };
      
      expect(validateAdjustment(adjustment)).toBe(true);
    });
  });

  describe('formatAdjustmentForShare', () => {
    it('should format positive revenue adjustment', () => {
      const adjustment: BudgetAdjustment = {
        id: '1', name: 'Daň z příjmů', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 50_000_000_000
      };
      
      const result = formatAdjustmentForShare(adjustment);
      expect(result).toContain('Daň z příjmů');
      expect(result).toContain('+');
    });

    it('should format negative expenditure adjustment', () => {
      const adjustment: BudgetAdjustment = {
        id: '1', name: 'Obrana', type: 'expenditure', originalValue: 175_000_000_000, adjustmentAmount: -30_000_000_000
      };
      
      const result = formatAdjustmentForShare(adjustment);
      expect(result).toContain('Obrana');
      expect(result).toContain('-');
    });

    it('should handle zero adjustment', () => {
      const adjustment: BudgetAdjustment = {
        id: '1', name: 'Test', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 0
      };
      
      const result = formatAdjustmentForShare(adjustment);
      expect(result).toContain('Test');
    });
  });

  describe('formatGameResultForShare', () => {
    it('should format balanced budget result', () => {
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 500_000_000_000, adjustmentAmount: 150_000_000_000 },
        { id: '2', name: 'Výdaje', type: 'expenditure', originalValue: 400_000_000_000, adjustmentAmount: -136_000_000_000 }
      ];
      
      const result = formatGameResultForShare(-286_000_000_000, adjustments);
      
      expect(result).toContain('Vyrovnaný rozpočet');
      expect(result).toContain('-286');
      expect(result).toContain('Daně');
      expect(result).toContain('Výdaje');
      expect(result).toContain('rozpoctovka.cz');
    });

    it('should format surplus result', () => {
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 1000_000_000_000, adjustmentAmount: 300_000_000_000 }
      ];
      
      const result = formatGameResultForShare(-286_000_000_000, adjustments);
      
      expect(result).toContain('Přebytek');
    });

    it('should format remaining deficit result', () => {
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 50_000_000_000 }
      ];
      
      const result = formatGameResultForShare(-286_000_000_000, adjustments);
      
      expect(result).toContain('Schodek');
    });

    it('should not include zero adjustments in list', () => {
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 50_000_000_000 },
        { id: '2', name: 'NicNemenim', type: 'expenditure', originalValue: 100_000_000_000, adjustmentAmount: 0 }
      ];
      
      const result = formatGameResultForShare(-286_000_000_000, adjustments);
      
      expect(result).toContain('Daně');
      expect(result).not.toContain('NicNemenim');
      expect(result).toContain('Počet úprav: 1');
    });
  });

  describe('calculateProgressPercent', () => {
    it('should return 0% when no improvement', () => {
      const originalDeficit = -286_000_000_000;
      const currentDeficit = -286_000_000_000;
      
      expect(calculateProgressPercent(originalDeficit, currentDeficit)).toBe(0);
    });

    it('should return positive percentage when deficit is reduced', () => {
      const originalDeficit = -286_000_000_000;
      const currentDeficit = -236_000_000_000; // 50B improvement
      
      // 50 / 286 ≈ 17.48%
      const percent = calculateProgressPercent(originalDeficit, currentDeficit);
      expect(percent).toBeCloseTo(17.48, 1);
    });

    it('should return 100% when deficit is eliminated', () => {
      const originalDeficit = -286_000_000_000;
      const currentDeficit = 0;
      
      expect(calculateProgressPercent(originalDeficit, currentDeficit)).toBe(100);
    });

    it('should cap at 100% even with surplus', () => {
      const originalDeficit = -286_000_000_000;
      const currentDeficit = 50_000_000_000; // Surplus
      
      expect(calculateProgressPercent(originalDeficit, currentDeficit)).toBe(100);
    });

    it('should return 0% when deficit gets worse', () => {
      const originalDeficit = -286_000_000_000;
      const currentDeficit = -336_000_000_000; // 50B worse
      
      // We don't show negative progress, just 0
      expect(calculateProgressPercent(originalDeficit, currentDeficit)).toBe(0);
    });

    it('should work correctly when increasing revenue improves deficit', () => {
      const originalDeficit = -286_000_000_000;
      // Increase revenue by 50B -> deficit becomes -236B
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: 50_000_000_000 }
      ];
      const currentDeficit = calculateAdjustedDeficit(originalDeficit, adjustments);
      
      expect(currentDeficit).toBe(-236_000_000_000);
      expect(calculateProgressPercent(originalDeficit, currentDeficit)).toBeGreaterThan(0);
    });

    it('should work correctly when decreasing expenditure improves deficit', () => {
      const originalDeficit = -286_000_000_000;
      // Decrease expenditure by 50B -> deficit becomes -236B
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Výdaje', type: 'expenditure', originalValue: 100_000_000_000, adjustmentAmount: -50_000_000_000 }
      ];
      const currentDeficit = calculateAdjustedDeficit(originalDeficit, adjustments);
      
      expect(currentDeficit).toBe(-236_000_000_000);
      expect(calculateProgressPercent(originalDeficit, currentDeficit)).toBeGreaterThan(0);
    });

    it('should return 0% when increasing expenditure worsens deficit', () => {
      const originalDeficit = -286_000_000_000;
      // Increase expenditure by 50B -> deficit becomes -336B (worse!)
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Výdaje', type: 'expenditure', originalValue: 100_000_000_000, adjustmentAmount: 50_000_000_000 }
      ];
      const currentDeficit = calculateAdjustedDeficit(originalDeficit, adjustments);
      
      expect(currentDeficit).toBe(-336_000_000_000);
      expect(calculateProgressPercent(originalDeficit, currentDeficit)).toBe(0);
    });

    it('should return 0% when decreasing revenue worsens deficit', () => {
      const originalDeficit = -286_000_000_000;
      // Decrease revenue by 50B -> deficit becomes -336B (worse!)
      const adjustments: BudgetAdjustment[] = [
        { id: '1', name: 'Daně', type: 'revenue', originalValue: 100_000_000_000, adjustmentAmount: -50_000_000_000 }
      ];
      const currentDeficit = calculateAdjustedDeficit(originalDeficit, adjustments);
      
      expect(currentDeficit).toBe(-336_000_000_000);
      expect(calculateProgressPercent(originalDeficit, currentDeficit)).toBe(0);
    });
  });
});

