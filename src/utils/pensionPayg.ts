/**
 * PAYG Pension System Calculations
 * Functions for calculating wage bills, contributions, benefits, and balances
 */

import type { PopulationBySex } from '../types/pension';

/**
 * Calculate total wage bill
 * Sum of (population × employment rate × relative wage × average wage)
 * 
 * @param population - Population by sex and age
 * @param employment - Employment rates by sex and age
 * @param wageRel - Relative wage by sex and age (1.0 = average)
 * @param avgWage - Average annual wage in currency
 * @returns Total annual wage bill
 */
export function calculateWageBill(
  population: PopulationBySex,
  employment: PopulationBySex,
  wageRel: PopulationBySex,
  avgWage: number
): number {
  let total = 0;
  
  for (const sex of ['M', 'F'] as const) {
    const pop = population[sex];
    const emp = employment[sex];
    const wage = wageRel[sex];
    
    for (let a = 0; a < pop.length; a++) {
      const workers = pop[a] * (emp[a] || 0);
      const relWage = wage[a] || 0;
      total += workers * relWage * avgWage;
    }
  }
  
  return total;
}

/**
 * Calculate contribution revenue
 * 
 * @param wageBill - Total annual wage bill
 * @param contribRate - Contribution rate (0-1)
 * @returns Total annual contributions
 */
export function calculateContributions(wageBill: number, contribRate: number): number {
  return wageBill * contribRate;
}

/**
 * Count number of pensioners (population at or above retirement age)
 * 
 * @param population - Population by sex and age
 * @param retAge - Retirement age
 * @returns Number of pensioners
 */
export function countPensioners(population: PopulationBySex, retAge: number): number {
  let count = 0;
  
  for (const sex of ['M', 'F'] as const) {
    const pop = population[sex];
    for (let a = retAge; a < pop.length; a++) {
      count += pop[a];
    }
  }
  
  return count;
}

/**
 * Calculate total benefit spending
 * 
 * @param pensioners - Number of pensioners
 * @param avgPension - Average annual pension
 * @returns Total annual benefit spending
 */
export function calculateBenefits(pensioners: number, avgPension: number): number {
  return pensioners * avgPension;
}

/**
 * Calculate PAYG balance (contributions - benefits)
 * Positive = surplus, Negative = deficit
 * 
 * @param contributions - Total contributions
 * @param benefits - Total benefits
 * @returns Balance
 */
export function calculateBalance(contributions: number, benefits: number): number {
  return contributions - benefits;
}

/**
 * Calculate required contribution rate to cover benefits
 * 
 * @param benefits - Total benefits
 * @param wageBill - Total wage bill
 * @returns Required contribution rate (0-1+)
 */
export function calculateRequiredRate(benefits: number, wageBill: number): number {
  if (benefits === 0) return 0;
  if (wageBill === 0) return Infinity;
  return benefits / wageBill;
}

/**
 * Calculate dependency ratio (pensioners / workers)
 * 
 * @param pensioners - Number of pensioners
 * @param workers - Number of workers (employed)
 * @returns Dependency ratio
 */
export function calculateDependencyRatio(pensioners: number, workers: number): number {
  if (workers === 0) {
    return pensioners > 0 ? Infinity : 0;
  }
  return pensioners / workers;
}

/**
 * Count effective workers (population × employment rate)
 * 
 * @param population - Population by sex and age
 * @param employment - Employment rates by sex and age
 * @returns Number of effective workers
 */
export function countWorkers(
  population: PopulationBySex,
  employment: PopulationBySex
): number {
  let count = 0;
  
  for (const sex of ['M', 'F'] as const) {
    const pop = population[sex];
    const emp = employment[sex];
    
    for (let a = 0; a < pop.length; a++) {
      count += pop[a] * (emp[a] || 0);
    }
  }
  
  return count;
}

/**
 * Calculate average wage at year t given base wage and growth
 * 
 * @param avgWage0 - Base year average wage
 * @param wageGrowthReal - Real wage growth rate (decimal)
 * @param year - Years from base year
 * @returns Average wage at year t
 */
export function calculateAvgWage(
  avgWage0: number,
  wageGrowthReal: number,
  year: number
): number {
  return avgWage0 * Math.pow(1 + wageGrowthReal, year);
}

/**
 * Calculate average pension at year t with mixed indexation
 * Indexation: x*wage_growth + (1-x)*CPI
 * 
 * @param avgPension0 - Base year average pension
 * @param wageGrowthReal - Real wage growth rate (decimal)
 * @param cpi - CPI inflation rate (decimal)
 * @param wageWeight - Weight on wage growth (0=CPI only, 1=wage only)
 * @param year - Years from base year
 * @returns Average pension at year t
 */
