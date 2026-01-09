import { describe, it, expect } from 'vitest';
import {
  calculateWageBill,
  calculateContributions,
  countPensioners,
  calculateBenefits,
  calculateBalance,
  calculateRequiredRate,
  calculateDependencyRatio,
  countWorkers,
  calculateAvgWage,
  calculateAvgPension,
} from './pensionPayg';
import type { PopulationBySex } from '../types/pension';

describe('calculateWageBill', () => {
  it('should calculate total wage bill from population, employment and wages', () => {
    const population: PopulationBySex = {
      M: [0, 0, 1000, 1000, 0],  // 2000 males at working ages
      F: [0, 0, 1000, 1000, 0],  // 2000 females at working ages
    };
    const employment: PopulationBySex = {
      M: [0, 0, 0.8, 0.8, 0],    // 80% employment
      F: [0, 0, 0.7, 0.7, 0],    // 70% employment
    };
    const wageRel: PopulationBySex = {
      M: [0, 0, 1.0, 1.2, 0],    // Wage relative to average
      F: [0, 0, 0.9, 1.1, 0],
    };
    const avgWage = 100000; // Annual average wage
    
    const wageBill = calculateWageBill(population, employment, wageRel, avgWage);
    
    // Males: 1000*0.8*1.0 + 1000*0.8*1.2 = 800 + 960 = 1760 workers*wage_rel
    // Females: 1000*0.7*0.9 + 1000*0.7*1.1 = 630 + 770 = 1400 workers*wage_rel
    // Total: 3160 * 100000 = 316,000,000
    expect(wageBill).toBeCloseTo(316000000, -3);
  });

  it('should return 0 when no workers', () => {
    const population: PopulationBySex = { M: [1000], F: [1000] };
    const employment: PopulationBySex = { M: [0], F: [0] };
    const wageRel: PopulationBySex = { M: [1], F: [1] };
    
    expect(calculateWageBill(population, employment, wageRel, 100000)).toBe(0);
  });
});

describe('calculateContributions', () => {
  it('should calculate contributions as rate times wage bill', () => {
    const wageBill = 1000000000; // 1 billion
    const contribRate = 0.28;    // 28%
    
    const contrib = calculateContributions(wageBill, contribRate);
    
    expect(contrib).toBe(280000000);
  });

  it('should handle zero wage bill', () => {
    expect(calculateContributions(0, 0.28)).toBe(0);
  });
});

describe('countPensioners', () => {
  it('should count population at or above retirement age', () => {
    const population: PopulationBySex = {
      M: [100, 200, 300, 400, 500], // Ages 0-4
      F: [100, 200, 300, 400, 500],
    };
    const retAge = 3;
    
    const pensioners = countPensioners(population, retAge);
    
    // Ages 3,4 for both sexes: (400+500) + (400+500) = 1800
    expect(pensioners).toBe(1800);
  });

  it('should return 0 when retirement age is above max age', () => {
    const population: PopulationBySex = {
      M: [100, 200],
      F: [100, 200],
    };
    
    expect(countPensioners(population, 10)).toBe(0);
  });

  it('should count all when retirement age is 0', () => {
    const population: PopulationBySex = {
      M: [100, 200],
      F: [150, 250],
    };
    
    expect(countPensioners(population, 0)).toBe(700);
  });
});

describe('calculateBenefits', () => {
  it('should calculate total benefits as pensioners times average pension', () => {
    const pensioners = 10000;
    const avgPension = 180000; // 180k annual
    
    const benefits = calculateBenefits(pensioners, avgPension);
    
    expect(benefits).toBe(1800000000); // 1.8 billion
  });

  it('should handle zero pensioners', () => {
    expect(calculateBenefits(0, 180000)).toBe(0);
  });
});

describe('calculateBalance', () => {
  it('should calculate balance as contributions minus benefits', () => {
    const contributions = 1000000000;
    const benefits = 800000000;
    
    expect(calculateBalance(contributions, benefits)).toBe(200000000);
  });

  it('should return negative for deficit', () => {
    const contributions = 500000000;
    const benefits = 800000000;
    
    expect(calculateBalance(contributions, benefits)).toBe(-300000000);
  });
});

describe('calculateRequiredRate', () => {
  it('should calculate rate needed to cover benefits from wage bill', () => {
    const benefits = 280000000;
    const wageBill = 1000000000;
    
    expect(calculateRequiredRate(benefits, wageBill)).toBe(0.28);
  });

  it('should return 0 when benefits are 0', () => {
    expect(calculateRequiredRate(0, 1000000000)).toBe(0);
  });

  it('should return Infinity when wage bill is 0 but benefits positive', () => {
    expect(calculateRequiredRate(100, 0)).toBe(Infinity);
  });

  it('should return 0 when both are 0', () => {
    expect(calculateRequiredRate(0, 0)).toBe(0);
  });
});

