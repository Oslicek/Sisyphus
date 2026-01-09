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
