/**
 * SliderDistributionChart Component
 * 
 * Displays a small SVG chart showing distribution across age cohorts.
 * Each chart type only re-renders when its specific value changes.
 */

import { useMemo } from 'react';
import type { PensionDataset } from '../../../types/pension';
import { 
  calculateASFR, 
  createFullAgeArray,
  calibrateMortality,
  mxArrayToQx,
  scaleEmployment,
} from '../../../utils/pensionDemography';
import styles from './SliderDistributionChart.module.css';

export type DistributionType = 
  | 'fertility' 
  | 'mortality_M' 
  | 'mortality_F' 
  | 'migration' 
  | 'employment';

interface SliderDistributionChartProps {
  type: DistributionType;
  value: number;
  dataset: PensionDataset;
  baselineUnemploymentRate?: number;
}

/**
 * Calculate survival curve (lx) from mortality rates
 */
function calculateSurvivalCurve(qx: number[]): number[] {
  const lx: number[] = [1.0]; // Start with 100% survival at age 0
  for (let i = 0; i < qx.length - 1; i++) {
    lx.push(lx[i] * (1 - qx[i]));
  }
  return lx;
}

/**
 * Normalize array to 0-1 range for display
 */
function normalizeForDisplay(data: number[]): number[] {
  const max = Math.max(...data);
  if (max === 0) return data.map(() => 0);
  return data.map(v => v / max);
}

/**
 * Generate SVG path for area chart
 */
function generateAreaPath(
  data: number[], 
  width: number, 
  height: number,
  startAge: number = 0
): string {
  if (data.length === 0) return '';
  
  const normalized = normalizeForDisplay(data);
  const xStep = width / (data.length - 1 || 1);
  
  // Build path
  let path = `M 0 ${height}`; // Start at bottom-left
  
  normalized.forEach((value, i) => {
    const x = i * xStep;
    const y = height - (value * height * 0.9); // 90% height max
    path += ` L ${x} ${y}`;
  });
  
  // Close the path
  path += ` L ${width} ${height} Z`;
  
  return path;
}

/**
 * Generate SVG path for line chart
 */
function generateLinePath(
  data: number[], 
  width: number, 
  height: number
): string {
  if (data.length === 0) return '';
  
  const normalized = normalizeForDisplay(data);
  const xStep = width / (data.length - 1 || 1);
  
  let path = '';
  normalized.forEach((value, i) => {
    const x = i * xStep;
    const y = height - (value * height * 0.9);
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });
  
  return path;
}

export function SliderDistributionChart({
  type,
  value,
  dataset,
  baselineUnemploymentRate = 0.04,
}: SliderDistributionChartProps) {
  const { chartData, ageRange, label } = useMemo(() => {
    const maxAge = dataset.meta.maxAge;
    
    switch (type) {
      case 'fertility': {
        // Calculate ASFR from TFR
        const { ages, shape } = dataset.fertilityCurve;
        const fullShape = createFullAgeArray(ages, shape, maxAge);
        const asfr = calculateASFR(value, fullShape);
        // Only show fertile ages
        const fertileAsfr = asfr.slice(ages[0], ages[ages.length - 1] + 1);
        return {
          chartData: fertileAsfr,
          ageRange: `${ages[0]}–${ages[ages.length - 1]} let`,
          label: 'Plodnost podle věku',
        };
      }
      
      case 'mortality_M': {
        // Calculate survival curve for males
        const baseMx = dataset.mortalityCurves.mx?.M || [];
        const { scaledMx } = calibrateMortality(baseMx, value);
        const qx = mxArrayToQx(scaledMx);
        const survival = calculateSurvivalCurve(qx);
        return {
          chartData: survival,
          ageRange: `0–${maxAge} let`,
          label: 'Přežívání mužů',
        };
      }
      
      case 'mortality_F': {
        // Calculate survival curve for females
        const baseMx = dataset.mortalityCurves.mx?.F || [];
        const { scaledMx } = calibrateMortality(baseMx, value);
        const qx = mxArrayToQx(scaledMx);
        const survival = calculateSurvivalCurve(qx);
        return {
          chartData: survival,
          ageRange: `0–${maxAge} let`,
          label: 'Přežívání žen',
        };
      }
      
      case 'migration': {
        // Combined migration shape (M + F)
        const shapeM = dataset.migrationShape.shape.M;
        const shapeF = dataset.migrationShape.shape.F;
        const combined = shapeM.map((v, i) => v + (shapeF[i] || 0));
        return {
          chartData: combined,
          ageRange: `0–${maxAge} let`,
          label: 'Migrace podle věku',
        };
      }
      
      case 'employment': {
        // Scaled employment rates (average of M and F)
        const empM = dataset.laborParticipation.emp.M;
        const empF = dataset.laborParticipation.emp.F;
        const empMultiplier = (1 - value) / (1 - baselineUnemploymentRate);
        const scaledM = scaleEmployment(empM, empMultiplier);
        const scaledF = scaleEmployment(empF, empMultiplier);
        const averaged = scaledM.map((v, i) => (v + (scaledF[i] || 0)) / 2);
        return {
          chartData: averaged,
          ageRange: `0–${maxAge} let`,
          label: 'Zaměstnanost podle věku',
        };
      }
      
      default:
        return { chartData: [], ageRange: '', label: '' };
    }
  }, [type, value, dataset, baselineUnemploymentRate]);

  if (chartData.length === 0) return null;

  const width = 200;
  const height = 40;
  const areaPath = generateAreaPath(chartData, width, height);
  const linePath = generateLinePath(chartData, width, height);

  // Color based on type
  const colors: Record<DistributionType, { fill: string; stroke: string }> = {
    fertility: { fill: 'rgba(255, 99, 132, 0.3)', stroke: 'rgb(255, 99, 132)' },
    mortality_M: { fill: 'rgba(54, 162, 235, 0.3)', stroke: 'rgb(54, 162, 235)' },
    mortality_F: { fill: 'rgba(255, 159, 64, 0.3)', stroke: 'rgb(255, 159, 64)' },
    migration: { fill: 'rgba(75, 192, 192, 0.3)', stroke: 'rgb(75, 192, 192)' },
    employment: { fill: 'rgba(153, 102, 255, 0.3)', stroke: 'rgb(153, 102, 255)' },
  };

  const { fill, stroke } = colors[type];

  return (
    <div className={styles.container}>
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className={styles.chart}
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill={fill} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" />
      </svg>
      <div className={styles.legend}>
        <span className={styles.label}>{label}</span>
        <span className={styles.ageRange}>{ageRange}</span>
      </div>
    </div>
  );
}
