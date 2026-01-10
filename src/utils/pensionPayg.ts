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
 * Calculate workers per pensioner (inverse of dependency ratio)
 * More intuitive for users: "In 2050, only 1.4 workers will support each pensioner"
 * 
 * @param dependencyRatio - Dependency ratio (pensioners/workers)
 * @returns Workers per pensioner
 */
export function calculateWorkersPerPensioner(dependencyRatio: number): number {
  if (dependencyRatio === Infinity) return 0;
  if (dependencyRatio === 0) return Infinity;
  return 1 / dependencyRatio;
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

// ============================================================================
// AHA Charts: Lifetime and Generational Account Calculations
// ============================================================================

/**
 * Calculate total lifetime contributions for a worker
 * Simple model: avgWage × contribRate × yearsWorked
 * 
 * @param avgWage - Average annual wage
 * @param contribRate - Contribution rate (0-1)
 * @param yearsWorked - Number of years worked
 * @returns Total lifetime contribution
 */
export function calculateLifetimeContribution(
  avgWage: number,
  contribRate: number,
  yearsWorked: number
): number {
  return avgWage * contribRate * yearsWorked;
}

/**
 * Calculate total lifetime pension received
 * Simple model: avgPension × yearsRetired
 * 
 * @param avgPension - Average annual pension
 * @param yearsRetired - Number of years in retirement
 * @returns Total lifetime pension received
 */
export function calculateLifetimePension(
  avgPension: number,
  yearsRetired: number
): number {
  return avgPension * yearsRetired;
}

/**
 * Calculate generational balance (pension received - contributions made)
 * Positive = received more than contributed (beneficiary)
 * Negative = contributed more than received (net contributor)
 * 
 * @param lifetimeContrib - Total contributions over working life
 * @param lifetimePension - Total pension received in retirement
 * @returns Balance (pension - contribution)
 */
export function calculateGenerationalBalance(
  lifetimeContrib: number,
  lifetimePension: number
): number {
  return lifetimePension - lifetimeContrib;
}

/**
 * Data point for lifetime account chart
 */
export interface LifetimeAccountPoint {
  year: number;
  age: number;
  cumulativeContrib: number;
  cumulativePension: number;
  balance: number;
}

/**
 * Build lifetime account data for a person born in a given year
 * Shows cumulative contributions while working and cumulative pension while retired
 * 
 * @param points - Projection year points (must have avgWage and avgPension)
 * @param birthYear - Year the person was born
 * @param workStartAge - Age they start working (e.g., 20)
 * @param retAge - Retirement age
 * @param contribRate - Contribution rate
 * @returns Array of cumulative contribution and pension data by year
 */
export function buildLifetimeAccountData(
  points: Array<{ year: number; avgWage: number; avgPension: number }>,
  birthYear: number,
  workStartAge: number,
  retAge: number,
  contribRate: number
): LifetimeAccountPoint[] {
  const result: LifetimeAccountPoint[] = [];
  let cumulativeContrib = 0;
  let cumulativePension = 0;
  
  for (const point of points) {
    const age = point.year - birthYear;
    
    // Working years: accumulate contributions
    if (age >= workStartAge && age < retAge) {
      cumulativeContrib += point.avgWage * contribRate;
    }
    
    // Retirement years: accumulate pension
    if (age >= retAge) {
      cumulativePension += point.avgPension;
    }
    
    result.push({
      year: point.year,
      age,
      cumulativeContrib,
      cumulativePension,
      balance: cumulativePension - cumulativeContrib,
    });
  }
  
  return result;
}

/**
 * Data point for generational account chart
 */
export interface GenerationalAccountPoint {
  birthYear: number;
  totalContrib: number;
  totalPension: number;
  lifetimeBalance: number;
  /** Years of data available for this cohort */
  dataYears: number;
}

/**
 * Build generational account data for multiple birth cohorts
 * Shows lifetime balance (pension - contributions) for people born in different years
 * 
 * IMPORTANT: This includes estimated HISTORICAL contributions/pensions before baseYear!
 * Historical values are estimated by backward extrapolation using wage growth rate.
 * 
 * @param points - Projection year points
 * @param baseYear - First year of projection
 * @param birthCohorts - Array of birth years to calculate for
 * @param workStartAge - Age they start working
 * @param retAge - Retirement age
 * @param contribRate - Contribution rate
 * @param lifeExpectancy - Expected lifespan for extrapolation
 * @param historicalWageGrowth - Assumed historical real wage growth (default 2%)
 * @param historicalContribRate - Historical contribution rate (default 25% - was lower in past)
 * @returns Array of generational balance data
 */
export function buildGenerationalAccountData(
  points: Array<{ year: number; avgWage: number; avgPension: number }>,
  baseYear: number,
  birthCohorts: number[],
  workStartAge: number,
  retAge: number,
  contribRate: number,
  lifeExpectancy: number,
  historicalWageGrowth: number = 0.02,
  historicalContribRate: number = 0.25
): GenerationalAccountPoint[] {
  const lastYear = points[points.length - 1]?.year ?? baseYear;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  
  if (!firstPoint || !lastPoint) {
    return [];
  }
  
  const baseWage = firstPoint.avgWage;
  const basePension = firstPoint.avgPension;
  
  return birthCohorts.map(birthYear => {
    let totalContrib = 0;
    let totalPension = 0;
    let dataYears = 0;
    
    const workStartYear = birthYear + workStartAge;
    const retireYear = birthYear + retAge;
    const deathYear = birthYear + lifeExpectancy;
    
    // =========================================
    // 1. HISTORICAL period (before baseYear)
    // =========================================
    
    // Historical working years (before projection)
    const historicalWorkStart = Math.max(workStartYear, 1950); // Don't go before 1950
    const historicalWorkEnd = Math.min(retireYear, baseYear);
    
    if (historicalWorkEnd > historicalWorkStart) {
      for (let year = historicalWorkStart; year < historicalWorkEnd; year++) {
        // Estimate historical wage by backward extrapolation
        const yearsBeforeBase = baseYear - year;
        const historicalWage = baseWage / Math.pow(1 + historicalWageGrowth, yearsBeforeBase);
        totalContrib += historicalWage * historicalContribRate;
        dataYears++;
      }
    }
    
    // Historical pension years (if already retired before projection)
    const historicalRetStart = Math.max(retireYear, 1990); // Don't go before 1990
    const historicalRetEnd = Math.min(deathYear, baseYear);
    
    if (historicalRetEnd > historicalRetStart) {
      for (let year = historicalRetStart; year < historicalRetEnd; year++) {
        // Estimate historical pension (pensions grow slower than wages)
        const yearsBeforeBase = baseYear - year;
        const historicalPension = basePension / Math.pow(1 + historicalWageGrowth * 0.7, yearsBeforeBase);
        totalPension += historicalPension;
        dataYears++;
      }
    }
    
    // =========================================
    // 2. PROJECTION period (within points[])
    // =========================================
    
    for (const point of points) {
      const age = point.year - birthYear;
      
      // Working years within projection
      if (age >= workStartAge && age < retAge) {
        totalContrib += point.avgWage * contribRate;
        dataYears++;
      }
      
      // Retirement years within projection
      if (age >= retAge && age <= lifeExpectancy) {
        totalPension += point.avgPension;
        dataYears++;
      }
    }
    
    // =========================================
    // 3. FUTURE period (after projection ends)
    // =========================================
    
    const lastAge = lastYear - birthYear;
    
    // Extrapolate remaining working years
    if (lastAge < retAge && lastAge >= workStartAge) {
      const remainingWorkYears = retAge - lastAge - 1;
      totalContrib += lastPoint.avgWage * contribRate * remainingWorkYears;
    }
    
    // Extrapolate retirement years
    if (lastAge >= retAge) {
      const remainingRetYears = lifeExpectancy - lastAge;
      if (remainingRetYears > 0) {
        totalPension += lastPoint.avgPension * remainingRetYears;
      }
    } else if (lastAge < retAge) {
      // Person hasn't retired yet in projection - extrapolate full retirement
      const retYears = lifeExpectancy - retAge;
      if (retYears > 0) {
        totalPension += lastPoint.avgPension * retYears;
      }
    }
    
    return {
      birthYear,
      totalContrib,
      totalPension,
      lifetimeBalance: totalPension - totalContrib,
      dataYears,
    };
  });
}
