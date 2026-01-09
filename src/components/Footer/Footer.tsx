import { Link, useLocation } from 'react-router-dom';
import { TestBanner } from '../TestBanner';
import styles from './Footer.module.css';

interface FooterLink {
  label: string;
  path: string;
}

const footerLinks: FooterLink[] = [
  { label: 'Dluh', path: '/' },
  { label: 'Rozpočet', path: '/rozpocet' },
  { label: 'Rozpočtovka', path: '/rozpoctovka' },
  { label: 'Penze', path: '/penze' },
  { label: 'Blog', path: '/blog' },
  { label: 'O projektu Sisyfos', path: '/o-projektu' },
];

export function Footer() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <footer className={styles.footer}>
      <nav className={styles.links}>
        {footerLinks.map((link, index) => (
          <span key={link.path}>
            {index > 0 && <span className={styles.separator}>|</span>}
            {isActive(link.path) ? (
              <span className={styles.activeLink}>{link.label}</span>
            ) : (
              <Link to={link.path} className={styles.link}>{link.label}</Link>
            )}
          </span>
        ))}
      </nav>
      <p className={styles.disclaimer}>
        V našich datech mohou být chyby. Pokud je chcete k něčemu použít, důrazně doporučujeme jejich ověření.
      </p>
      <TestBanner />
    </footer>
  );
}


