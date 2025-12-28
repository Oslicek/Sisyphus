import type { ChartDataPoint, PriceYearData, WageYearData, FoodPriceYearData, MetricUnit, PopulationMode } from '../types/debt';

/**
 * Convert chart data from billions CZK to highway kilometers
 * @param data - Chart data points with amounts in billion CZK
 * @param priceData - Price data with highway construction costs
 * @returns New array with amounts in highway kilometers
 */
export function convertToHighwayKm(
  data: ChartDataPoint[],
  priceData: PriceYearData[]
): ChartDataPoint[] {
  return data.map((point) => {
    const price = priceData.find((p) => p.year === point.year);
    if (!price || price.highwayKm === 0) {
      return { ...point, amount: 0 };
    }
    // Amount is in billion CZK, highway cost is in million CZK/km
    // So: (billion * 1000) / million = thousands of km? No...
    // billion CZK = 1000 million CZK
    // km = (amount in billion * 1000 million) / (cost in million per km)
    const km = (point.amount * 1000) / price.highwayKm;
    return { ...point, amount: km };
  });
}

/**
 * Convert chart data from billions CZK to number of hospitals
 * @param data - Chart data points with amounts in billion CZK
 * @param priceData - Price data with hospital construction costs
 * @returns New array with amounts in number of hospitals
 */
export function convertToHospitals(
  data: ChartDataPoint[],
  priceData: PriceYearData[]
): ChartDataPoint[] {
  return data.map((point) => {
    const price = priceData.find((p) => p.year === point.year);
    if (!price || price.hospital === 0) {
      return { ...point, amount: 0 };
    }
    // Amount is in billion CZK, hospital cost is in million CZK
    const hospitals = (point.amount * 1000) / price.hospital;
    return { ...point, amount: hospitals };
  });
}

/**
 * Convert chart data from billions CZK to number of schools
 * @param data - Chart data points with amounts in billion CZK
 * @param priceData - Price data with school construction costs
 * @returns New array with amounts in number of schools
 */
export function convertToSchools(
  data: ChartDataPoint[],
  priceData: PriceYearData[]
): ChartDataPoint[] {
  return data.map((point) => {
    const price = priceData.find((p) => p.year === point.year);
    if (!price || price.school === 0) {
      return { ...point, amount: 0 };
    }
    // Amount is in billion CZK, school cost is in million CZK
    const schools = (point.amount * 1000) / price.school;
    return { ...point, amount: schools };
  });
}

/**
 * Convert chart data from CZK to litres of petrol 95
 * @param data - Chart data points with amounts in CZK (per capita)
 * @param priceData - Price data with petrol prices
 * @returns New array with amounts in litres
 */
export function convertToPetrolLitres(
  data: ChartDataPoint[],
  priceData: PriceYearData[]
): ChartDataPoint[] {
  return data.map((point) => {
    const price = priceData.find((p) => p.year === point.year);
    if (!price || price.petrol95 === 0) {
      return { ...point, amount: 0 };
    }
    // Amount is in CZK, petrol price is in CZK/litre
    const litres = point.amount / price.petrol95;
    return { ...point, amount: litres };
  });
}

/**
 * Convert chart data from CZK to months of salary
 * @param data - Chart data points with amounts in CZK (per capita)
 * @param wageData - Wage data with monthly salaries
 * @param salaryType - Type of salary to use
 * @returns New array with amounts in months
 */
export function convertToSalaryMonths(
  data: ChartDataPoint[],
  wageData: WageYearData[],
  salaryType: 'averageGross' | 'averageNet' | 'minimumGross' | 'minimumNet'
): ChartDataPoint[] {
  return data.map((point) => {
    const wage = wageData.find((w) => w.year === point.year);
    if (!wage) {
      return { ...point, amount: 0 };
    }
    const monthlySalary = wage[salaryType];
    if (monthlySalary === 0) {
      return { ...point, amount: 0 };
    }
    // Amount is in CZK, salary is in CZK/month
    const months = point.amount / monthlySalary;
    return { ...point, amount: months };
  });
}

/**
 * Convert chart data from CZK to food units
 * @param data - Chart data points with amounts in CZK (per capita)
 * @param foodPriceData - Food price data
 * @param foodType - Type of food to convert to
 * @returns New array with amounts in food units
 */
export function convertToFoodUnits(
  data: ChartDataPoint[],
  foodPriceData: FoodPriceYearData[],
  foodType: 'bread' | 'eggs' | 'butter' | 'potatoes' | 'beer'
): ChartDataPoint[] {
  return data.map((point) => {
    const food = foodPriceData.find((f) => f.year === point.year);
    if (!food) {
      return { ...point, amount: 0 };
    }
    const price = food[foodType];
    if (price === 0) {
      return { ...point, amount: 0 };
    }
    // Amount is in CZK, food price is in CZK per unit
    const units = point.amount / price;
    return { ...point, amount: units };
  });
}

/**
 * Convert chart data to a specific metric unit
 * @param data - Chart data points
 * @param unit - Target metric unit
 * @param mode - Population mode (determines how data is interpreted)
 * @param priceData - Price data for conversions
 * @param wageData - Wage data for salary conversions
 * @param foodPriceData - Optional food price data for food conversions
 * @returns New array with converted amounts
 */
export function convertToMetricUnit(
  data: ChartDataPoint[],
  unit: MetricUnit,
  mode: PopulationMode,
  priceData: PriceYearData[],
  wageData: WageYearData[],
  foodPriceData?: FoodPriceYearData[]
): ChartDataPoint[] {
  // CZK is always the default - no conversion needed
  if (unit === 'czk') {
    return data;
  }

  // Country-level conversions (data is in billion CZK)
  if (mode === 'country') {
    switch (unit) {
      case 'highway-km':
        return convertToHighwayKm(data, priceData);
      case 'hospitals':
        return convertToHospitals(data, priceData);
      case 'schools':
        return convertToSchools(data, priceData);
      default:
        return data;
    }
  }

  // Per-capita conversions (data is in CZK)
  if (mode === 'per-capita') {
    switch (unit) {
      case 'petrol-litres':
        return convertToPetrolLitres(data, priceData);
      case 'bread-kg':
        return foodPriceData ? convertToFoodUnits(data, foodPriceData, 'bread') : data;
      case 'eggs-10':
        return foodPriceData ? convertToFoodUnits(data, foodPriceData, 'eggs') : data;
      case 'butter-kg':
        return foodPriceData ? convertToFoodUnits(data, foodPriceData, 'butter') : data;
      case 'potatoes-kg':
        return foodPriceData ? convertToFoodUnits(data, foodPriceData, 'potatoes') : data;
      case 'beer-05l':
        return foodPriceData ? convertToFoodUnits(data, foodPriceData, 'beer') : data;
      default:
        return data;
    }
  }

  // Per-working conversions (data is in CZK)
  if (mode === 'per-working') {
    switch (unit) {
      case 'avg-gross-months':
        return convertToSalaryMonths(data, wageData, 'averageGross');
      case 'avg-net-months':
        return convertToSalaryMonths(data, wageData, 'averageNet');
      case 'min-gross-months':
        return convertToSalaryMonths(data, wageData, 'minimumGross');
      case 'min-net-months':
        return convertToSalaryMonths(data, wageData, 'minimumNet');
      default:
        return data;
    }
  }

  return data;
}