describe('calculateDependencyRatio', () => {
  it('should calculate ratio of pensioners to workers', () => {
    const pensioners = 3000;
    const workers = 10000;
    
    expect(calculateDependencyRatio(pensioners, workers)).toBe(0.3);
  });

  it('should return Infinity when no workers', () => {
    expect(calculateDependencyRatio(100, 0)).toBe(Infinity);
  });

  it('should return 0 when no pensioners', () => {
    expect(calculateDependencyRatio(0, 1000)).toBe(0);
  });
});

describe('countWorkers', () => {
  it('should count effective workers (population * employment)', () => {
    const population: PopulationBySex = {
      M: [0, 1000, 1000, 0],
      F: [0, 1000, 1000, 0],
    };
    const employment: PopulationBySex = {
      M: [0, 0.8, 0.7, 0],
      F: [0, 0.6, 0.5, 0],
    };
    
    const workers = countWorkers(population, employment);
    
    // M: 1000*0.8 + 1000*0.7 = 1500
    // F: 1000*0.6 + 1000*0.5 = 1100
    expect(workers).toBeCloseTo(2600, 0);
  });
});

describe('calculateAvgWage', () => {
  it('should grow wage by real growth rate', () => {
    const avgWage0 = 100000;
    const wageGrowth = 0.02; // 2%
    const year = 5;
    
    const avgWage = calculateAvgWage(avgWage0, wageGrowth, year);
    
    // 100000 * 1.02^5 = 110408.08
    expect(avgWage).toBeCloseTo(110408.08, 0);
  });

  it('should return base wage at year 0', () => {
    expect(calculateAvgWage(100000, 0.02, 0)).toBe(100000);
  });

  it('should handle negative growth', () => {
    const avgWage = calculateAvgWage(100000, -0.01, 5);
    expect(avgWage).toBeLessThan(100000);
  });
});

describe('calculateAvgPension', () => {
  it('should index pension with wage-CPI mix', () => {
    const avgPension0 = 50000;
    const wageGrowth = 0.03;
    const cpi = 0.02;
    const wageWeight = 0.5; // 50% wage, 50% CPI
    const year = 1;
    
    const avgPension = calculateAvgPension(avgPension0, wageGrowth, cpi, wageWeight, year);
    
    // Growth = 0.5*0.03 + 0.5*0.02 = 0.025
    // 50000 * 1.025 = 51250
    expect(avgPension).toBeCloseTo(51250, 0);
  });

  it('should use pure CPI when weight is 0', () => {
    const avgPension = calculateAvgPension(50000, 0.03, 0.02, 0, 5);
    
    // 50000 * 1.02^5
    expect(avgPension).toBeCloseTo(50000 * Math.pow(1.02, 5), 0);
  });

  it('should use pure wage growth when weight is 1', () => {
    const avgPension = calculateAvgPension(50000, 0.03, 0.02, 1, 5);
    
    // 50000 * 1.03^5
    expect(avgPension).toBeCloseTo(50000 * Math.pow(1.03, 5), 0);
  });
});

describe('integration: test dataset PAYG calculation', () => {
  it('should match baseline totals from test data', () => {
    // Test data from test-cz-2024
    const population: PopulationBySex = {
      M: [5000, 4900, 4800, 4700, 4600, 4500, 4400, 4300, 4200, 4100,
          4000, 3800, 3600, 3300, 3000, 2700, 2300, 1900, 1500, 1100, 800],
      F: [4800, 4700, 4600, 4500, 4400, 4300, 4200, 4100, 4000, 3900,
          3800, 3700, 3600, 3500, 3400, 3200, 2900, 2500, 2100, 1700, 1300],
    };
    
    const employment: PopulationBySex = {
      M: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.7, 0.7, 0.7, 0.7, 0.55],
      F: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.65, 0.65, 0.65, 0.65, 0.65, 0.5],
    };
    
    const wageRel: PopulationBySex = {
      M: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.55, 0.75, 0.95, 1.1, 1.05, 0.85],
      F: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.7, 0.9, 1.05, 1.0, 0.8],
    };
    
    const avgWage0 = 100000;
    const avgPension0 = 45000;
    const contribRate = 0.2;
    const retAge = 18;
    
    // Baseline totals from test data
    const expectedWageBill = 1272825000;
    const expectedWorkers = 15800;
    const expectedPensioners = 8500;
    const expectedContrib = 254565000;
    const expectedBenefits = 382500000;
    
    const wageBill = calculateWageBill(population, employment, wageRel, avgWage0);
    const workers = countWorkers(population, employment);
    const pensioners = countPensioners(population, retAge);
    const contrib = calculateContributions(wageBill, contribRate);
    const benefits = calculateBenefits(pensioners, avgPension0);
    
    // Allow 1% tolerance for rounding
    expect(wageBill).toBeCloseTo(expectedWageBill, -4);
    expect(workers).toBeCloseTo(expectedWorkers, -1);
    expect(pensioners).toBe(expectedPensioners);
    expect(contrib).toBeCloseTo(expectedContrib, -4);
    expect(benefits).toBeCloseTo(expectedBenefits, -4);
    
    // Verify balance is negative (deficit)
    const balance = calculateBalance(contrib, benefits);
    expect(balance).toBeLessThan(0);
  });
});

