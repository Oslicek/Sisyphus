import { Link } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import styles from './Penze.module.css';

export function Penze() {
  useDocumentMeta({
    title: 'Penze – Důchodový systém ČR',
    description: 'Přehled důchodového systému České republiky. Analýza příjmů a výdajů penzijního systému.',
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Zpět na hlavní stránku</Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Penze</h1>
        <p className={styles.subtitle}>
          Důchodový systém České republiky
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Připravujeme</h2>
          <p className={styles.text}>
            Tato sekce je v přípravě. Brzy zde najdete analýzu důchodového systému ČR.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
