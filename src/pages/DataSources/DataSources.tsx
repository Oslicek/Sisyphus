import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './DataSources.module.css';

const DATA_SOURCES_INFO = [
  {
    name: 'Státní dluh ČR',
    source: 'Ministerstvo financí ČR',
    url: 'https://www.mfcr.cz/cs/rozpoctova-politika/rizeni-statniho-dluhu/statistiky/struktura-a-vyvoj-statniho-dluhu',
  },
  {
    name: 'Seznam vlád Česka',
    source: 'Wikipedia',
    url: 'https://cs.wikipedia.org/wiki/Seznam_vlád_Česka',
  },
  {
    name: 'Rozpočtové plány',
    source: 'Ministerstvo financí ČR',
    url: 'https://www.mfcr.cz/',
  },
  {
    name: 'Inflace a HDP',
    source: 'Český statistický úřad (ČSÚ)',
    url: 'https://www.czso.cz/',
  },
  {
    name: 'Demografická data',
    source: 'Český statistický úřad (ČSÚ)',
    url: 'https://csu.gov.cz/produkty/obyvatelstvo_hu',
  },
  {
    name: 'Mzdová data',
    source: 'ČSÚ, MPSV',
    url: 'https://www.czso.cz/csu/czso/prace_a_mzdy_prace',
  },
  {
    name: 'Cenová data',
    source: 'ČSÚ, ŘSD, MZ ČR, MŠMT',
    url: 'https://www.czso.cz/',
  },
  {
    name: 'Ceny potravin',
    source: 'Český statistický úřad (ČSÚ)',
    url: 'https://csu.gov.cz/vyvoj-prumernych-cen-vybranych-potravin-2024',
  },
  {
    name: 'Náklady dluhové služby',
    source: 'Ministerstvo financí ČR',
    url: 'https://www.mfcr.cz/cs/rozpoctova-politika/rizeni-statniho-dluhu',
  },
];

interface DataPoint {
  year: number;
  [key: string]: number | string | undefined;
}

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface DataSource {
  name: string;
  url: string;
}

interface DataSet {
  title: string;
  description: string;
  unit: string;
  data: DataPoint[];
  columns: { key: string; label: string }[];
  chartType: 'bar' | 'line';
  chartSeries: ChartSeries[];
  yAxisMin?: number;
  sources: DataSource[];
  note?: string;
  noteSource?: DataSource;
}

// Helper function to determine which years to show as labels
// Logic: show first year, 1995 (if in range), then every 5 years divisible by 5
function getYearLabels(data: DataPoint[]): number[] {
  if (data.length === 0) return [];
  
  const years = data.map(d => d.year);
  const firstYear = years[0];
  const lastYear = years[years.length - 1];
  const labelYears: number[] = [];
  
  // Always include first year
  labelYears.push(firstYear);
  
  // If data starts at 1993, include 1995
  if (firstYear === 1993 && years.includes(1995)) {
    labelYears.push(1995);
  }
  
  // Add years divisible by 5
  for (let year = Math.ceil(firstYear / 5) * 5; year <= lastYear; year += 5) {
    if (years.includes(year) && !labelYears.includes(year)) {
      labelYears.push(year);
    }
  }
  
  // Always include last year if not already included
  if (!labelYears.includes(lastYear)) {
    labelYears.push(lastYear);
  }
  
  return labelYears.sort((a, b) => a - b);
}

// Format large numbers for axis labels
function formatAxisValue(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace('.0', '') + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1).replace('.0', '') + 'k';
  }
  return value.toFixed(0);
}

