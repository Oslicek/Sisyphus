/**
 * PensionSliders Component
 * 
 * Interactive sliders for adjusting pension simulation parameters.
 * All sliders update immediately with debounced projection runs.
 */

import { useRef, useCallback } from 'react';
import type { SliderValues, SliderRanges, PensionDataset } from '../../../types/pension';
import { SliderDistributionChart, type DistributionType } from './SliderDistributionChart';
import styles from './PensionSliders.module.css';

interface SliderConfig {
  key: keyof Omit<SliderValues, 'horizonYears'>;
  label: string;
  unit: string;
  step: number;
  format: (value: number) => string;
  description: string;
  /** If defined, shows a distribution chart below the slider */
  distributionType?: DistributionType;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'tfr',
    label: 'Plodnost (TFR)',
    unit: 'dětí/ženu',
    step: 0.05,
    format: (v) => v.toFixed(2),
    description: 'Průměrný počet dětí na jednu ženu. Hodnota 2,1 znamená zachování populace. Vyšší plodnost = více budoucích pracujících.',
    distributionType: 'fertility',
  },
  {
    key: 'e0_M',
    label: 'Dožití muži',
    unit: 'let',
    step: 0.5,
    format: (v) => v.toFixed(1),
    description: 'Střední délka života mužů při narození. Delší život = více let v důchodu = vyšší náklady systému.',
    distributionType: 'mortality_M',
  },
  {
    key: 'e0_F',
    label: 'Dožití ženy',
    unit: 'let',
    step: 0.5,
    format: (v) => v.toFixed(1),
    description: 'Střední délka života žen při narození. Ženy se dožívají déle, takže pobírají důchod déle.',
    distributionType: 'mortality_F',
  },
  {
    key: 'netMigPer1000',
    label: 'Čistá migrace',
    unit: '‰',
    step: 0.5,
    format: (v) => v.toFixed(1),
    description: 'Roční čistá migrace v promile aktuální populace. Např. +10‰ při 10 mil. obyvatel = 100 000 migrantů ročně. Kladná = příliv, záporná = odliv.',
    distributionType: 'migration',
  },
  {
    key: 'wageGrowthReal',
    label: 'Růst mezd (reálný)',
    unit: '%',
    step: 0.001,
    format: (v) => (v * 100).toFixed(1),
    description: 'Roční růst mezd očištěný o inflaci. Vyšší mzdy = vyšší příspěvky, ale ovlivňuje i valorizaci důchodů.',
  },
  {
    key: 'unemploymentRate',
    label: 'Nezaměstnanost',
    unit: '%',
    step: 0.01,
    format: (v) => (v * 100).toFixed(0),
    description: 'Celková míra nezaměstnanosti. Vyšší nezaměstnanost = méně pracujících = méně příspěvků do penzijního systému.',
    distributionType: 'employment',
  },
  {
    key: 'contribRate',
    label: 'Sazba pojistného',
    unit: '%',
    step: 0.01,
    format: (v) => (v * 100).toFixed(0),
    description: 'Procento mzdy odváděné na důchodové pojištění. V ČR je aktuálně 28% (zaměstnanec + zaměstnavatel).',
  },
  {
    key: 'retAge',
    label: 'Věk odchodu do důchodu',
    unit: 'let',
    step: 1,
    format: (v) => v.toFixed(0),
    description: 'Věk, od kterého lidé pobírají důchod. Vyšší věk = méně důchodců a více pracujících.',
  },
  // Czech pension system parameters
  {
    key: 'basicAmountRatio',
    label: 'Základní výměra',
    unit: '% mzdy',
    step: 0.01,
    format: (v) => (v * 100).toFixed(0),
    description: 'Základní výměra důchodu (stejná pro všechny) jako % průměrné mzdy. V ČR nyní 10%. Solidární složka důchodu.',
  },
  {
    key: 'percentageAmountRatio',
    label: 'Procentní výměra',
    unit: '% mzdy',
    step: 0.01,
    format: (v) => (v * 100).toFixed(0),
    description: 'Počáteční procentní výměra (zásluhová složka) jako % průměrné mzdy. Závisí na odpracovaných letech a výdělcích.',
  },
  {
    key: 'realWageIndexShare',
    label: 'Podíl mezd ve valorizaci',
    unit: '',
    step: 0.01,
    format: (v) => v === 0.333 ? '1/3' : v === 0.5 ? '1/2' : (v * 100).toFixed(0) + '%',
    description: 'Jaká část růstu reálných mezd se promítne do valorizace procentní výměry. Dříve 1/2, od 2024 jen 1/3.',
  },
  {
    key: 'minPensionRatio',
    label: 'Minimální důchod',
    unit: '% mzdy',
    step: 0.01,
    format: (v) => (v * 100).toFixed(0),
    description: 'Minimální důchod jako % průměrné mzdy. Od 2026 platí 20% pro starobní a invalidní III. stupně.',
  },
];