// Import equilibrium functions
import {
  findRequiredRetirementAge,
  findRequiredPensionRatio,
  findRequiredContribRate,
} from './pensionPayg';

describe('Equilibrium calculations', () => {
  // Simple test population
  const population: PopulationBySex = {
    M: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500],  // 5000 total
    F: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500],  // 5000 total
  };
  const employment: PopulationBySex = {
    M: [0, 0, 0.8, 0.8, 0.8, 0.8, 0.8, 0.5, 0.3, 0],
    F: [0, 0, 0.7, 0.7, 0.7, 0.7, 0.7, 0.4, 0.2, 0],
  };
  const wageRel: PopulationBySex = {
    M: [0, 0, 0.8, 1.0, 1.1, 1.1, 1.0, 0.9, 0.8, 0],
    F: [0, 0, 0.7, 0.9, 1.0, 1.0, 0.9, 0.8, 0.7, 0],
  };
  const avgWage = 100000;
  const avgWage0 = 100000;

  describe('findRequiredRetirementAge', () => {
    it('should find retirement age that balances budget', () => {
      const params = {
        population,
        employment,
        wageRel,
        avgWage,
        avgPension: 40000,
        contribRate: 0.2,
        maxAge: 9,
      };
      
      const requiredAge = findRequiredRetirementAge(params, 2, 9);
      
      // Should return a valid age
      expect(requiredAge).not.toBeNull();
      expect(requiredAge).toBeGreaterThanOrEqual(2);
      expect(requiredAge).toBeLessThanOrEqual(9);
    });

    it('should return null if balance impossible even at max age', () => {
      const params = {
        population,
        employment,
        wageRel,
        avgWage,
        avgPension: 500000, // Very high pension
        contribRate: 0.1,    // Low contribution rate
        maxAge: 9,
      };
      
      const requiredAge = findRequiredRetirementAge(params, 2, 9);
      
      // Very high pensions + low contributions = impossible to balance
      expect(requiredAge).toBeNull();
    });

    it('should return min age if already balanced at minimum', () => {
      const params = {
        population,
        employment,
        wageRel,
        avgWage,
        avgPension: 1000, // Very low pension
        contribRate: 0.5,  // High contribution rate
        maxAge: 9,
      };
      
      const requiredAge = findRequiredRetirementAge(params, 2, 9);
      
      // Should return minimum age
      expect(requiredAge).toBe(2);
    });
  });

  describe('findRequiredPensionRatio', () => {
    it('should find pension ratio that balances budget', () => {
      const params = {
        population,
        employment,
        wageRel,
        avgWage,
        avgWage0,
        contribRate: 0.2,
        retAge: 7,
        maxAge: 9,
      };
      
      const ratio = findRequiredPensionRatio(params);
      
      // Should return a valid ratio
      expect(ratio).not.toBeNull();
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThanOrEqual(2);
    });

    it('should return 0 when no pensioners', () => {
      const params = {
        population,
        employment,
        wageRel,
        avgWage,
        avgWage0,
        contribRate: 0.2,
        retAge: 10, // Beyond max age, no pensioners
        maxAge: 9,
      };
      
      const ratio = findRequiredPensionRatio(params);
      expect(ratio).toBe(0);
    });
  });

  describe('findRequiredContribRate', () => {
    it('should find contribution rate that covers benefits', () => {
      const params = {
        population,
        employment,
        wageRel,
        avgWage,
        avgPension: 40000,
        retAge: 7,
        maxAge: 9,
      };
      
      const rate = findRequiredContribRate(params);
      
      // Should return a valid rate
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(1);
    });
  });
});
