import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navigation.module.css';

interface NavItem {
  label: string;
  path?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Státní dluh',
    path: '/',
    children: [
      { label: 'Datové řady a zdroje dat', path: '/zdroje-dat' }
    ]
  },
  {
    label: 'Státní rozpočet',
    path: '/rozpocet',
    children: [
      { label: 'Vizualizace', path: '/rozpocet-vizualizace' }
    ]
  },
  { label: 'Hra Rozpočtovka', path: '/zrusim-schodek' },
  { label: 'Blog', path: '/blog' },
  { label: 'O Projektu Sisyfos', path: '/o-projektu' }
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const location = useLocation();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);

    return (
      <li key={item.label} className={styles.navItem}>
        <div className={styles.navItemRow}>
          {item.path ? (
            <Link 
              to={item.path} 
              className={`${styles.navLink} ${isActive(item.path) ? styles.navLinkActive : ''}`}
              style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
            >
              {item.label}
            </Link>
          ) : (
            <span 
              className={styles.navLabel}
              style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
            >
              {item.label}
            </span>
          )}
          {hasChildren && (
            <button 
              className={`${styles.expandButton} ${isExpanded ? styles.expandButtonOpen : ''}`}
              onClick={() => toggleExpanded(item.label)}
              aria-label={isExpanded ? 'Sbalit' : 'Rozbalit'}
            >
              ▼
            </button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <ul className={styles.subNav}>
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Hamburger Button */}
      <button 
        className={`${styles.hamburger} ${isOpen ? styles.hamburgerOpen : ''}`}
        onClick={toggleMenu}
        aria-label={isOpen ? 'Zavřít menu' : 'Otevřít menu'}
        aria-expanded={isOpen}
      >
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={toggleMenu} />
      )}

      {/* Slide-out Menu */}
      <nav className={`${styles.menu} ${isOpen ? styles.menuOpen : ''}`}>
        <div className={styles.menuHeader}>
          <span className={styles.menuTitle}>Menu</span>
          <button 
            className={styles.closeButton}
            onClick={toggleMenu}
            aria-label="Zavřít menu"
          >
            ×
          </button>
        </div>
        <ul className={styles.navList}>
          {navItems.map(item => renderNavItem(item))}
        </ul>
      </nav>
    </>
  );
}

