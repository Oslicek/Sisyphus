import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './DataSources.module.css';

const DATA_SOURCES_INFO = [
  {
    name: 'Státní dluh ČR',
    source: 'Ministerstvo financí ČR',
    url: 'https://www.mfcr.cz/cs/rozpoctova-politika/makroekonomika/statistika-vladniho-sektoru/2025/ctvrtletni-prehledy-o-stavu-a-vyvoji-statniho-dluh-61526',
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

interface DataSet {
  title: string;
  description: string;
  unit: string;
  data: DataPoint[];
  columns: { key: string; label: string }[];
  chartType: 'bar' | 'line';
  chartSeries: ChartSeries[];
}

function SimpleBarChart({ data, series, unit }: { 
  data: DataPoint[]; 
  series: ChartSeries[];
  unit: string;
}) {
  const valueKey = series[0].key;
  const color = series[0].color;
  const values = data.map(d => {
    const val = d[valueKey];
    return typeof val === 'number' ? val : 0;
  });
  const maxValue = Math.max(...values);
  const chartHeight = 120;
  const barWidth = Math.max(4, Math.min(12, 600 / data.length - 1));
  const chartWidth = data.length * (barWidth + 1);

  return (
    <div className={styles.chartContainer}>
      <svg 
        viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} 
        className={styles.chart}
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((d, i) => {
          const val = typeof d[valueKey] === 'number' ? d[valueKey] as number : 0;
          const height = maxValue > 0 ? (val / maxValue) * chartHeight : 0;
          return (
            <rect
              key={d.year}
              x={i * (barWidth + 1)}
              y={chartHeight - height}
              width={barWidth}
              height={height}
              fill={color}
              opacity={0.8}
            />
          );
        })}
        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d) => {
          const originalIndex = data.findIndex(x => x.year === d.year);
          return (
            <text
              key={d.year}
              x={originalIndex * (barWidth + 1) + barWidth / 2}
              y={chartHeight + 14}
              textAnchor="middle"
              fontSize="8"
              fill="#6c757d"
            >
              {d.year}
            </text>
          );
        })}
      </svg>
      <p className={styles.chartUnit}>{unit}</p>
    </div>
  );
}

function MultiLineChart({ data, series, unit }: { 
  data: DataPoint[]; 
  series: ChartSeries[];
  unit: string;
}) {
  const chartHeight = 140;
  const chartWidth = 600;
  const padding = { top: 10, right: 20, bottom: 30, left: 10 };
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
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line
            key={i}
            x1={padding.left}
            x2={chartWidth - padding.right}
            y1={padding.top + innerHeight * (1 - pct)}
            y2={padding.top + innerHeight * (1 - pct)}
            stroke="#e9ecef"
            strokeWidth={1}
          />
        ))}
        
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
        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d, idx) => {
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
        })}
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
        const [debtRes, economicRes, interestRes, demographicRes, priceRes, foodRes, wageRes] = await Promise.all([
          fetch('/data/debt-historical.json'),
          fetch('/data/economic-data.json'),
          fetch('/data/debt-interest.json'),
          fetch('/data/demographic-data.json'),
          fetch('/data/price-data.json'),
          fetch('/data/food-prices.json'),
          fetch('/data/wage-data.json'),
        ]);

        const [debtData, economicData, interestData, demographicData, priceData, foodData, wageData] = await Promise.all([
          debtRes.json(),
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
            data: debtData.data.map((d: { year: number; q4?: number; q3?: number; q2?: number; q1?: number }) => ({
              year: d.year,
              value: d.q4 ?? d.q3 ?? d.q2 ?? d.q1,
            })),
            columns: [
              { key: 'year', label: 'Rok' },
              { key: 'value', label: 'Dluh (mld Kč)' },
            ],
            chartType: 'bar',
            chartSeries: [{ key: 'value', label: 'Státní dluh', color: '#c41e3a' }],
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
            chartSeries: [{ key: 'population', label: 'Obyvatelstvo', color: '#3498db' }],
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
            chartType: 'bar',
            chartSeries: [{ key: 'value', label: 'Benzín', color: '#f39c12' }],
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
                  />
                )}
                
                <DataTable data={dataSet.data} columns={dataSet.columns} />
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
