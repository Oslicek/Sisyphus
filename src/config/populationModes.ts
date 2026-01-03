import type { PopulationMode, PopulationModeInfo } from '../types/debt';

export const POPULATION_MODES: PopulationModeInfo[] = [
  {
    id: 'country',
    name: 'Celá země',
    shortName: 'Celá země',
    description: 'Absolutní hodnoty za celou zemi',
  },
  {
    id: 'per-capita',
    name: 'Na obyvatele',
    shortName: 'Na obyvatele',
    description: 'Hodnoty přepočtené na jednoho obyvatele',
  },
  {
    id: 'per-working',
    name: 'Na obyvatele v aktivním věku',
    shortName: 'Na prac. obyvatele',
    description: 'Hodnoty přepočtené na jednoho obyvatele ve věku 15-64 let',
  },
];

export function getPopulationModeInfo(mode: PopulationMode): PopulationModeInfo {
  return POPULATION_MODES.find((m) => m.id === mode) ?? POPULATION_MODES[0];
}