function SimpleBarChart({ data, series, unit, yAxisMin = 0 }: { 
  data: DataPoint[]; 
  series: ChartSeries[];
  unit: string;
  yAxisMin?: number;
}) {
  const numSeries = series.length;
  
  // Find max value across all series
  let maxValue = 0;
  series.forEach(s => {
    data.forEach(d => {
      const val = d[s.key];
      if (typeof val === 'number' && val > maxValue) {
        maxValue = val;
      }
    });
  });
  
  const minValue = yAxisMin;
  const valueRange = maxValue - minValue;
  const chartHeight = 120;
  const topPadding = 8;
  const leftPadding = 45;
  const groupWidth = Math.max(8, Math.min(20, (600 - leftPadding) / data.length - 2));
  const barWidth = groupWidth / numSeries;
  const chartWidth = leftPadding + data.length * (groupWidth + 2);
  
  // Grid line values (min to max in 5 steps)
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map(pct => minValue + valueRange * pct);

  return (
    <div className={styles.chartContainer}>
      <svg 
        viewBox={`0 0 ${chartWidth} ${chartHeight + topPadding + 20}`} 
        className={styles.chart}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines with value labels */}
        {gridValues.map((val, i) => {
          const y = topPadding + chartHeight - ((val - minValue) / valueRange) * chartHeight;
          return (
            <g key={`grid-${i}`}>
              <line
                x1={leftPadding - 5}
                x2={chartWidth}
                y1={y}
                y2={y}
                stroke="#ced4da"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text
                x={leftPadding - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="7"
                fill="#6c757d"
              >
                {formatAxisValue(val)}
              </text>
            </g>
          );
        })}
        
        {/* X axis (solid) */}
        <line
          x1={leftPadding}
          x2={chartWidth}
          y1={topPadding + chartHeight}
          y2={topPadding + chartHeight}
          stroke="#495057"
          strokeWidth={1}
        />
        
        {/* Y axis (solid) */}
        <line
          x1={leftPadding}
          x2={leftPadding}
          y1={topPadding}
          y2={topPadding + chartHeight}
          stroke="#495057"
          strokeWidth={1}
        />
        
        {/* Bars - grouped by year */}
        {data.map((d, i) => (
          <g key={d.year}>
            {series.map((s, sIdx) => {
              const val = typeof d[s.key] === 'number' ? d[s.key] as number : 0;
              const height = valueRange > 0 ? ((val - minValue) / valueRange) * chartHeight : 0;
              return (
                <rect
                  key={s.key}
                  x={leftPadding + i * (groupWidth + 2) + sIdx * barWidth}
                  y={topPadding + chartHeight - height}
                  width={barWidth - 0.5}
                  height={height}
                  fill={s.color}
                  opacity={0.8}
                />
              );
            })}
          </g>
        ))}
        
        {/* Year labels */}
        {(() => {
          const labelYears = getYearLabels(data);
          return data.filter(d => labelYears.includes(d.year)).map((d) => {
            const originalIndex = data.findIndex(x => x.year === d.year);
            return (
              <text
                key={d.year}
                x={leftPadding + originalIndex * (groupWidth + 2) + groupWidth / 2}
                y={topPadding + chartHeight + 14}
                textAnchor="middle"
                fontSize="8"
                fill="#6c757d"
              >
                {d.year}
              </text>
            );
          });
        })()}
      </svg>
      
      {/* Legend for multi-series charts */}
      {numSeries > 1 && (
        <div className={styles.legend}>
          {series.map(s => (
            <div key={s.key} className={styles.legendItem}>
              <span className={styles.legendColor} style={{ backgroundColor: s.color }} />
              <span className={styles.legendLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <p className={styles.chartUnit}>{unit}</p>
    </div>
  );
}

function MultiLineChart({ data, series, unit }: { 
  data: DataPoint[]; 
  series: ChartSeries[];
  unit: string;
}) {
  const chartHeight = 145;
  const chartWidth = 600;
  const padding = { top: 15, right: 20, bottom: 30, left: 45 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Find max value across all series
  let maxValue = 0;
  series.forEach(s => {
    data.forEach(d => {
      const val = d[s.key];
      if (typeof val === 'number' && val > maxValue) {
        maxValue = val;
      }
    });
  });
  
  // Grid line values (0%, 25%, 50%, 75%, 100% of max)
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map(pct => maxValue * pct);

  // Generate points for each series
  const generatePath = (seriesKey: string) => {
    const points = data.map((d, i) => {
      const val = typeof d[seriesKey] === 'number' ? d[seriesKey] as number : 0;
      const x = padding.left + (i / (data.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - (maxValue > 0 ? (val / maxValue) * innerHeight : 0);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  return (
    <div className={styles.chartContainer}>
      <svg 
        viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
        className={styles.chart}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Horizontal grid lines with value labels */}
        {gridValues.map((val, i) => {
          const y = padding.top + innerHeight - (val / maxValue) * innerHeight;
          return (
            <g key={`h-${i}`}>
              <line
                x1={padding.left - 5}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                stroke="#ced4da"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="7"
                fill="#6c757d"
              >
                {formatAxisValue(val)}
              </text>
            </g>
          );
        })}
        
        {/* Vertical grid lines - every 5 years */}
        {data.filter(d => d.year % 5 === 0).map((d) => {
          const originalIndex = data.findIndex(x => x.year === d.year);
          const x = padding.left + (originalIndex / (data.length - 1)) * innerWidth;
          return (
            <line
              key={`v-${d.year}`}
              x1={x}
              x2={x}
              y1={padding.top}
              y2={padding.top + innerHeight}
              stroke="#ced4da"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          );
        })}
        
        {/* X axis (solid) */}
        <line
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={padding.top + innerHeight}
          y2={padding.top + innerHeight}
          stroke="#495057"
          strokeWidth={1}
        />
        
        {/* Y axis (solid) */}
        <line
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={padding.top + innerHeight}
          stroke="#495057"
          strokeWidth={1}
        />
        
        {/* Lines */}
        {series.map(s => (
          <path
            key={s.key}
            d={generatePath(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        
        {/* Year labels */}
        {(() => {
          const labelYears = getYearLabels(data);
          return data.filter(d => labelYears.includes(d.year)).map((d) => {
            const originalIndex = data.findIndex(x => x.year === d.year);
            const x = padding.left + (originalIndex / (data.length - 1)) * innerWidth;
            return (
              <text
                key={d.year}
                x={x}
                y={chartHeight - 5}
                textAnchor="middle"
                fontSize="8"
                fill="#6c757d"
              >
                {d.year}
              </text>
            );
          });
        })()}
      </svg>
      
      {/* Legend */}
      <div className={styles.legend}>
        {series.map(s => (
          <div key={s.key} className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: s.color }} />
            <span className={styles.legendLabel}>{s.label}</span>
          </div>
        ))}
      </div>
      <p className={styles.chartUnit}>{unit}</p>
    </div>
  );
}

function DataTable({ data, columns }: { data: DataPoint[]; columns: { key: string; label: string }[] }) {
  const formatValue = (val: unknown): string => {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'number') {
      return val.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });
    }
    return String(val);
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.year}>
              {columns.map(col => (
                <td key={col.key}>{formatValue(row[col.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataSources() {
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [debtRes, debtMonthlyRes, economicRes, interestRes, demographicRes, priceRes, foodRes, wageRes] = await Promise.all([
          fetch('/data/debt-historical.json'),
          fetch('/data/debt-monthly.json'),
          fetch('/data/economic-data.json'),
          fetch('/data/debt-interest.json'),
          fetch('/data/demographic-data.json'),
          fetch('/data/price-data.json'),
          fetch('/data/food-prices.json'),
          fetch('/data/wage-data.json'),
        ]);

        const [debtData, debtMonthlyData, economicData, interestData, demographicData, priceData, foodData, wageData] = await Promise.all([
          debtRes.json(),
          debtMonthlyRes.json(),
          economicRes.json(),
          interestRes.json(),
          demographicRes.json(),
          priceRes.json(),
          foodRes.json(),
          wageRes.json(),
        ]);

        const sets: DataSet[] = [
          {
            title: 'Státní dluh ČR',
            description: debtData.description,
            unit: 'mld Kč',
            data: debtData.data.map((d: { year: number; amount: number }) => ({
              year: d.year,
              value: d.amount,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'value', label: 'Dluh (mld Kč)' },
            ],
            chartType: 'bar',
            chartSeries: [{ key: 'value', label: 'Státní dluh', color: '#c41e3a' }],
            sources: [
              { name: 'Ministerstvo financí ČR', url: 'https://www.mfcr.cz/cs/rozpoctova-politika/rizeni-statniho-dluhu/statistiky/struktura-a-vyvoj-statniho-dluhu' },
            ],
          },
          {
            title: 'Státní dluh ČR – měsíční vývoj 2025',
            description: debtMonthlyData.description,
            unit: 'mld Kč',
            data: debtMonthlyData.data.map((d: { year: number; month: number; amount: number }) => ({
              year: d.month,
              value: d.amount,
            })),
            columns: [
              { key: 'year', label: 'Měsíc' },
              { key: 'value', label: 'Dluh (mld Kč)' },
            ],
            chartType: 'bar',
            chartSeries: [{ key: 'value', label: 'Státní dluh', color: '#c41e3a' }],
            yAxisMin: 3300,
            sources: [
              { name: 'Ministerstvo financí ČR', url: 'https://www.mfcr.cz/cs/rozpoctova-politika/makroekonomika/statistika-vladniho-sektoru/2025/ctvrtletni-prehledy-o-stavu-a-vyvoji-statniho-dluh-61526' },
            ],
            note: 'Plánovaná výše státního dluhu na konci roku 2025: 3 613,6 mld. Kč (cca 42,9 % HDP)',
            noteSource: { name: 'Státní rozpočet 2025 v kostce (PDF)', url: 'https://www.mfcr.cz/assets/attachments/2025-03-27_Statni-rozpocet-2025-v-kostce.pdf' },
          },
          {
            title: 'HDP České republiky',
            description: 'Hrubý domácí produkt v běžných cenách',
            unit: 'mld Kč',
            data: economicData.data.map((d: { year: number; gdp: number }) => ({
              year: d.year,
              value: d.gdp,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'value', label: 'HDP (mld Kč)' },
            ],
            chartType: 'bar',
            chartSeries: [{ key: 'value', label: 'HDP', color: '#2c7a7b' }],
            sources: [
              { name: 'Český statistický úřad', url: 'https://www.czso.cz/' },
            ],
          },
          {
            title: 'Míra inflace',
            description: 'Meziroční změna indexu spotřebitelských cen',
            unit: '%',
            data: economicData.data.map((d: { year: number; inflationRate: number }) => ({
              year: d.year,
              value: d.inflationRate,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'value', label: 'Inflace (%)' },
            ],
            chartType: 'bar',
            chartSeries: [{ key: 'value', label: 'Inflace', color: '#e67e22' }],
            sources: [
              { name: 'Český statistický úřad', url: 'https://www.czso.cz/' },
            ],
          },
          {
            title: 'Úrokové náklady státního dluhu',
            description: interestData.description,
            unit: 'mld Kč',
            data: interestData.data.map((d: { year: number; interest: number }) => ({
              year: d.year,
              value: d.interest,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'value', label: 'Úroky (mld Kč)' },
            ],
            chartType: 'bar',
            chartSeries: [{ key: 'value', label: 'Úroky', color: '#9d4edd' }],
            sources: [
              { name: 'Ministerstvo financí ČR', url: 'https://www.mfcr.cz/cs/rozpoctova-politika/rizeni-statniho-dluhu' },
            ],
          },
          {
            title: 'Počet obyvatel ČR',
            description: 'Celkový počet obyvatel a obyvatelé v produktivním věku (15-64 let)',
            unit: 'mil. obyvatel',
            data: demographicData.data.map((d: { year: number; population: number; workingAge: number }) => ({
              year: d.year,
              population: d.population / 1000000,
              workingAge: d.workingAge / 1000000,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'population', label: 'Celkem (mil.)' },
              { key: 'workingAge', label: 'Produkt. věk (mil.)' },
            ],
            chartType: 'bar',
            chartSeries: [
              { key: 'population', label: 'Celkem', color: '#3498db' },
              { key: 'workingAge', label: 'Produktivní věk (15-64)', color: '#e74c3c' },
            ],
            yAxisMin: 6,
            sources: [
              { name: 'Český statistický úřad', url: 'https://csu.gov.cz/produkty/obyvatelstvo_hu' },
            ],
          },
          {
            title: 'Průměrná a minimální mzda',
            description: 'Průměrná a minimální měsíční mzda (hrubá a čistá)',
            unit: 'Kč/měsíc',
            data: wageData.data.map((d: { year: number; averageGross: number; averageNet: number; minimumGross: number; minimumNet: number }) => ({
              year: d.year,
              averageGross: d.averageGross,
              averageNet: d.averageNet,
              minimumGross: d.minimumGross,
              minimumNet: d.minimumNet,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'averageGross', label: 'Prům. hrubá' },
              { key: 'averageNet', label: 'Prům. čistá' },
              { key: 'minimumGross', label: 'Min. hrubá' },
              { key: 'minimumNet', label: 'Min. čistá' },
            ],
            chartType: 'line',
            chartSeries: [
              { key: 'averageGross', label: 'Průměrná hrubá', color: '#27ae60' },
              { key: 'averageNet', label: 'Průměrná čistá', color: '#2ecc71' },
              { key: 'minimumGross', label: 'Minimální hrubá', color: '#e74c3c' },
              { key: 'minimumNet', label: 'Minimální čistá', color: '#f39c12' },
            ],
            sources: [
              { name: 'Český statistický úřad', url: 'https://www.czso.cz/csu/czso/prace_a_mzdy_prace' },
              { name: 'Ministerstvo práce a sociálních věcí', url: 'https://www.mpsv.cz/' },
            ],
          },
          {
            title: 'Cena benzínu Natural 95',
            description: 'Průměrná roční cena benzínu Natural 95',
            unit: 'Kč/litr',
            data: priceData.data.map((d: { year: number; petrol95: number }) => ({
              year: d.year,
              value: d.petrol95,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'value', label: 'Cena (Kč/l)' },
            ],
            chartType: 'line',
            chartSeries: [{ key: 'value', label: 'Benzín', color: '#f39c12' }],
            sources: [
              { name: 'Český statistický úřad', url: 'https://www.czso.cz/' },
            ],
          },
          {
            title: 'Náklady na výstavbu infrastruktury',
            description: 'Průměrné náklady na výstavbu 1 km dálnice, regionální nemocnice a základní školy',
            unit: 'mil. Kč',
            data: priceData.data.map((d: { year: number; highwayKm: number; hospital: number; school: number }) => ({
              year: d.year,
              highwayKm: d.highwayKm,
              hospital: d.hospital,
              school: d.school,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'highwayKm', label: 'Dálnice (mil./km)' },
              { key: 'hospital', label: 'Nemocnice (mil.)' },
              { key: 'school', label: 'Škola (mil.)' },
            ],
            chartType: 'line',
            chartSeries: [
              { key: 'hospital', label: 'Nemocnice', color: '#9b59b6' },
              { key: 'highwayKm', label: 'Dálnice (km)', color: '#3498db' },
              { key: 'school', label: 'Škola', color: '#1abc9c' },
            ],
            sources: [
              { name: 'Ředitelství silnic a dálnic', url: 'https://www.rsd.cz/' },
              { name: 'Ministerstvo zdravotnictví ČR', url: 'https://www.mzcr.cz/' },
              { name: 'Ministerstvo školství, mládeže a tělovýchovy', url: 'https://www.msmt.cz/' },
            ],
          },
          {
            title: 'Ceny potravin',
            description: 'Průměrné ceny vybraných potravin (data od roku 2006)',
            unit: 'Kč',
            data: foodData.data.map((d: { year: number; bread: number; eggs: number; butter: number; potatoes: number; beer: number }) => ({
              year: d.year,
              bread: d.bread,
              eggs: d.eggs,
              butter: d.butter,
              potatoes: d.potatoes,
              beer: d.beer,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'bread', label: 'Chléb (Kč/kg)' },
              { key: 'eggs', label: 'Vejce (Kč/10ks)' },
              { key: 'butter', label: 'Máslo (Kč/kg)' },
              { key: 'potatoes', label: 'Brambory (Kč/kg)' },
              { key: 'beer', label: 'Pivo (Kč/0.5l)' },
            ],
            chartType: 'line',
            chartSeries: [
              { key: 'butter', label: 'Máslo (kg)', color: '#f1c40f' },
              { key: 'bread', label: 'Chléb (kg)', color: '#d35400' },
              { key: 'eggs', label: 'Vejce (10ks)', color: '#e74c3c' },
              { key: 'potatoes', label: 'Brambory (kg)', color: '#27ae60' },
              { key: 'beer', label: 'Pivo (0.5l)', color: '#3498db' },
            ],
            sources: [
              { name: 'Český statistický úřad', url: 'https://csu.gov.cz/vyvoj-prumernych-cen-vybranych-potravin-2024' },
            ],
          },
        ];

        setDataSets(sets);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Zpět na hlavní stránku</Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Datové řady a zdroje dat</h1>
        
        <p className={styles.intro}>
          Všechna data použitá v projektu Sisyfos pochází z veřejně dostupných 
          zdrojů státních institucí a statistických úřadů.
        </p>

        <section className={styles.dataSection}>
          <h2 className={styles.sectionTitle}>Datové řady</h2>
          
          {loading ? (
            <p className={styles.loading}>Načítání dat...</p>
          ) : (
            dataSets.map((dataSet, index) => (
              <div key={index} className={styles.dataSetCard}>
                <h3 className={styles.dataSetTitle}>{dataSet.title}</h3>
                <p className={styles.dataSetDescription}>{dataSet.description}</p>
                
                {dataSet.chartType === 'line' ? (
                  <MultiLineChart 
                    data={dataSet.data} 
                    series={dataSet.chartSeries}
                    unit={dataSet.unit}
                  />
                ) : (
                  <SimpleBarChart 
                    data={dataSet.data} 
                    series={dataSet.chartSeries}
                    unit={dataSet.unit}
                    yAxisMin={dataSet.yAxisMin}
                  />
                )}
                
                <DataTable data={dataSet.data} columns={dataSet.columns} />
                
                {dataSet.note && (
                  <p className={styles.dataSetNote}>
                    {dataSet.note}
                    {dataSet.noteSource && (
                      <>
                        {' '}
                        <a 
                          href={dataSet.noteSource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.dataSetSourceLink}
                        >
                          ({dataSet.noteSource.name})
                        </a>
                      </>
                    )}
                  </p>
                )}
                
                <div className={styles.dataSetSources}>
                  <span className={styles.dataSetSourcesLabel}>Zdroj: </span>
                  {dataSet.sources.map((source, sIdx) => (
                    <span key={sIdx}>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.dataSetSourceLink}
                      >
                        {source.name}
                      </a>
                      {sIdx < dataSet.sources.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        <section className={styles.sourcesSection}>
          <h2 className={styles.sectionTitle}>Zdroje dat</h2>
          <ul className={styles.sourcesList}>
            {DATA_SOURCES_INFO.map((source, index) => (
              <li key={index} className={styles.sourceItem}>
                <span className={styles.sourceName}>{source.name}</span>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.sourceLink}
                >
                  {source.source} →
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerLink}>Hlavní stránka</Link>
        <span className={styles.separator}>•</span>
        <Link to="/o-projektu" className={styles.footerLink}>O projektu</Link>
      </footer>
    </div>
  );
}
