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
    name: 'Náklady dluhové služby',
    source: 'Ministerstvo financí ČR',
    url: 'https://www.mfcr.cz/cs/rozpoctova-politika/rizeni-statniho-dluhu',
  },
];

interface DataPoint {
  year: number;
  [key: string]: number | string | undefined;
}

interface DataSet {
  title: string;
  description: string;
  unit: string;
  data: DataPoint[];
  columns: { key: string; label: string }[];
  chartKey: string;
  color: string;
}

function SimpleBarChart({ data, valueKey, color, unit }: { 
  data: DataPoint[]; 
  valueKey: string; 
  color: string;
  unit: string;
}) {
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
        {/* Year labels - show every 5 years */}
        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d, idx, arr) => {
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
        const [debtRes, economicRes, interestRes, demographicRes] = await Promise.all([
          fetch('/data/debt-historical.json'),
          fetch('/data/economic-data.json'),
          fetch('/data/debt-interest.json'),
          fetch('/data/demographic-data.json'),
        ]);

        const [debtData, economicData, interestData, demographicData] = await Promise.all([
          debtRes.json(),
          economicRes.json(),
          interestRes.json(),
          demographicRes.json(),
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
            chartKey: 'value',
            color: '#c41e3a',
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
            chartKey: 'value',
            color: '#2c7a7b',
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
            chartKey: 'value',
            color: '#e67e22',
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
            chartKey: 'value',
            color: '#9d4edd',
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
            chartKey: 'population',
            color: '#3498db',
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
        <h1 className={styles.title}>Zdroje dat a datové řady</h1>
        
        <p className={styles.intro}>
          Všechna data použitá v projektu Sisyfos pochází z veřejně dostupných 
          zdrojů státních institucí a statistických úřadů.
        </p>

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

        <section className={styles.dataSection}>
          <h2 className={styles.sectionTitle}>Datové řady</h2>
          
          {loading ? (
            <p className={styles.loading}>Načítání dat...</p>
          ) : (
            dataSets.map((dataSet, index) => (
              <div key={index} className={styles.dataSetCard}>
                <h3 className={styles.dataSetTitle}>{dataSet.title}</h3>
                <p className={styles.dataSetDescription}>{dataSet.description}</p>
                
                <SimpleBarChart 
                  data={dataSet.data} 
                  valueKey={dataSet.chartKey} 
                  color={dataSet.color}
                  unit={dataSet.unit}
                />
                
                <DataTable data={dataSet.data} columns={dataSet.columns} />
              </div>
            ))
          )}
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
