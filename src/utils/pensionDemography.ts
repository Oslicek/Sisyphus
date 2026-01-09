/**
 * Pension Demography Calculations
 * Core cohort-component model functions for demographic projection
 */

import type { PopulationBySex } from '../types/pension';

/**
 * Convert mortality rate (mx) to probability of death (qx)
 * Formula: qx = 1 - exp(-mx)
 * 
 * @param mx - Central death rate (deaths per person-year)
 * @returns qx - Probability of dying within one year
 */
export function mxToQx(mx: number): number {
  if (mx <= 0) return 0;
  return 1 - Math.exp(-mx);
}

/**
 * Convert array of mx values to qx values
 * 
 * @param mxArray - Array of mortality rates by age
 * @returns Array of death probabilities by age
 */
export function mxArrayToQx(mxArray: number[]): number[] {
  return mxArray.map(mxToQx);
}

/**
 * Calculate survivors after applying mortality
 * 
 * @param population - Population by age
 * @param qx - Age-specific death probabilities
 * @returns Survivors by age
 */
export function calculateSurvivors(population: number[], qx: number[]): number[] {
  return population.map((pop, age) => {
    const deathProb = Math.min(Math.max(qx[age] || 0, 0), 1);
    return pop * (1 - deathProb);
  });
}

/**
 * Age cohorts by one year (shift survivors to next age)
 * Open age group: survivors at maxAge stay at maxAge
 * 
 * @param survivors - Survivors by age after mortality
 * @param maxAge - Maximum age in the model
 * @returns Population by age after aging
 */
export function ageCohorts(survivors: number[], maxAge: number): number[] {
  const aged = new Array(maxAge + 1).fill(0);
  
  for (let a = 0; a < maxAge; a++) {
    aged[a + 1] = survivors[a];
  }
  
  // Open age group: add survivors at maxAge to those aging into maxAge
  aged[maxAge] += survivors[maxAge];
  
  return aged;
}

/**
 * Birth calculation result
 */
export interface BirthResult {
  totalBirths: number;
  maleBirths: number;
  femaleBirths: number;
}

/**
 * Calculate births from female population and age-specific fertility rates
 * 
 * @param femalePop - Female population by age
 * @param asfr - Age-specific fertility rates (same length as femalePop)
 * @param srb - Sex ratio at birth (males per female)
 * @returns Total births and split by sex
 */
export function calculateBirths(
  femalePop: number[],
  asfr: number[],
  srb: number
): BirthResult {
  let totalBirths = 0;
  
  for (let a = 0; a < femalePop.length; a++) {
    totalBirths += femalePop[a] * (asfr[a] || 0);
  }
  
  const pMale = srb / (1 + srb);
  const maleBirths = totalBirths * pMale;
  const femaleBirths = totalBirths * (1 - pMale);
  
  return { totalBirths, maleBirths, femaleBirths };
}

/**
 * Apply net migration to population
 * Clamps result to non-negative values
 * 
 * @param population - Population by age
 * @param netMig - Net migration by age (positive = immigration)
 * @returns Population after migration
 */
export function applyMigration(population: number[], netMig: number[]): number[] {
  return population.map((pop, age) => {
    const migrated = pop + (netMig[age] || 0);
    return Math.max(0, migrated);
  });
}

/**
 * Calculate life expectancy at birth from mortality rates
 * Uses standard period life table calculation
 * 
 * @param mx - Age-specific mortality rates
 * @returns Life expectancy at birth (e0)
 */
