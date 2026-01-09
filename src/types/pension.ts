/**
 * Pension System Simulation Types
 * TypeScript interfaces for cohort-component demographic model
 * and PAYG pension system balance projection
 */

// ============================================================================
// Static Data File Types
// ============================================================================

/**
 * Dataset metadata and configuration
 */
export interface PensionMeta {
  datasetId: string;
  country: string;
  baseYear: number;
  maxAge: number;
  currency: string;
  sexes: ['M', 'F'];
  
  /** Minimum fertile age */
  ageMinFert: number;
  /** Maximum fertile age */
  ageMaxFert: number;
  /** Minimum working age */
  ageMinWork: number;
  /** Maximum working age */
  ageMaxWork: number;
  
  /** Sex ratio at birth (males per female) */
  srb: number;
  
  /** Default slider values */
  defaults: SliderValues;
  
  /** Slider ranges [min, max] */
  sliderRanges: SliderRanges;
}

/**
 * User-adjustable parameters via sliders
 */
export interface SliderValues {
  /** Projection horizon in years */
  horizonYears: number;
  /** Total fertility rate */
  tfr: number;
  /** Life expectancy at birth - males */
  e0_M: number;
  /** Life expectancy at birth - females */
  e0_F: number;
  /** Net migration per 1000 population */
  netMigPer1000: number;
  /** Initial pension as ratio of average wage (e.g., 0.45 = 45%) */
  pensionWageRatio: number;
  /** Real wage growth rate (decimal, e.g., 0.01 = 1%) */
  wageGrowthReal: number;
  /** Unemployment rate (decimal, e.g., 0.04 = 4%) */
  unemploymentRate: number;
  /** Retirement age */
  retAge: number;
  /** Pension indexation weight (0=CPI only, 1=wage only) */
  indexWageWeight: number;
}

/**
 * Slider range configuration [min, max]
 */
export interface SliderRanges {
  tfr: [number, number];
  e0_M: [number, number];
  e0_F: [number, number];
  netMigPer1000: [number, number];
  pensionWageRatio: [number, number];
  wageGrowthReal: [number, number];
  unemploymentRate: [number, number];
  retAge: [number, number];
  indexWageWeight: [number, number];
}

/**
 * Population by sex - arrays indexed by age (0 to maxAge)
 */
export interface PopulationBySex {
  M: number[];
  F: number[];
}

/**
 * Base population data file
 */
export interface BasePopulationData {
  unit: 'persons';
  population: PopulationBySex;
}

/**
 * Fertility curve shape (normalized to sum = 1)
 */
export interface FertilityCurveData {
  unit: 'share';
  /** Ages for which shape values are provided */
  ages: number[];
  /** Normalized fertility shape values (sum = 1) */
  shape: number[];
}

/**
 * Mortality curves (mx = death rate per year)
 */
export interface MortalityCurvesData {
  type: 'mx' | 'qx';
  unit: 'perYear' | 'probability';
  mx?: PopulationBySex;
  qx?: PopulationBySex;
}

/**
 * Labor force participation / employment rates
 */
export interface LaborParticipationData {
  type: 'employmentRate';
  unit: 'share';
  emp: PopulationBySex;
}

/**
 * Wage profile relative to average wage
 */
export interface WageProfileData {
  unit: 'relativeToAvgWage';
  wRel: PopulationBySex;
}

/**
 * PAYG pension system parameters
 */
export interface PensionParamsData {
  unit: 'annual';
  /** Contribution rate (0-1) */
  contribRate: number;
  /** Average annual wage in base year */
  avgWage0: number;
  /** Average annual pension in base year */
  avgPension0: number;
  /** Assumed CPI inflation rate */
  cpiAssumed: number;
  /** Baseline unemployment rate for calibration (0-1, e.g., 0.04 = 4%) */
  baselineUnemploymentRate: number;
}

/**
 * Migration shape by sex and age (normalized to sum = 1)
 */
export interface MigrationShapeData {
  unit: 'share';
  note?: string;
  shape: PopulationBySex;
}

