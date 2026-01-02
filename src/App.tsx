import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DebtCounter } from './components/DebtCounter';
import { DebtChart } from './components/DebtChart';
import { BuyCalculator } from './components/BuyCalculator';
import { ShareButtons } from './components/ShareButtons';
import { TestBanner } from './components/TestBanner';
import { About } from './pages/About';
import { Blog } from './pages/Blog';
import { DataSources } from './pages/DataSources';
import { BudgetTables } from './pages/BudgetTables';
import { BudgetTreemap } from './pages/BudgetTreemap';
import sisyfosLogo from './assets/sisyfos-logo-200x200.png';
import styles from './App.module.css';

function Home() {
  return (
    <div className={styles.app}>
      <div className={styles.logoContainer}>
        <Link to="/o-projektu" className={styles.logo}>
          <img src={sisyfosLogo} alt="Sisyfos" className={styles.logoImage} />
        </Link>
        <p className={styles.logoTagline}>Státní dluh – náš společný balvan</p>
      </div>

      <p className={styles.motto}>
        „Ať ho tlačíš, nebo ženeš, Sisyfe — balvan se vždy vrací."
        <span className={styles.mottoAuthor}>(Ovidius)</span>
      </p>

      <main className={styles.main}>
        <DebtCounter />
        <DebtChart />
      </main>

      <BuyCalculator />

      <ShareButtons />

      <footer className={styles.footer}>
        <nav className={styles.footerNav}>
          <Link to="/rozpocet-vizualizace" className={styles.footerLink}>
            Rozpočet 2026
          </Link>
          <span className={styles.footerSeparator}>•</span>
          <Link to="/blog" className={styles.footerLink}>
            Blog
          </Link>
          <span className={styles.footerSeparator}>•</span>
          <Link to="/zdroje-dat" className={styles.footerLink}>
            Datové řady a zdroje dat
          </Link>
          <span className={styles.footerSeparator}>•</span>
          <Link to="/o-projektu" className={styles.footerLink}>
            O projektu Sisyfos
          </Link>
          <span className={styles.footerSeparator}>•</span>
          <a 
            href="https://www.facebook.com/profile.php?id=61585770336155" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            Facebook
          </a>
        </nav>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TestBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/o-projektu" element={<About />} />
        <Route path="/zdroje-dat" element={<DataSources />} />
        <Route path="/rozpocet" element={<BudgetTables />} />
        <Route path="/rozpocet-vizualizace" element={<BudgetTreemap />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
