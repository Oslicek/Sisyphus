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

        <section className={styles.contactSection}>
          <h2 className={styles.contactTitle}>Kontakt</h2>
          <ul className={styles.contactList}>
            <li className={styles.contactItem}>
              <span className={styles.contactIcon}>✉</span>
              <a href="mailto:projektsisyfos@gmail.com" className={styles.contactLink}>
                projektsisyfos@gmail.com
              </a>
            </li>
            <li className={styles.contactItem}>
              <span className={styles.contactIcon}>𝕏</span>
              <a href="https://x.com/ProjektSisyfos" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                @ProjektSisyfos
              </a>
            </li>
            <li className={styles.contactItem}>
              <span className={styles.contactIcon}>f</span>
              <a href="https://www.facebook.com/profile.php?id=61585770336155" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                Projekt Sisyfos
              </a>
            </li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerLink}>Hlavní stránka</Link>
        <span className={styles.separator}>•</span>
        <Link to="/blog" className={styles.footerLink}>Blog</Link>
        <span className={styles.separator}>•</span>
        <Link to="/zdroje-dat" className={styles.footerLink}>Datové řady</Link>
      </footer>
    </div>
  );
}

