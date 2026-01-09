/**
 * Pension Projection Engine
 * Combines demography and PAYG calculations for multi-year projections
 */

import type {
  PensionDataset,
  SliderValues,
  PopulationBySex,
  YearPoint,
  ScenarioResult,
  PensionComponents,
} from '../types/pension';

import {
  mxArrayToQx,
  calculateSurvivors,
  ageCohorts,
  calculateBirths,
  applyMigration,
  createFullAgeArray,
  calibrateMortality,
  scaleEmployment,
  calculateASFR,
  calculateNetMigration,
  sumPopulation,
  countDeaths,
} from './pensionDemography';

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
  findRequiredRetirementAge,
  findRequiredPensionRatio,
  indexCzechPension,
  calculateInitialPension,
} from './pensionPayg';

/**
 * Prepared projection parameters for efficient computation
 */
export interface PreparedParams {
  maxAge: number;
  retAge: number;
  contribRate: number;
  avgWage0: number;
  wageGrowthReal: number;
  cpiAssumed: number;
  pensionerCPI: number;
  srb: number;
  pMale: number;
  
  // Czech pension system parameters
  basicAmountRatio: number;
  percentageAmountRatio: number;
  realWageIndexShare: number;
  minPensionRatio: number;
  
  // Initial pension components
  initialBasicAmount: number;
  initialPercentageAmount: number;
  
  // Age-specific arrays
  asfr: number[];
  qxM: number[];
  qxF: number[];
  empM: number[];
  empF: number[];
  wRelM: number[];
  wRelF: number[];
  
  // Migration - computed dynamically each year from current population
  netMigPer1000: number;
  migShapeM: number[];
  migShapeF: number[];
}

/**
 * Prepare projection parameters from dataset and sliders
 * Pre-computes calibrated mortality, scaled employment, ASFR, etc.
 */
export function prepareProjectionParams(
  dataset: PensionDataset,
  sliders: SliderValues
): PreparedParams {
  const { meta, mortalityCurves, fertilityCurve, laborParticipation, wageProfile, migrationShape, pensionParams, basePopulation } = dataset;
  const maxAge = meta.maxAge;
  
  // Get base mortality rates (mx)
  const baseMxM = mortalityCurves.mx?.M || mortalityCurves.qx?.M || [];
  const baseMxF = mortalityCurves.mx?.F || mortalityCurves.qx?.F || [];
  
  // Calibrate mortality to target life expectancy
  const { scaledMx: scaledMxM } = calibrateMortality(baseMxM, sliders.e0_M);
  const { scaledMx: scaledMxF } = calibrateMortality(baseMxF, sliders.e0_F);
  
  // Convert to qx
  const qxM = mxArrayToQx(scaledMxM);
  const qxF = mxArrayToQx(scaledMxF);
  
  // Create full ASFR array from shape and TFR
  const fullShape = createFullAgeArray(fertilityCurve.ages, fertilityCurve.shape, maxAge);
  const asfr = calculateASFR(sliders.tfr, fullShape);
  
  // Scale employment rates based on unemployment rate
  // empMultiplier = (1 - targetUnemployment) / (1 - baselineUnemployment)
  const baselineUnemployment = pensionParams.baselineUnemploymentRate;
  const targetUnemployment = sliders.unemploymentRate;
  const empMultiplier = (1 - targetUnemployment) / (1 - baselineUnemployment);
  const empM = scaleEmployment(laborParticipation.emp.M, empMultiplier);
  const empF = scaleEmployment(laborParticipation.emp.F, empMultiplier);
  
  // Sex ratio at birth
  const pMale = meta.srb / (1 + meta.srb);
  
  // Calculate initial pension components from sliders
  const avgWage0 = pensionParams.avgWage0;
  const initialBasicAmount = avgWage0 * sliders.basicAmountRatio;
  const initialPercentageAmount = avgWage0 * sliders.percentageAmountRatio;
  
  return {
    maxAge,
    retAge: sliders.retAge,
    contribRate: sliders.contribRate,
    avgWage0,
    wageGrowthReal: sliders.wageGrowthReal,
    cpiAssumed: pensionParams.cpiAssumed,
    pensionerCPI: pensionParams.pensionerCPI,
    srb: meta.srb,
    pMale,
    
    // Czech pension parameters
    basicAmountRatio: sliders.basicAmountRatio,
    percentageAmountRatio: sliders.percentageAmountRatio,
    realWageIndexShare: sliders.realWageIndexShare,
    minPensionRatio: sliders.minPensionRatio,
    initialBasicAmount,
    initialPercentageAmount,
    
    asfr,
    qxM,
    qxF,
    empM,
    empF,
    wRelM: wageProfile.wRel.M,
    wRelF: wageProfile.wRel.F,
    // Migration parameters - calculated dynamically each year
    netMigPer1000: sliders.netMigPer1000,
    migShapeM: migrationShape.shape.M,
    migShapeF: migrationShape.shape.F,
  };
}

