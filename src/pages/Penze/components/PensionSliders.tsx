/**
 * PensionSliders Component
 * 
 * Interactive sliders for adjusting pension simulation parameters.
 * All sliders update immediately with debounced projection runs.
 */

import type { SliderValues, SliderRanges } from '../../../types/pension';
import styles from './PensionSliders.module.css';

interface SliderConfig {
  key: keyof Omit<SliderValues, 'horizonYears'>;
  label: string;
  unit: string;
  step: number;
  format: (value: number) => string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'tfr',
    label: 'Plodnost (TFR)',
    unit: 'dětí/ženu',
    step: 0.05,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'e0_M',
    label: 'Doživotí muži',
    unit: 'let',
    step: 0.5,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'e0_F',
    label: 'Doživotí ženy',
    unit: 'let',
    step: 0.5,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'netMigPer1000',
    label: 'Čistá migrace',
    unit: '‰',
    step: 0.5,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'wageGrowthReal',
    label: 'Růst mezd (reálný)',
    unit: '%',
    step: 0.001,
    format: (v) => (v * 100).toFixed(1),
  },
  {
    key: 'empMultiplier',
    label: 'Zaměstnanost',
    unit: '×',
    step: 0.01,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'retAge',
    label: 'Věk odchodu do důchodu',
    unit: 'let',
    step: 1,
    format: (v) => v.toFixed(0),
  },
  {
    key: 'indexWageWeight',
    label: 'Valorizace (váha mezd)',
    unit: '',
    step: 0.05,
    format: (v) => `${(v * 100).toFixed(0)}% mzdy, ${((1 - v) * 100).toFixed(0)}% CPI`,
  },
];

interface PensionSlidersProps {
  values: SliderValues;
  ranges: SliderRanges;
  onChange: (values: SliderValues) => void;
  disabled?: boolean;
}

export function PensionSliders({
  values,
  ranges,
  onChange,
  disabled = false,
}: PensionSlidersProps) {
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

      <div className={styles.slidersGrid}>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
