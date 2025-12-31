import styles from './TestBanner.module.css';

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61585770336155';

export function TestBanner() {
  return (
    <div className={styles.banner}>
      <span className={styles.label}>TESTOVACÍ PROVOZ.</span>{' '}
      Narazili jste na problém? Podělte se o něj s námi na{' '}
      <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
        facebookové stránce Projekt Sisyfos
      </a>.
    </div>
  );
}

