import { DebtCounter } from './components/DebtCounter';
import { DebtChart } from './components/DebtChart';
import styles from './App.module.css';

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
];

function App() {
  return (
    <div className={styles.app}>
      <p className={styles.motto}>
        „Ať ho tlačíš, nebo ženeš, Sisyfe — balvan se vždy vrací."
        <span className={styles.mottoAuthor}>(Ovidius)</span>
      </p>
      
      <main className={styles.main}>
        <DebtCounter />
        <DebtChart />
      </main>

      <footer className={styles.footer}>
        <h3 className={styles.footerTitle}>Zdroje dat</h3>
        <ul className={styles.sourcesList}>
          {DATA_SOURCES.map((source, index) => (
            <li key={index} className={styles.sourceItem}>
              <span className={styles.sourceName}>{source.name}:</span>{' '}
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.sourceLink}
              >
                {source.source}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}

export default App;
