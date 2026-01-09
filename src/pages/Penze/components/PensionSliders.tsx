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
  description: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'tfr',
    label: 'Plodnost (TFR)',
    unit: 'dětí/ženu',
    step: 0.05,
    format: (v) => v.toFixed(2),
    description: 'Průměrný počet dětí na jednu ženu. Hodnota 2,1 znamená zachování populace. Vyšší plodnost = více budoucích pracujících.',
  },
  {
    key: 'e0_M',
    label: 'Dožití muži',
    unit: 'let',
    step: 0.5,
    format: (v) => v.toFixed(1),
    description: 'Střední délka života mužů při narození. Delší život = více let v důchodu = vyšší náklady systému.',
  },
  {
    key: 'e0_F',
    label: 'Dožití ženy',
    unit: 'let',
    step: 0.5,
    format: (v) => v.toFixed(1),
    description: 'Střední délka života žen při narození. Ženy se dožívají déle, takže pobírají důchod déle.',
  },
  {
    key: 'netMigPer1000',
    label: 'Čistá migrace',
    unit: '‰',
    step: 0.5,
    format: (v) => v.toFixed(1),
    description: 'Roční čistá migrace v promile aktuální populace. Např. +10‰ při 10 mil. obyvatel = 100 000 migrantů ročně. Kladná = příliv, záporná = odliv.',
  },
  {
    key: 'wageGrowthReal',
    label: 'Růst mezd (reálný)',
    unit: '%',
    step: 0.001,
    format: (v) => (v * 100).toFixed(1),
    description: 'Roční růst mezd očištěný o inflaci. Vyšší mzdy = vyšší příspěvky, ale i vyšší budoucí důchody.',
  },
  {
    key: 'unemploymentRate',
    label: 'Nezaměstnanost',
    unit: '%',
    step: 0.005,
    format: (v) => (v * 100).toFixed(1),
    description: 'Celková míra nezaměstnanosti. Vyšší nezaměstnanost = méně pracujících = méně příspěvků do penzijního systému.',
  },
  {
    key: 'retAge',
    label: 'Věk odchodu do důchodu',
    unit: 'let',
    step: 1,
    format: (v) => v.toFixed(0),
    description: 'Věk, od kterého lidé pobírají důchod. Vyšší věk = méně důchodců a více pracujících.',
  },
  {
    key: 'indexWageWeight',
    label: 'Valorizace důchodů',
    unit: '',
    step: 0.05,
    format: (v) => `${(v * 100).toFixed(0)}% mzdy, ${((1 - v) * 100).toFixed(0)}% CPI`,
    description: 'Jak se zvyšují důchody: podle růstu mezd nebo podle inflace (CPI = index spotřebitelských cen). Mzdová valorizace udržuje životní úroveň důchodců vůči pracujícím, ale je dražší.',
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
