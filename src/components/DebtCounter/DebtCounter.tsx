import { useDebtCounter } from '../../hooks/useDebtCounter';
import { formatCzechCurrency } from '../../utils/formatters';
import styles from './DebtCounter.module.css';

export function DebtCounter() {
  const { currentDebt, deficitPerSecond, isLoading, error } = useDebtCounter();

  if (isLoading) {
    return (
      <main className={styles.container}>
        <p className={styles.loading}>Načítání...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.container}>
        <p className={styles.error}>{error}</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header>
        <h1 className={styles.title}>Státní dluh České republiky</h1>
        <p className={styles.subtitle}>Počítadlo státního dluhu v reálném čase</p>
      </header>

      <div className={styles.debtDisplay}>
        <p className={styles.amount}>{formatCzechCurrency(currentDebt)}</p>
        <p className={styles.currency}>CZK</p>
      </div>

      <p className={styles.perSecond}>
        Přírůstek: <span className={styles.perSecondValue}>
          +{formatCzechCurrency(deficitPerSecond)}
        </span> Kč/s
      </p>
    </main>
  );
}

