/**
 * Debt anchor data structure
 * Contains the base amount and planned deficit for debt calculation
 */
export interface DebtAnchor {
  /** Base debt amount in CZK at anchor date */
  baseAmount: number;
  /** Anchor date in ISO 8601 format (YYYY-MM-DD) */
  anchorDate: string;
  /** Planned budget deficit for 2025 in CZK */
  plannedDeficit2025: number;
  /** Currency code */
  currency: string;
  /** Data source name */
  source: string;
  /** Last update date in ISO 8601 format */
  lastUpdated: string;
}

/**
 * Computed debt state for display
 */
export interface DebtState {
  /** Current computed debt amount in CZK */
  currentAmount: number;
  /** Deficit increment per second in CZK */
  deficitPerSecond: number;
  /** Timestamp when the calculation was made */
  calculatedAt: Date;
}

/**
 * Historical debt data point with yearly end-of-year value
 */
export interface HistoricalDebtPoint {
  year: number;
  amount: number;
}

/**
 * Historical debt data structure from JSON file
 */
export interface HistoricalDebtData {
  source: string;
  sourceUrl: string;
  lastUpdated: string;
  currency: string;
  unit: string;
  description: string;
  data: HistoricalDebtPoint[];
}

/**
 * Processed data point for chart display
 */
export interface ChartDataPoint {
  year: number;
  amount: number; // value depends on graph variant
  isPrediction?: boolean;
  planId?: string;
  planName?: string;
  planColor?: string;
  note?: string;
}

/**
 * Event data for chart annotations
 */
export interface ChartEvent {
  id: string;
  name: string;
  date: string;
  year: number;
}

export interface EventsData {
  description: string;
  events: ChartEvent[];
}

/**
 * Government data for chart annotations
 */
export interface Government {
  name: string;
  startDate: string;
  endDate: string | null;
  party: string;
}

export interface PartyInfo {
  name: string;
  color: string;
}

export interface GovernmentsData {
  source: string;
  sourceUrl: string;
  parties: Record<string, PartyInfo>;
  governments: Government[];
}

/**
 * Budget plan prediction
 */
export interface BudgetPrediction {
  year: number;
  deficit: number;
  note: string;
}

export interface BudgetPlan {
  id: string;
  name: string;
  description: string;
  color: string;
  predictions: BudgetPrediction[];
}

export interface BudgetPlansData {
  description: string;
  source: string;
  plans: BudgetPlan[];
}

/**
 * Economic data for a year
 */
export interface EconomicYearData {
  year: number;
  inflationRate: number; // percent year-over-year
  gdp: number; // billion CZK
}

export interface EconomicData {
  description: string;
  sources: string[];
  data: EconomicYearData[];
  units: {
    inflationRate: string;
    gdp: string;
  };
}

/**
 * Demographic data for a year
 */
export interface DemographicYearData {
  year: number;
  population: number; // total population
  workingAge: number; // working age population (15-64)
}

export interface DemographicData {
  description: string;
  source: string;
  sourceUrl: string;
  unit: string;
  data: DemographicYearData[];
}

/**
 * Debt interest payment data for a year
 */
export interface InterestYearData {
  year: number;
  interest: number; // billion CZK
}

export interface InterestData {
  description: string;
  source: string;
  sourceUrl: string;
  unit: string;
  data: InterestYearData[];
}

/**
 * Population mode for per-capita calculations
 */
export type PopulationMode = 
  | 'country'      // Whole country (absolute values)
  | 'per-capita'   // Per person (divided by total population)
  | 'per-working'; // Per working age person (divided by working age population)

export interface PopulationModeInfo {
  id: PopulationMode;
  name: string;
  shortName: string;
  description: string;
}

/**
 * Graph variant types
 */
export type GraphVariant = 
  | 'debt-absolute'           // A. Cumulative debt in absolute value
  | 'debt-inflation-adjusted' // B. Cumulative debt adjusted to inflation
  | 'debt-gdp-percent'        // C. Cumulative debt as GDP percentage
  | 'deficit-absolute'        // D. Yearly deficit in absolute value
  | 'deficit-inflation-adjusted' // E. Yearly deficit adjusted to inflation
  | 'deficit-gdp-percent'     // F. Yearly deficit as GDP percentage
  | 'interest-absolute'       // G. Yearly interest payments in absolute value
  | 'interest-cumulative';    // H. Cumulative interest payments (inflation-adjusted)

export interface GraphVariantInfo {
  id: GraphVariant;
  name: string;
  shortName: string;
  unit: string;
  description: string;
}

/**
 * Wage data for a year
 */
export interface WageYearData {
  year: number;
  averageGross: number;  // CZK/month
  averageNet: number;    // CZK/month
  minimumGross: number;  // CZK/month
  minimumNet: number;    // CZK/month
}

export interface WageData {
  description: string;
  sources: string[];
  sourceUrls: string[];
  data: WageYearData[];
}

/**
 * Price data for a year
 */
export interface PriceYearData {
  year: number;
  petrol95: number;      // CZK/litre
  highwayKm: number;     // million CZK/km
  hospital: number;      // million CZK
  school: number;        // million CZK
}

export interface PriceData {
  description: string;
  sources: string[];
  sourceUrls: string[];
  data: PriceYearData[];
}

/**
 * Food price data for a year
 */
export interface FoodPriceYearData {
  year: number;
  bread: number;     // CZK per 1 kg (chléb kmínový)
  eggs: number;      // CZK per 10 ks (vejce)
  butter: number;    // CZK per 1 kg (máslo)
  potatoes: number;  // CZK per 1 kg (brambory)
  beer: number;      // CZK per 0.5 l (pivo)
}

export interface FoodPriceData {
  description: string;
  source: string;
  sourceUrl: string;
  data: FoodPriceYearData[];
}

/**
 * Metric unit types - different for each population mode
 */
export type MetricUnitCountry = 
  | 'czk'           // Czech Koruna (default)
  | 'highway-km'    // Kilometres of highways
  | 'hospitals'     // Regional hospitals
  | 'schools';      // Primary schools

export type MetricUnitPerCapita = 
  | 'czk'           // Czech Koruna (default)
  | 'petrol-litres' // Litres of petrol 95
  | 'bread-kg'      // Kilograms of bread
  | 'eggs-10'       // 10-packs of eggs
  | 'butter-kg'     // Kilograms of butter
  | 'potatoes-kg'   // Kilograms of potatoes
  | 'beer-05l';     // 0.5l bottles of beer

export type MetricUnitPerWorking = 
  | 'czk'              // Czech Koruna (default)
  | 'avg-gross-months' // Months of average gross salary
  | 'avg-net-months'   // Months of average net salary
  | 'min-gross-months' // Months of minimum gross wage
  | 'min-net-months';  // Months of minimum net wage

export type MetricUnit = MetricUnitCountry | MetricUnitPerCapita | MetricUnitPerWorking;

export interface MetricUnitInfo {
  id: MetricUnit;
  name: string;
  shortName: string;
  description: string;
  formatSuffix: string;  // e.g., "Kč", "l", "měsíců"
  populationMode: PopulationMode;
  minYear?: number;      // Minimum year for which data is available
}
