import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { DebtCounter } from './components/DebtCounter';
import { DebtChart } from './components/DebtChart';
import { BuyCalculator } from './components/BuyCalculator';
import { ShareButtons } from './components/ShareButtons';
import { Footer } from './components/Footer';
import { Navigation } from './components/Navigation';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import { About } from './pages/About';
import { Blog } from './pages/Blog';
import { DataSources } from './pages/DataSources';
import { BudgetTables } from './pages/BudgetTables';
import { BudgetTreemap } from './pages/BudgetTreemap';
import { DeficitGame } from './pages/DeficitGame';
import { Penze } from './pages/Penze';
import sisyfosLogo from './assets/sisyfos-logo-200x200.png';
import styles from './App.module.css';

function Home() {
  useDocumentMeta({
    title: 'Státní dluh ČR v reálném čase – Projekt Sisyfos',
    description: 'Kolik dluží Česká republika? Sledujte počítadlo státního dluhu v reálném čase a historický vývoj zadlužení od roku 1993.',
  });

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

      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/o-projektu" element={<About />} />
        <Route path="/zdroje-dat" element={<DataSources />} />
        <Route path="/rozpocet" element={<BudgetTables />} />
        <Route path="/rozpocet-vizualizace" element={<BudgetTreemap />} />
        <Route path="/rozpoctovka" element={<DeficitGame />} />
        <Route path="/penze" element={<Penze />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