export function calculateAvgPension(
  avgPension0: number,
  wageGrowthReal: number,
  cpi: number,
  wageWeight: number,
  year: number
): number {
  // Mixed indexation rate
  const indexRate = wageWeight * wageGrowthReal + (1 - wageWeight) * cpi;
  return avgPension0 * Math.pow(1 + indexRate, year);
}

// ============================================================================
// Czech Pension System (dvousložkový důchod)
// ============================================================================

import type { PensionComponents } from '../types/pension';

export interface CzechPensionParams {
  /** Average wage in current year */
  avgWage: number;
  /** Basic amount ratio (základní výměra as % of avg wage) */
  basicAmountRatio: number;
  /** Minimum pension ratio (as % of avg wage) */
  minPensionRatio: number;
  /** Share of real wage growth in indexation (1/3 in current law) */
  realWageIndexShare: number;
  /** Pensioner CPI (důchodcovská inflace) */
  pensionerCPI: number;
  /** Real wage growth this year */
  realWageGrowth: number;
}

/**
 * Index pension using Czech rules (od 2024):
 * - Basic amount: always 10% of average wage
 * - Percentage amount: pensionerCPI + effectiveWageGrowth * realWageIndexShare
 * - Effective wage growth accounts for "erasing" past real wage drops
 * 
 * @param prevComponents - Previous year's pension components
 * @param params - Current year parameters
 * @param cumulativeWageGap - Accumulated real wage drops to "erase"
 * @returns New pension components and updated wage gap
 */
export function indexCzechPension(
  prevComponents: PensionComponents,
  params: CzechPensionParams,
  cumulativeWageGap: number
): { components: PensionComponents; newCumulativeGap: number } {
  const {
    avgWage,
    basicAmountRatio,
    minPensionRatio,
    realWageIndexShare,
    pensionerCPI,
    realWageGrowth,
  } = params;
  
  // 1. Basic amount = always basicAmountRatio × average wage
  const basicAmount = avgWage * basicAmountRatio;
  
  // 2. Calculate effective wage growth with "erasing" mechanism
  let effectiveWageGrowth = realWageGrowth;
  let newCumulativeGap = cumulativeWageGap;
  
  if (cumulativeWageGap < 0 && realWageGrowth > 0) {
    // Positive growth erases past drops first
    const gapReduction = Math.min(realWageGrowth, -cumulativeWageGap);
    effectiveWageGrowth = realWageGrowth - gapReduction;
    newCumulativeGap = cumulativeWageGap + gapReduction;
  } else if (realWageGrowth < 0) {
    // Negative growth accumulates in the gap
    newCumulativeGap = cumulativeWageGap + realWageGrowth;
    effectiveWageGrowth = 0;
  }
  
  // 3. Index percentage amount: pensionerCPI + realWageIndexShare × effectiveWageGrowth
  const indexRate = pensionerCPI + realWageIndexShare * Math.max(0, effectiveWageGrowth);
  const percentageAmount = prevComponents.percentageAmount * (1 + indexRate);
  
  // 4. Calculate total and apply minimum
  let totalPension = basicAmount + percentageAmount;
  const minPension = avgWage * minPensionRatio;
  const minimumApplied = totalPension < minPension;
  
  if (minimumApplied) {
    totalPension = minPension;
  }
  
  return {
    components: {
      basicAmount,
      percentageAmount,
      totalPension,
      minimumApplied,
    },
    newCumulativeGap,
  };
}

/**
 * Calculate initial pension components from slider values
 * 
 * @param avgWage0 - Base year average wage
 * @param basicAmountRatio - Basic amount as % of avg wage
 * @param percentageAmountRatio - Percentage amount as % of avg wage
 * @param minPensionRatio - Minimum pension as % of avg wage
 * @returns Initial pension components
 */
export function calculateInitialPension(
  avgWage0: number,
  basicAmountRatio: number,
  percentageAmountRatio: number,
  minPensionRatio: number
): PensionComponents {
  const basicAmount = avgWage0 * basicAmountRatio;
  const percentageAmount = avgWage0 * percentageAmountRatio;
  let totalPension = basicAmount + percentageAmount;
  
  const minPension = avgWage0 * minPensionRatio;
  const minimumApplied = totalPension < minPension;
  
  if (minimumApplied) {
    totalPension = minPension;
  }
  
  return {
    basicAmount,
    percentageAmount,
    totalPension,
    minimumApplied,
  };
}

