import { DebtCounter } from './components/DebtCounter';
import { DebtChart } from './components/DebtChart';
import styles from './App.module.css';

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
    </div>
  );
}

export default App;
