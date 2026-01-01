import styles from './TestBanner.module.css';

const EMAIL = 'projektsisyfos@gmail.com';

export function TestBanner() {
  return (
    <div className={styles.banner}>
      <span className={styles.label}>TESTOVACÍ PROVOZ.</span>{' '}
      Narazili jste na problém? Napište nám na{' '}
      <a href={`mailto:${EMAIL}`} className={styles.link}>
        {EMAIL}
      </a>.
    </div>
  );
}

