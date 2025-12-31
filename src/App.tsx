import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DebtCounter } from './components/DebtCounter';
import { DebtChart } from './components/DebtChart';
import { BuyCalculator } from './components/BuyCalculator';
import { ShareButtons } from './components/ShareButtons';
import { TestBanner } from './components/TestBanner';
import { About } from './pages/About';
import { DataSources } from './pages/DataSources';
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
          <Link to="/o-projektu" className={styles.footerLink}>
            O projektu Sisyfos
          </Link>
          <span className={styles.footerSeparator}>•</span>
          <Link to="/zdroje-dat" className={styles.footerLink}>
            Datové řady a zdroje dat
          </Link>
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
        <Route path="/o-projektu" element={<About />} />
        <Route path="/zdroje-dat" element={<DataSources />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