/**
 * Result of one year projection step
 */
export interface OneYearResult {
  newPop: PopulationBySex;
  births: number;
  deaths: number;
}

/**
 * Project population forward one year using cohort-component method
 * 
 * Steps:
 * 1. Apply mortality (survivors)
 * 2. Age cohorts
 * 3. Apply migration (dynamically calculated from current population)
 * 4. Calculate and add births
 */
export function projectOneYear(
  pop: PopulationBySex,
  params: PreparedParams
): OneYearResult {
  const { maxAge, qxM, qxF, asfr, netMigPer1000, migShapeM, migShapeF } = params;
  
  // Step 1: Calculate survivors (apply mortality)
  const survivorsM = calculateSurvivors(pop.M, qxM);
  const survivorsF = calculateSurvivors(pop.F, qxF);
  
  // Calculate deaths
  const deathsM = countDeaths(pop.M, qxM);
  const deathsF = countDeaths(pop.F, qxF);
  const deaths = deathsM + deathsF;
  
  // Step 2: Age cohorts (shift to next age)
  let agedM = ageCohorts(survivorsM, maxAge);
  let agedF = ageCohorts(survivorsF, maxAge);
  
  // Step 3: Apply migration (dynamically calculated from CURRENT population)
  const currentPop = sumPopulation({ M: agedM, F: agedF });
  const totalNetMig = (netMigPer1000 / 1000) * currentPop;
  const netMigM = calculateNetMigration(totalNetMig, migShapeM);
  const netMigF = calculateNetMigration(totalNetMig, migShapeF);
  agedM = applyMigration(agedM, netMigM);
  agedF = applyMigration(agedF, netMigF);
  
  // Step 4: Calculate and add births (using post-migration female population)
  const { totalBirths, maleBirths, femaleBirths } = calculateBirths(agedF, asfr, params.srb);
  
  // Add newborns to age 0
  agedM[0] += maleBirths;
  agedF[0] += femaleBirths;
  
  return {
    newPop: { M: agedM, F: agedF },
    births: totalBirths,
    deaths,
  };
}

/**
 * Calculate PAYG metrics for a given population state with Czech pension model
 */
function calculateYearPoint(
  pop: PopulationBySex,
  params: PreparedParams,
  year: number,
  yearIndex: number,
  births: number,
  deaths: number,
  pensionComponents: PensionComponents,
  cumulativeWageGap: number
): YearPoint {
  const empPop: PopulationBySex = { M: params.empM, F: params.empF };
  const wRelPop: PopulationBySex = { M: params.wRelM, F: params.wRelF };
  
  const avgWage = calculateAvgWage(params.avgWage0, params.wageGrowthReal, yearIndex);
  const avgPension = pensionComponents.totalPension;
  
  const totalPop = sumPopulation(pop);
  const wageBill = calculateWageBill(pop, empPop, wRelPop, avgWage);
  const contrib = calculateContributions(wageBill, params.contribRate);
  const pensioners = countPensioners(pop, params.retAge);
  const benefits = calculateBenefits(pensioners, avgPension);
  const balance = calculateBalance(contrib, benefits);
  const workers = countWorkers(pop, empPop);
  const requiredRate = calculateRequiredRate(benefits, wageBill);
  const dependencyRatio = calculateDependencyRatio(pensioners, workers);
  
  // Calculate equilibrium values (what's needed for balance)
  const equilibriumParams = {
    population: pop,
    employment: empPop,
    wageRel: wRelPop,
    avgWage,
    contribRate: params.contribRate,
    maxAge: params.maxAge,
  };
  
  // Required retirement age for balance (given current pension)
  const requiredRetAge = findRequiredRetirementAge({
    ...equilibriumParams,
    avgPension,
  }, 50, 80);
  
  // Required pension ratio for balance (given current retirement age)
  const requiredPensionRatio = findRequiredPensionRatio({
    ...equilibriumParams,
    avgWage0: params.avgWage0,
    retAge: params.retAge,
  });
  
  return {
    year,
    totalPop,
    births,
    deaths,
    pensioners,
    workers,
    wageBill,
    contrib,
    benefits,
    balance,
    requiredRate,
    dependencyRatio,
    avgWage,
    avgPension,
    pensionComponents,
    cumulativeWageGap,
    requiredRetAge,
    requiredPensionRatio,
  };
}

/**
 * Run full projection from base year to horizon
 */
