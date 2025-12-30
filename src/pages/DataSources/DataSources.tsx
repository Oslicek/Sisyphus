import { Link } from 'react-router-dom';
import styles from './DataSources.module.css';

const DATA_SOURCES = [
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
    name: 'Cenová data (dálnice, nemocnice, školy, benzín)',
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

export function DataSources() {
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

        <ul className={styles.sourcesList}>
          {DATA_SOURCES.map((source, index) => (
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
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerLink}>Hlavní stránka</Link>
        <span className={styles.separator}>•</span>
        <Link to="/o-projektu" className={styles.footerLink}>O projektu</Link>
      </footer>
    </div>
  );
}