interface PensionSlidersProps {
  values: SliderValues;
  ranges: SliderRanges;
  onChange: (values: SliderValues) => void;
  disabled?: boolean;
  dataset?: PensionDataset;
}

export function PensionSliders({
  values,
  ranges,
  onChange,
  disabled = false,
  dataset,
}: PensionSlidersProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const handleSliderChange = (key: keyof SliderValues, newValue: number) => {
    onChange({
      ...values,
      [key]: newValue,
    });
  };

  const handleHorizonChange = (newHorizon: number) => {
    onChange({
      ...values,
      horizonYears: newHorizon,
    });
  };

  const getScrollAmount = useCallback(() => {
    if (!gridRef.current) return 300;
    
    const container = gridRef.current;
    const firstChild = container.firstElementChild as HTMLElement | null;
    if (!firstChild) return 300;
    
    const boxWidth = firstChild.offsetWidth;
    const gap = 16; // 1rem gap
    const containerWidth = container.clientWidth;
    
    // Calculate visible boxes and scroll by (visible - 1) boxes
    const visibleBoxes = Math.floor(containerWidth / (boxWidth + gap));
    const scrollBoxes = Math.max(1, visibleBoxes - 1);
    
    return scrollBoxes * (boxWidth + gap);
  }, []);

  const scrollLeft = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    }
  }, [getScrollAmount]);

  const scrollRight = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    }
  }, [getScrollAmount]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Parametry projekce</h3>
        <div className={styles.horizonSelector}>
          <label htmlFor="horizon">Horizont:</label>
          <select
            id="horizon"
            value={values.horizonYears}
            onChange={(e) => handleHorizonChange(Number(e.target.value))}
            disabled={disabled}
            className={styles.horizonSelect}
          >
            <option value={10}>10 let</option>
            <option value={20}>20 let</option>
            <option value={30}>30 let</option>
            <option value={50}>50 let</option>
          </select>
        </div>
      </div>

      <div className={styles.carouselWrapper}>
        <div className={styles.slidersGrid} ref={gridRef}>
        {SLIDER_CONFIGS.map((config) => {
          const [min, max] = ranges[config.key];
          const value = values[config.key];

          return (
            <div key={config.key} className={styles.sliderGroup}>
              <div className={styles.sliderHeader}>
                <label className={styles.sliderLabel}>{config.label}</label>
                <span className={styles.sliderValue}>
                  {config.format(value)} {config.unit}
                </span>
              </div>
              <p className={styles.sliderDescription}>{config.description}</p>
              <input
                type="range"
                min={min}
                max={max}
                step={config.step}
                value={value}
                onChange={(e) =>
                  handleSliderChange(config.key, Number(e.target.value))
                }
                disabled={disabled}
                className={styles.slider}
              />
              <div className={styles.sliderRange}>
                <span>{config.format(min)}</span>
                <span>{config.format(max)}</span>
              </div>
              {config.distributionType && dataset && (
                <SliderDistributionChart
                  type={config.distributionType}
                  value={value}
                  dataset={dataset}
                  baselineUnemploymentRate={dataset.pensionParams.baselineUnemploymentRate}
                />
              )}
            </div>
          );
        })}
        </div>

        {/* Navigation buttons */}
        <div className={styles.navButtons}>
          <button 
            className={styles.navButton} 
            onClick={scrollLeft}
            aria-label="Předchozí parametr"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className={styles.navLabel}>Další parametry</span>
          <button 
            className={styles.navButton} 
            onClick={scrollRight}
            aria-label="Další parametr"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
