import { Link } from 'react-router-dom';
import sisyfosLogo from '../../assets/sisyfos-logo-400x400.png';
import styles from './About.module.css';

export function About() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Zpět na hlavní stránku</Link>
      </header>

      <div className={styles.logoSection}>
        <img src={sisyfosLogo} alt="Projekt Sisyfos" className={styles.logo} />
        <p className={styles.tagline}>Státní dluh – náš společný balvan</p>
      </div>

      <main className={styles.main}>
        <h1 className={styles.title}>O projektu Sisyfos</h1>
        
        <p className={styles.text}>
          Naším cílem je zpřístupnit objektivní data o státním dluhu v atraktivní 
          a přístupné formě a podpořit tak otevřenou a věcnou debatu o této naší společné výzvě.
        </p>

        <blockquote className={styles.quote}>
          „Ať ho tlačíš, nebo ženeš, Sisyfe — balvan se vždy vrací."
          <cite className={styles.quoteAuthor}>— Ovidius</cite>
        </blockquote>
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerLink}>Hlavní stránka</Link>
        <span className={styles.separator}>•</span>
        <Link to="/zdroje-dat" className={styles.footerLink}>Datové řady</Link>
      </footer>
    </div>
  );
}

