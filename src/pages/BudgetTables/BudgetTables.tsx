import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  parseCSV, 
  parseChaptersCSV,
  parseClassificationCSV,
  calculateTotalRevenues,
  calculateTotalExpenditures,
  getRevenuesByChapter,
  getExpendituresByChapter,
  formatCurrency
} from '../../utils/budgetData';
import type { BudgetRow, Chapter, Classification } from '../../utils/budgetData';
import styles from './BudgetTables.module.css';

type TabType = 'chapters' | 'revenues' | 'expenditures';

export function BudgetTables() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [revenueRows, setRevenueRows] = useState<BudgetRow[]>([]);
  const [expenditureRows, setExpenditureRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chapters');

  useEffect(() => {
    async function loadData() {
      try {
        const [chaptersRes, classRes, revenuesRes, expendituresRes] = await Promise.all([
          fetch('/data/budget/dim_chapter.csv'),
          fetch('/data/budget/dim_classification.csv'),
          fetch('/data/budget/fact_revenues_by_chapter.csv'),
          fetch('/data/budget/fact_expenditures_by_chapter.csv')
        ]);

        const [chaptersText, classText, revenuesText, expendituresText] = await Promise.all([
          chaptersRes.text(),
          classRes.text(),
          revenuesRes.text(),
          expendituresRes.text()
        ]);

        setChapters(parseChaptersCSV(chaptersText));
        setClassifications(parseClassificationCSV(classText));
        setRevenueRows(parseCSV(revenuesText));
        setExpenditureRows(parseCSV(expendituresText));
        setLoading(false);
      } catch (error) {
        console.error('Failed to load budget data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Calculate totals using correct method (class_code='0')
  const totalRevenues = calculateTotalRevenues(revenueRows);
  const totalExpenditures = calculateTotalExpenditures(expenditureRows);
  const deficit = totalExpenditures - totalRevenues;

  // Get per-chapter totals
  const revenuesByChapter = getRevenuesByChapter(revenueRows);
  const expendituresByChapter = getExpendituresByChapter(expenditureRows);

  // Get revenue breakdown by top-level classification
  const getRevenueBreakdown = () => {
    const topLevelCodes = classifications
      .filter(c => c.system === 'rev_druhove' && c.level === 1 && !c.is_total)
      .map(c => c.code);
    
    const breakdown: { code: string; name: string; amount: number }[] = [];
    
    topLevelCodes.forEach(code => {
      const classification = classifications.find(c => c.code === code && c.system === 'rev_druhove');
      if (!classification) return;
      
      const amount = revenueRows
        .filter(row => row.year === 2026 && row.class_code === code)
        .reduce((sum, row) => sum + row.amount_czk, 0);
      
      if (amount > 0) {
        breakdown.push({
          code,
          name: classification.name,
          amount
        });
      }
    });
    
    return breakdown.sort((a, b) => b.amount - a.amount);
  };

  // Get expenditure breakdown by top-level classification (odvětvové)
  const getExpenditureBreakdown = () => {
    const topLevelCodes = classifications
      .filter(c => c.system === 'exp_odvetvove' && c.level === 1 && !c.is_total)
      .map(c => c.code);
    
    const breakdown: { code: string; name: string; amount: number }[] = [];
    
    topLevelCodes.forEach(code => {
      const classification = classifications.find(c => c.code === code && c.system === 'exp_odvetvove');
      if (!classification) return;
      
      const amount = expenditureRows
        .filter(row => row.year === 2026 && row.system === 'exp_odvetvove' && row.class_code === code)
        .reduce((sum, row) => sum + row.amount_czk, 0);
      
      if (amount > 0) {
        breakdown.push({
          code,
          name: classification.name,
          amount
        });
      }
    });
    
    return breakdown.sort((a, b) => b.amount - a.amount);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Načítám data rozpočtu...</div>
      </div>
    );
  }

  const revenueBreakdown = getRevenueBreakdown();
  const expenditureBreakdown = getExpenditureBreakdown();
  const breakdownRevenueTotal = revenueBreakdown.reduce((sum, r) => sum + r.amount, 0);
  const breakdownExpenditureTotal = expenditureBreakdown.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Zpět na hlavní stránku</Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Návrh státního rozpočtu 2026</h1>
        <p className={styles.subtitle}>
          Data z{' '}
          <a 
            href="https://www.mfcr.cz/cs/ministerstvo/media/tiskove-zpravy/2025/vlada-schvalila-navrh-statniho-rozpoctu-na-rok-202-61433"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            návrhu zákona o státním rozpočtu ČR
          </a>
          {' '}(Ministerstvo financí)
        </p>

        {/* Summary box */}
        <div className={styles.summaryBox}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Příjmy celkem</span>
            <span className={`${styles.summaryValue} ${styles.positive}`}>{formatCurrency(totalRevenues)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Výdaje celkem</span>
            <span className={`${styles.summaryValue} ${styles.negative}`}>{formatCurrency(totalExpenditures)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Schodek</span>
            <span className={`${styles.summaryValue} ${styles.negative}`}>{formatCurrency(-deficit)}</span>
          </div>
        </div>

        <div className={styles.navLinks}>
          <Link to="/rozpocet-vizualizace" className={styles.navLink}>
            📊 Interaktivní vizualizace (Tree)
          </Link>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'chapters' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('chapters')}
          >
            Kapitoly
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'revenues' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('revenues')}
          >
            Příjmy
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'expenditures' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('expenditures')}
          >
            Výdaje
          </button>
        </div>

        {activeTab === 'chapters' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Rozpočtové kapitoly</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.codeCell}>Kód</th>
                    <th>Kapitola</th>
                    <th className={styles.numericCell}>Příjmy</th>
                    <th className={styles.numericCell}>Výdaje</th>
                    <th className={styles.numericCell}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map(chapter => {
                    const rev = revenuesByChapter.get(chapter.chapter_code) || 0;
                    const exp = expendituresByChapter.get(chapter.chapter_code) || 0;
                    // Show all chapters that have expenditures (all should have expenditures)
                    if (exp === 0 && rev === 0) return null;
                    const saldo = rev - exp;
                    return (
                      <tr key={chapter.chapter_code}>
                        <td className={styles.codeCell}>{chapter.chapter_code}</td>
                        <td>{chapter.chapter_name}</td>
                        <td className={styles.numericCell}>{formatCurrency(rev)}</td>
                        <td className={styles.numericCell}>{formatCurrency(exp)}</td>
                        <td className={`${styles.numericCell} ${saldo >= 0 ? styles.positive : styles.negative}`}>
                          {formatCurrency(saldo)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={styles.totalRow}>
                    <td className={styles.codeCell}></td>
                    <td>Celkem</td>
                    <td className={styles.numericCell}>{formatCurrency(totalRevenues)}</td>
                    <td className={styles.numericCell}>{formatCurrency(totalExpenditures)}</td>
                    <td className={`${styles.numericCell} ${-deficit >= 0 ? styles.positive : styles.negative}`}>
                      {formatCurrency(-deficit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'revenues' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Příjmy státního rozpočtu</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.codeCell}>Kód</th>
                    <th>Kategorie příjmů</th>
                    <th className={styles.numericCell}>Částka</th>
                    <th className={styles.numericCell}>Podíl</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueBreakdown.map(rev => (
                    <tr key={rev.code}>
                      <td className={styles.codeCell}>{rev.code}</td>
                      <td>{rev.name}</td>
                      <td className={styles.numericCell}>{formatCurrency(rev.amount)}</td>
                      <td className={styles.numericCell}>
                        {((rev.amount / breakdownRevenueTotal) * 100).toFixed(1)} %
                      </td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td className={styles.codeCell}></td>
                    <td>Celkem</td>
                    <td className={styles.numericCell}>{formatCurrency(breakdownRevenueTotal)}</td>
                    <td className={styles.numericCell}>100 %</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'expenditures' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Výdaje státního rozpočtu (odvětvové třídění)</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.codeCell}>Kód</th>
                    <th>Odvětví</th>
                    <th className={styles.numericCell}>Částka</th>
                    <th className={styles.numericCell}>Podíl</th>
                  </tr>
                </thead>
                <tbody>
                  {expenditureBreakdown.map(exp => (
                    <tr key={exp.code}>
                      <td className={styles.codeCell}>{exp.code}</td>
                      <td>{exp.name}</td>
                      <td className={styles.numericCell}>{formatCurrency(exp.amount)}</td>
                      <td className={styles.numericCell}>
                        {((exp.amount / breakdownExpenditureTotal) * 100).toFixed(1)} %
                      </td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td className={styles.codeCell}></td>
                    <td>Celkem</td>
                    <td className={styles.numericCell}>{formatCurrency(breakdownExpenditureTotal)}</td>
                    <td className={styles.numericCell}>100 %</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerLink}>Hlavní stránka</Link>
        <span className={styles.separator}>•</span>
        <Link to="/rozpocet-vizualizace" className={styles.footerLink}>Vizualizace rozpočtu</Link>
        <span className={styles.separator}>•</span>
        <Link to="/zdroje-dat" className={styles.footerLink}>Datové řady</Link>
        <span className={styles.separator}>•</span>
        <Link to="/o-projektu" className={styles.footerLink}>O projektu</Link>
      </footer>
    </div>
  );
}
