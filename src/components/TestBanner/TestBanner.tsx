import styles from './TestBanner.module.css';

export function TestBanner() {
  return (
    <div className={styles.banner}>
      <span className={styles.label}>TESTOVACÍ PROVOZ.</span>{' '}
      Narazili jste na problém? Podělte se o něj s námi na facebookové stránce Projekt Sisyfos.
    </div>
  );
}

