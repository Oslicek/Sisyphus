import { Link } from 'react-router-dom';
import styles from './About.module.css';

export function About() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Zpět na hlavní stránku</Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>O projektu Sisyfos</h1>
        
        <p className={styles.text}>
          Cílem projektu Sisyfos je prezentovat objektivní data o státním dluhu 
          přístupnou a zábavnou formou a tak podpořit veřejnou debatu o tomto 
          našem společném balvanu.
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