export function calculateLifeExpectancy(mx: number[]): number {
  const maxAge = mx.length - 1;
  const qx = mx.map(mxToQx);
  
  // Radix (starting population)
  const l0 = 100000;
  
  // Calculate lx (survivorship)
  const lx: number[] = [l0];
  for (let a = 0; a < maxAge; a++) {
    lx[a + 1] = lx[a] * (1 - qx[a]);
  }
  
  // Calculate Lx (person-years lived)
  // Using approximation: Lx = (lx + lx+1) / 2
  // For last age, assume Lx = lx / mx (if mx > 0)
  const Lx: number[] = [];
  for (let a = 0; a < maxAge; a++) {
    Lx[a] = (lx[a] + lx[a + 1]) / 2;
  }
  // Open interval at maxAge
  if (mx[maxAge] > 0) {
    Lx[maxAge] = lx[maxAge] / mx[maxAge];
  } else {
    Lx[maxAge] = lx[maxAge];
  }
  
  // Calculate Tx (total person-years remaining)
  const Tx: number[] = new Array(maxAge + 1).fill(0);
  Tx[maxAge] = Lx[maxAge];
  for (let a = maxAge - 1; a >= 0; a--) {
    Tx[a] = Tx[a + 1] + Lx[a];
  }
  
  // Life expectancy at birth
  const e0 = Tx[0] / l0;
  
  return e0;
}

/**
 * Build complete life table from mortality rates
 * 
 * @param mx - Age-specific mortality rates
 * @returns Complete life table object
 */
export function buildLifeTable(mx: number[]): {
  qx: number[];
  lx: number[];
  dx: number[];
  Lx: number[];
  Tx: number[];
  ex: number[];
} {
  const maxAge = mx.length - 1;
  const qx = mx.map(mxToQx);
  
  const l0 = 100000;
  const lx: number[] = [l0];
  const dx: number[] = [];
  const Lx: number[] = [];
  const Tx: number[] = new Array(maxAge + 1).fill(0);
  const ex: number[] = [];
  
  // Calculate lx and dx
  for (let a = 0; a < maxAge; a++) {
    dx[a] = lx[a] * qx[a];
    lx[a + 1] = lx[a] - dx[a];
  }
  dx[maxAge] = lx[maxAge];
  
  // Calculate Lx
  for (let a = 0; a < maxAge; a++) {
    Lx[a] = (lx[a] + lx[a + 1]) / 2;
  }
  Lx[maxAge] = mx[maxAge] > 0 ? lx[maxAge] / mx[maxAge] : lx[maxAge];
  
  // Calculate Tx
  Tx[maxAge] = Lx[maxAge];
  for (let a = maxAge - 1; a >= 0; a--) {
    Tx[a] = Tx[a + 1] + Lx[a];
  }
  
  // Calculate ex
  for (let a = 0; a <= maxAge; a++) {
    ex[a] = lx[a] > 0 ? Tx[a] / lx[a] : 0;
  }
  
  return { qx, lx, dx, Lx, Tx, ex };
}

/**
 * Sum total population across both sexes and all ages
 * 
 * @param pop - Population by sex and age
 * @returns Total population
 */
export function sumPopulation(pop: PopulationBySex): number {
  const sumM = pop.M.reduce((a, b) => a + b, 0);
  const sumF = pop.F.reduce((a, b) => a + b, 0);
  return sumM + sumF;
}

/**
 * Create a full-length array from sparse age/value pairs
 * Fills missing ages with 0
 * 
 * @param ages - Array of ages that have values
 * @param values - Values for those ages
 * @param maxAge - Maximum age in the model
 * @returns Full array from 0 to maxAge
 */
export function createFullAgeArray(
  ages: number[],
  values: number[],
  maxAge: number
): number[] {
  const full = new Array(maxAge + 1).fill(0);
  
  for (let i = 0; i < ages.length; i++) {
    const age = ages[i];
    if (age >= 0 && age <= maxAge) {
      full[age] = values[i];
    }
  }
  
  return full;
}

/**
 * Scale mortality rates by a factor
 * Used for life expectancy calibration
 * 
 * @param mx - Original mortality rates
 * @param factor - Scaling factor (< 1 = lower mortality = higher e0)
 * @returns Scaled mortality rates
 */
export function scaleMortality(mx: number[], factor: number): number[] {
  return mx.map(m => m * factor);
}

/**
 * Calculate age-specific fertility rates from TFR and shape
 * 
 * @param tfr - Total fertility rate
 * @param shape - Normalized fertility shape by age (sum = 1)
 * @returns Age-specific fertility rates
 */