export function runProjection(
  dataset: PensionDataset,
  sliders: SliderValues,
  horizonYears: number
): ScenarioResult {
  const params = prepareProjectionParams(dataset, sliders);
  const baseYear = dataset.meta.baseYear;
  const maxAge = dataset.meta.maxAge;
  
  // Initialize with base population (deep copy)
  let currentPop: PopulationBySex = {
    M: [...dataset.basePopulation.population.M],
    F: [...dataset.basePopulation.population.F],
  };
  
  const points: YearPoint[] = [];
  
  // Population pyramids storage - optimized for slider animation
  const pyramidsM: number[][] = [];
  const pyramidsF: number[][] = [];
  
  // Initialize Czech pension components
  let currentPension = calculateInitialPension(
    params.avgWage0,
    params.basicAmountRatio,
    params.percentageAmountRatio,
    params.minPensionRatio
  );
  let cumulativeWageGap = 0;
  
  // Year 0 (base year)
  points.push(calculateYearPoint(currentPop, params, baseYear, 0, 0, 0, currentPension, cumulativeWageGap));
  pyramidsM.push([...currentPop.M]);
  pyramidsF.push([...currentPop.F]);
  
  // Project forward
  for (let i = 1; i <= horizonYears; i++) {
    const { newPop, births, deaths } = projectOneYear(currentPop, params);
    currentPop = newPop;
    
    // Calculate current year's average wage
    const avgWage = calculateAvgWage(params.avgWage0, params.wageGrowthReal, i);
    
    // Index pension using Czech rules
    const indexResult = indexCzechPension(
      currentPension,
      {
        avgWage,
        basicAmountRatio: params.basicAmountRatio,
        minPensionRatio: params.minPensionRatio,
        realWageIndexShare: params.realWageIndexShare,
        pensionerCPI: params.pensionerCPI,
        realWageGrowth: params.wageGrowthReal,
      },
      cumulativeWageGap
    );
    
    currentPension = indexResult.components;
    cumulativeWageGap = indexResult.newCumulativeGap;
    
    points.push(calculateYearPoint(currentPop, params, baseYear + i, i, births, deaths, currentPension, cumulativeWageGap));
    pyramidsM.push([...currentPop.M]);
    pyramidsF.push([...currentPop.F]);
  }
  
  return {
    datasetId: dataset.meta.datasetId,
    baseYear,
    horizonYears,
    points,
    pyramids: {
      M: pyramidsM,
      F: pyramidsF,
      maxAge,
    },
  };
}

/**
 * Load pension dataset from static files
 * 
 * @param datasetPath - Path relative to /data/ (e.g., "pension/test-cz-2024")
 * @returns Loaded and parsed dataset
 */
export async function loadPensionDataset(datasetPath: string): Promise<PensionDataset> {
  const basePath = `/data/${datasetPath}`;
  
  const [
    metaRes,
    popRes,
    fertRes,
    mortRes,
    laborRes,
    wageRes,
    pensionRes,
    migRes,
    baselineRes,
  ] = await Promise.all([
    fetch(`${basePath}/meta.json`),
    fetch(`${basePath}/base-population-czk.json`),
    fetch(`${basePath}/fertility-curve-shape.json`),
    fetch(`${basePath}/mortality-curves.json`),
    fetch(`${basePath}/labor-participation.json`),
    fetch(`${basePath}/wage-profile.json`),
    fetch(`${basePath}/pension-params.json`),
    fetch(`${basePath}/migration-shape.json`),
    fetch(`${basePath}/baseline-totals.json`),
  ]);
  
  if (!metaRes.ok) throw new Error(`Failed to load meta.json: ${metaRes.statusText}`);
  if (!popRes.ok) throw new Error(`Failed to load base-population-czk.json: ${popRes.statusText}`);
  if (!fertRes.ok) throw new Error(`Failed to load fertility-curve-shape.json: ${fertRes.statusText}`);
  if (!mortRes.ok) throw new Error(`Failed to load mortality-curves.json: ${mortRes.statusText}`);
  if (!laborRes.ok) throw new Error(`Failed to load labor-participation.json: ${laborRes.statusText}`);
  if (!wageRes.ok) throw new Error(`Failed to load wage-profile.json: ${wageRes.statusText}`);
  if (!pensionRes.ok) throw new Error(`Failed to load pension-params.json: ${pensionRes.statusText}`);
  if (!migRes.ok) throw new Error(`Failed to load migration-shape.json: ${migRes.statusText}`);
  if (!baselineRes.ok) throw new Error(`Failed to load baseline-totals.json: ${baselineRes.statusText}`);
  
  return {
    meta: await metaRes.json(),
    basePopulation: await popRes.json(),
    fertilityCurve: await fertRes.json(),
    mortalityCurves: await mortRes.json(),
    laborParticipation: await laborRes.json(),
    wageProfile: await wageRes.json(),
    pensionParams: await pensionRes.json(),
    migrationShape: await migRes.json(),
    baselineTotals: await baselineRes.json(),
  };
}