/**
 * Baseline calibration totals
 */
export interface BaselineTotalsData {
  unit: 'annual';
  totalPop0: number;
  wageBill0: number;
  workers0: number;
  pensioners0: number;
  contribRevenue0: number;
  benefitSpending0: number;
  gdp0: number;
}

/**
 * Complete dataset combining all data files
 */
export interface PensionDataset {
  meta: PensionMeta;
  basePopulation: BasePopulationData;
  fertilityCurve: FertilityCurveData;
  mortalityCurves: MortalityCurvesData;
  laborParticipation: LaborParticipationData;
  wageProfile: WageProfileData;
  pensionParams: PensionParamsData;
  migrationShape: MigrationShapeData;
  baselineTotals: BaselineTotalsData;
}

// ============================================================================
// Projection Output Types
// ============================================================================

/**
 * Single year projection result
 */
export interface YearPoint {
  /** Calendar year */
  year: number;
  /** Total population */
  totalPop: number;
  /** Births in this year */
  births: number;
  /** Deaths in this year */
  deaths: number;
  /** Number of pensioners (age >= retAge) */
  pensioners: number;
  /** Number of workers (employed) */
  workers: number;
  
  /** Total wage bill */
  wageBill: number;
  /** Total contributions (contribRate × wageBill) */
  contrib: number;
  /** Total benefit spending (pensioners × avgPension) */
  benefits: number;
  /** Balance (contributions - benefits) */
  balance: number;
  
  /** Required contribution rate (benefits / wageBill) */
  requiredRate: number;
  /** Dependency ratio (pensioners / workers) */
  dependencyRatio: number;
  /** Average wage in this year */
  avgWage: number;
  /** Average pension in this year */
  avgPension: number;
}

/**
 * Full scenario projection result
 */
export interface ScenarioResult {
  datasetId: string;
  baseYear: number;
  horizonYears: number;
  /** Year-by-year results from baseYear to baseYear + horizonYears */
  points: YearPoint[];
}

// ============================================================================
// WebWorker Message Types
// ============================================================================

/**
 * Initialize worker with dataset
 */
export interface WorkerInitRequest {
  type: 'init';
  datasetPath: string;
}

/**
 * Run projection scenario
 */
export interface WorkerRunRequest {
  type: 'run';
  sliders: SliderValues;
  horizonYears: number;
}

export type WorkerRequest = WorkerInitRequest | WorkerRunRequest;

/**
 * Successful result response
 */
export interface WorkerResultResponse {
  type: 'result';
  result: ScenarioResult;
}

/**
 * Error response
 */
export interface WorkerErrorResponse {
  type: 'error';
  message: string;
}

/**
 * Ready response after init
 */
export interface WorkerReadyResponse {
  type: 'ready';
  datasetId: string;
  defaults: SliderValues;
  sliderRanges: SliderRanges;
}

export type WorkerResponse = WorkerResultResponse | WorkerErrorResponse | WorkerReadyResponse;

// ============================================================================
// Internal Calculation Types
// ============================================================================

/**
 * Population state for projection
 */
export interface PopulationState {
  M: number[];
  F: number[];
}

/**
 * Projection parameters derived from sliders and base data
 */
export interface ProjectionParams {
  /** Scaled mortality qx by sex */
  qx: PopulationBySex;
  /** Age-specific fertility rates */
  asfr: number[];
  /** Scaled employment rates by sex */
  emp: PopulationBySex;
  /** Net migration by sex and age */
  netMig: PopulationBySex;
  /** Sex ratio at birth probability for male */
  pMale: number;
  /** Maximum age in the model */
  maxAge: number;
}

/**
 * Life table for life expectancy calculation
 */
export interface LifeTable {
  /** Age-specific mortality rates */
  qx: number[];
  /** Survivorship lx (starting at 100000) */
  lx: number[];
  /** Deaths dx */
  dx: number[];
  /** Person-years lived Lx */
  Lx: number[];
  /** Total person-years remaining Tx */
  Tx: number[];
  /** Life expectancy ex */
  ex: number[];
}