export function calculateASFR(tfr: number, shape: number[]): number[] {
  return shape.map(s => tfr * s);
}

/**
 * Calculate net migration by age from total net migration and shape
 * 
 * @param totalNetMig - Total net migration (can be negative)
 * @param shape - Migration shape by age (sum = 1)
 * @returns Net migration by age
 */
export function calculateNetMigration(totalNetMig: number, shape: number[]): number[] {
  return shape.map(s => totalNetMig * s);
}

/**
 * Scale employment rates by multiplier
 * Clamps result to [0, 1]
 * 
 * @param baseEmp - Base employment rates by age
 * @param multiplier - Employment multiplier
 * @returns Scaled employment rates
 */
export function scaleEmployment(baseEmp: number[], multiplier: number): number[] {
  return baseEmp.map(e => Math.min(1, Math.max(0, e * multiplier)));
}

/**
 * Count deaths from population and mortality
 * 
 * @param population - Population by age
 * @param qx - Death probabilities by age
 * @returns Total deaths
 */
export function countDeaths(population: number[], qx: number[]): number {
  let deaths = 0;
  for (let a = 0; a < population.length; a++) {
    deaths += population[a] * (qx[a] || 0);
  }
  return deaths;
}

/**
 * Calibration result from bisection
 */
export interface CalibrationResult {
  /** Scaled mortality rates */
  scaledMx: number[];
  /** Achieved life expectancy */
  actualE0: number;
  /** Scaling factor applied to baseline mx */
  scalingFactor: number;
}

/**
 * Calibrate mortality rates to achieve a target life expectancy
 * Uses bisection method to find the scaling factor
 * 
 * @param baseMx - Baseline mortality rates by age
 * @param targetE0 - Target life expectancy at birth
 * @param maxIterations - Maximum bisection iterations (default 50)
 * @param tolerance - Convergence tolerance (default 0.01 years)
 * @returns Calibration result with scaled mortality and achieved e0
 */
export function calibrateMortality(
  baseMx: number[],
  targetE0: number,
  maxIterations: number = 50,
  tolerance: number = 0.01
): CalibrationResult {
  // Bisection bounds for scaling factor
  // Lower factor = lower mortality = higher e0
  // Higher factor = higher mortality = lower e0
  let low = 0.05;  // Very low mortality
  let high = 5.0;  // Very high mortality
  
  // Check current e0 at bounds to ensure target is achievable
  const e0AtLow = calculateLifeExpectancy(scaleMortality(baseMx, low));
  const e0AtHigh = calculateLifeExpectancy(scaleMortality(baseMx, high));
  
  // If target is outside achievable range, clamp to nearest bound
  if (targetE0 >= e0AtLow) {
    const scaledMx = scaleMortality(baseMx, low);
    return { scaledMx, actualE0: e0AtLow, scalingFactor: low };
  }
  if (targetE0 <= e0AtHigh) {
    const scaledMx = scaleMortality(baseMx, high);
    return { scaledMx, actualE0: e0AtHigh, scalingFactor: high };
  }
  
  // Bisection
  let mid = 1.0;
  let midE0 = calculateLifeExpectancy(baseMx);
  
  for (let i = 0; i < maxIterations; i++) {
    mid = (low + high) / 2;
    const scaledMx = scaleMortality(baseMx, mid);
    midE0 = calculateLifeExpectancy(scaledMx);
    
    if (Math.abs(midE0 - targetE0) < tolerance) {
      return { scaledMx, actualE0: midE0, scalingFactor: mid };
    }
    
    // Higher e0 than target → need higher mortality (higher factor)
    if (midE0 > targetE0) {
      low = mid;
    } else {
      // Lower e0 than target → need lower mortality (lower factor)
      high = mid;
    }
  }
  
  // Return best result after max iterations
  const scaledMx = scaleMortality(baseMx, mid);
  return { scaledMx, actualE0: midE0, scalingFactor: mid };
}
