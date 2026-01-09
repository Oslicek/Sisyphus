/**
 * Penze Page
 * 
 * Interactive PAYG pension system simulation using cohort-component
 * demographic model. Users can adjust parameters via sliders and
 * immediately see the impact on pension system balance.
 */

import { Link } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { usePensionSimulation } from '../../hooks/usePensionSimulation';
import { PensionSliders, PensionCharts } from './components';
import styles from './Penze.module.css';

// Dataset path for test data
const DATASET_PATH = 'pension/test-cz-2024';

export function Penze() {
  useDocumentMeta({
    title: 'Penze – Simulace důchodového systému',
    description: 'Interaktivní simulace průběžného důchodového systému. Zjistěte, jak demografické změny ovlivní penzijní bilanci.',
  });

  const {
    isLoading,
    isRunning,
    error,
    result,
    datasetId,
    sliderRanges,
    sliders,
    setSliders,
    dataset,
  } = usePensionSimulation({
    datasetPath: DATASET_PATH,
    debounceMs: 100,
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Zpět na hlavní stránku</Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Simulace penzijního systému</h1>
        <p className={styles.subtitle}>
          Interaktivní model průběžného důchodového systému (PAYG).
          Upravte parametry a sledujte dopad na bilanci systému.
        </p>

        {/* Error state */}
        {error && (
          <div className={styles.section}>
            <div className={styles.loading} style={{ color: '#dc3545' }}>
              Chyba: {error}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !error && (
          <div className={styles.section}>
            <div className={styles.loading}>
              Načítání dat...
            </div>
          </div>
        )}

        {/* Main content */}
        {!isLoading && !error && sliders && sliderRanges && (
          <>
            {/* Sliders */}
            <section className={styles.sectionCompact}>
              <PensionSliders
                values={sliders}
                ranges={sliderRanges}
                onChange={setSliders}
                disabled={isRunning}
                dataset={dataset ?? undefined}
              />
            </section>

            {/* Charts */}
            {result && (
              <section className={styles.sectionCompact}>
                <h2 className={styles.sectionTitle}>Výsledky projekce</h2>
                <PensionCharts result={result} />
              </section>
            )}

            {/* Status indicator - moved below charts */}
            <div className={styles.summaryBox}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Dataset</span>
                <span className={styles.summaryValue}>{datasetId}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Status</span>
                <span className={styles.summaryValue}>
                  {isRunning ? '⏳ Počítám...' : '✓ Připraveno'}
                </span>
              </div>
              {result && (
                <>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Horizont</span>
                    <span className={styles.summaryValue}>{result.horizonYears} let</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Počáteční rok</span>
                    <span className={styles.summaryValue}>{result.baseYear}</span>
                  </div>
                </>
              )}
            </div>

            {/* Model description */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>O modelu</h2>
              <p className={styles.text}>
                Tento simulátor využívá <strong>kohortně-komponentní model</strong> pro 
                demografickou projekci populace. Model sleduje věkové kohorty podle pohlaví 
                a každoročně aplikuje:
              </p>
              <ul className={styles.text} style={{ marginLeft: '1.5rem' }}>
                <li><strong>Úmrtnost</strong> – kalibrovaná na cílovou střední délku života</li>
                <li><strong>Plodnost</strong> – rozložená podle věku žen</li>
                <li><strong>Migraci</strong> – čistá migrace rozložená podle věku a pohlaví</li>
                <li><strong>Stárnutí</strong> – přesun kohort do vyššího věku</li>
              </ul>
              <p className={styles.text}>
                Pro výpočet bilance <strong>průběžného penzijního systému (PAYG)</strong> model 
                kalkuluje:
              </p>
              <ul className={styles.text} style={{ marginLeft: '1.5rem' }}>
                <li><strong>Příspěvky</strong> = mzdový fond × sazba pojistného</li>
                <li><strong>Dávky</strong> = počet důchodců × průměrný důchod</li>
                <li><strong>Bilance</strong> = příspěvky − dávky</li>
              </ul>
              <p className={styles.text} style={{ color: '#6c757d', fontStyle: 'italic' }}>
                ⚠️ Upozornění: Toto je zjednodušený demonstrační model s testovacími daty. 
                Nepoužívejte pro reálné rozhodování bez konzultace s odborníky.
              </p>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