// ============================================================================
// Equilibrium Calculations (finding parameters for balanced budget)
// ============================================================================

export interface EquilibriumParams {
  population: PopulationBySex;
  employment: PopulationBySex;
  wageRel: PopulationBySex;
  avgWage: number;
  avgPension: number;
  contribRate: number;
  retAge: number;
  maxAge: number;
}

/**
 * Find required retirement age to achieve balanced budget.
 * Uses bisection search to find retAge where contributions = benefits.
 * 
 * @param params - System parameters (avgPension, contribRate are fixed)
 * @param minAge - Minimum retirement age to search
 * @param maxAge - Maximum retirement age to search
 * @param tolerance - Acceptable balance difference (default 0.01)
 * @param maxIterations - Maximum iterations (default 50)
 * @returns Required retirement age (may be fractional), or null if impossible
 */
export function findRequiredRetirementAge(
  params: Omit<EquilibriumParams, 'retAge'>,
  minAge: number = 50,
  maxAge: number = 80,
  tolerance: number = 0.01,
  maxIterations: number = 50
): number | null {
  const { population, employment, wageRel, avgWage, avgPension, contribRate } = params;
  
  // Calculate wage bill (fixed, doesn't depend on retirement age)
  const wageBill = calculateWageBill(population, employment, wageRel, avgWage);
  const contributions = calculateContributions(wageBill, contribRate);
  
  // Function to calculate balance at given retirement age
  const balanceAt = (retAge: number): number => {
    const pensioners = countPensioners(population, Math.floor(retAge));
    const benefits = calculateBenefits(pensioners, avgPension);
    return contributions - benefits;
  };
  
  // Check bounds
  const balanceAtMin = balanceAt(minAge);
  const balanceAtMax = balanceAt(maxAge);
  
  // If balance is positive even at minimum age, return minimum
  if (balanceAtMin >= 0) return minAge;
  
  // If balance is negative even at maximum age, impossible
  if (balanceAtMax < 0) return null;
  
  // Bisection search
  let low = minAge;
  let high = maxAge;
  
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const balance = balanceAt(mid);
    
    if (Math.abs(balance / contributions) < tolerance) {
      return mid;
    }
    
    if (balance < 0) {
      low = mid; // Need higher retirement age
    } else {
      high = mid; // Can lower retirement age
    }
  }
  
  return (low + high) / 2;
}

/**
 * Find required pension/wage ratio to achieve balanced budget.
 * Uses simple algebra: benefits = contributions
 * pensioners × avgWage × ratio = wageBill × contribRate
 * ratio = (wageBill × contribRate) / (pensioners × avgWage)
 * 
 * @param params - System parameters (retAge, contribRate are fixed)
 * @returns Required pension/wage ratio (0-1+), or null if impossible
 */
export function findRequiredPensionRatio(
  params: Omit<EquilibriumParams, 'avgPension'> & { avgWage0: number }
): number | null {
  const { population, employment, wageRel, avgWage, contribRate, retAge } = params;
  
  // Calculate wage bill
  const wageBill = calculateWageBill(population, employment, wageRel, avgWage);
  const contributions = calculateContributions(wageBill, contribRate);
  
  // Count pensioners
  const pensioners = countPensioners(population, retAge);
  
  if (pensioners === 0) {
    return 0; // No pensioners = any ratio works
  }
  
  // For balance: pensioners × avgPension = contributions
  // Pension ratio = avgPension / avgWage (current year wage, not base year!)
  const requiredPension = contributions / pensioners;
  const ratio = requiredPension / avgWage;
  
  // Clamp to reasonable range
  if (ratio < 0) return 0;
  if (ratio > 2) return null; // >200% of wage is unrealistic
  
  return ratio;
}

/**
 * Find required contribution rate to achieve balanced budget.
 * Simple algebra: contribRate = benefits / wageBill
 * 
 * @param params - System parameters
 * @returns Required contribution rate (0-1+)
 */
export function findRequiredContribRate(
  params: Omit<EquilibriumParams, 'contribRate'>
): number {
  const { population, employment, wageRel, avgWage, avgPension, retAge } = params;
  
  const wageBill = calculateWageBill(population, employment, wageRel, avgWage);
  const pensioners = countPensioners(population, retAge);
  const benefits = calculateBenefits(pensioners, avgPension);
  
  return calculateRequiredRate(benefits, wageBill);
}
