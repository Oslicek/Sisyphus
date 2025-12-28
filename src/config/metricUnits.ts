import type { MetricUnit, MetricUnitInfo, PopulationMode } from '../types/debt';

// Metric units for country-level (absolute) values
export const COUNTRY_METRIC_UNITS: MetricUnitInfo[] = [
  {
    id: 'czk',
    name: 'Koruny české',
    shortName: 'Kč',
    description: 'Hodnota v českých korunách',
    formatSuffix: 'Kč',
    populationMode: 'country',
  },
  {
    id: 'highway-km',
    name: 'Kilometry dálnic',
    shortName: 'km dálnic',
    description: 'Ekvivalent v kilometrech postavených dálnic',
    formatSuffix: 'km',
    populationMode: 'country',
  },
  {
    id: 'hospitals',
    name: 'Nemocnice',
    shortName: 'Nemocnice',
    description: 'Ekvivalent v počtu regionálních nemocnic',
    formatSuffix: 'nemocnic',
    populationMode: 'country',
  },
  {
    id: 'schools',
    name: 'Školy',
    shortName: 'Školy',
    description: 'Ekvivalent v počtu základních škol',
    formatSuffix: 'škol',
    populationMode: 'country',
  },
];

// Metric units for per-capita values
export const PER_CAPITA_METRIC_UNITS: MetricUnitInfo[] = [
  {
    id: 'czk',
    name: 'Koruny české',
    shortName: 'Kč',
    description: 'Hodnota v českých korunách na obyvatele',
    formatSuffix: 'Kč',
    populationMode: 'per-capita',
  },
  {
    id: 'petrol-litres',
    name: 'Litry benzínu',
    shortName: 'Benzín',
    description: 'Ekvivalent v litrech benzínu Natural 95',
    formatSuffix: 'l',
    populationMode: 'per-capita',
  },
  {
    id: 'bread-kg',
    name: 'Kilogramy chleba',
    shortName: 'Chléb',
    description: 'Ekvivalent v kilogramech kmínového chleba',
    formatSuffix: 'kg',
    populationMode: 'per-capita',
    minYear: 2006,
  },
  {
    id: 'eggs-10',
    name: 'Balení vajec (10 ks)',
    shortName: 'Vejce',
    description: 'Ekvivalent v baleních po 10 vajíčkách',
    formatSuffix: 'bal.',
    populationMode: 'per-capita',
    minYear: 2006,
  },
  {
    id: 'butter-kg',
    name: 'Kilogramy másla',
    shortName: 'Máslo',
    description: 'Ekvivalent v kilogramech másla',
    formatSuffix: 'kg',
    populationMode: 'per-capita',
    minYear: 2006,
  },
  {
    id: 'potatoes-kg',
    name: 'Kilogramy brambor',
    shortName: 'Brambory',
    description: 'Ekvivalent v kilogramech konzumních brambor',
    formatSuffix: 'kg',
    populationMode: 'per-capita',
    minYear: 2006,
  },
  {
    id: 'beer-05l',
    name: 'Pivo (0,5 l)',
    shortName: 'Pivo',
    description: 'Ekvivalent v lahvích piva (0,5 l)',
    formatSuffix: 'lahví',
    populationMode: 'per-capita',
    minYear: 2006,
  },
];

// Metric units for per-working-age values
export const PER_WORKING_METRIC_UNITS: MetricUnitInfo[] = [
  {
    id: 'czk',
    name: 'Koruny české',
    shortName: 'Kč',
    description: 'Hodnota v českých korunách na pracujícího',
    formatSuffix: 'Kč',
    populationMode: 'per-working',
  },
  {
    id: 'avg-gross-months',
    name: 'Měsíce hrubé průměrné mzdy',
    shortName: 'Hrubá prům.',
    description: 'Ekvivalent v měsících hrubé průměrné mzdy',
    formatSuffix: 'měs.',
    populationMode: 'per-working',
  },
  {
    id: 'avg-net-months',
    name: 'Měsíce čisté průměrné mzdy',
    shortName: 'Čistá prům.',
    description: 'Ekvivalent v měsících čisté průměrné mzdy',
    formatSuffix: 'měs.',
    populationMode: 'per-working',
  },
  {
    id: 'min-gross-months',
    name: 'Měsíce hrubé minimální mzdy',
    shortName: 'Hrubá min.',
    description: 'Ekvivalent v měsících hrubé minimální mzdy',
    formatSuffix: 'měs.',
    populationMode: 'per-working',
  },
  {
    id: 'min-net-months',
    name: 'Měsíce čisté minimální mzdy',
    shortName: 'Čistá min.',
    description: 'Ekvivalent v měsících čisté minimální mzdy',
    formatSuffix: 'měs.',
    populationMode: 'per-working',
  },
];

// All metric units
export const ALL_METRIC_UNITS: MetricUnitInfo[] = [
  ...COUNTRY_METRIC_UNITS,
  ...PER_CAPITA_METRIC_UNITS,
  ...PER_WORKING_METRIC_UNITS,
];

/**
 * Get metric units available for a specific population mode
 */
export function getMetricUnitsForMode(mode: PopulationMode): MetricUnitInfo[] {
  switch (mode) {
    case 'country':
      return COUNTRY_METRIC_UNITS;
    case 'per-capita':
      return PER_CAPITA_METRIC_UNITS;
    case 'per-working':
      return PER_WORKING_METRIC_UNITS;
    default:
      return COUNTRY_METRIC_UNITS;
  }
}

/**
 * Get info for a specific metric unit
 */
export function getMetricUnitInfo(unit: MetricUnit, mode: PopulationMode): MetricUnitInfo {
  const units = getMetricUnitsForMode(mode);
  return units.find((u) => u.id === unit) ?? units[0];
}

/**
 * Get default metric unit for a population mode
 */
export function getDefaultMetricUnit(_mode: PopulationMode): MetricUnit {
  return 'czk';
}

