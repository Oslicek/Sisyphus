import type { GraphVariant, GraphVariantInfo } from '../types/debt';

export const GRAPH_VARIANTS: GraphVariantInfo[] = [
  {
    id: 'debt-absolute',
    name: 'Kumulativní dluh (nominální)',
    shortName: 'Dluh',
    unit: 'miliard Kč',
    description: 'Celkový státní dluh v nominálních hodnotách',
  },
  {
    id: 'debt-inflation-adjusted',
    name: 'Kumulativní dluh (reálný)',
    shortName: 'Dluh (reálný)',
    unit: 'miliard Kč (v cenách 2025)',
    description: 'Celkový státní dluh přepočtený na ceny roku 2025',
  },
  {
    id: 'debt-gdp-percent',
    name: 'Kumulativní dluh (% HDP)',
    shortName: 'Dluh/HDP',
    unit: '% HDP',
    description: 'Celkový státní dluh jako procento HDP',
  },
  {
    id: 'deficit-absolute',
    name: 'Roční schodek (nominální)',
    shortName: 'Schodek',
    unit: 'miliard Kč',
    description: 'Roční přírůstek státního dluhu v nominálních hodnotách',
  },
  {
    id: 'deficit-inflation-adjusted',
    name: 'Roční schodek (reálný)',
    shortName: 'Schodek (reálný)',
    unit: 'miliard Kč (v cenách 2025)',
    description: 'Roční přírůstek státního dluhu přepočtený na ceny roku 2025',
  },
  {
    id: 'deficit-gdp-percent',
    name: 'Roční schodek (% HDP)',
    shortName: 'Schodek/HDP',
    unit: '% HDP',
    description: 'Roční přírůstek státního dluhu jako procento HDP',
  },
  {
    id: 'interest-absolute',
    name: 'Roční úroky (nominální)',
    shortName: 'Úroky',
    unit: 'miliard Kč',
    description: 'Roční náklady na dluhovou službu (úrokové náklady)',
  },
  {
    id: 'interest-cumulative',
    name: 'Kumulativní úroky (reálný)',
    shortName: 'Σ Úroky',
    unit: 'miliard Kč (v cenách 2025)',
    description: 'Celkové úroky zaplacené od roku 1993, přepočtené na ceny roku 2025',
  },
];

export function getGraphVariantInfo(id: GraphVariant): GraphVariantInfo {
  return GRAPH_VARIANTS.find(v => v.id === id) || GRAPH_VARIANTS[0];
}

