import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import { parseCSV, formatCurrency } from '../../utils/budgetData';
import type { BudgetRow } from '../../utils/budgetData';
import styles from './BudgetTreemap.module.css';

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  value?: number;
}

type ViewType = 'revenues' | 'exp_druhove' | 'exp_odvetvove';

const VIEW_CONFIG: Record<ViewType, { 
  label: string; 
  treeFile: string; 
  dataFile: string;
  system: string; 
  color: string 
}> = {
  revenues: { 
    label: 'Příjmy', 
    treeFile: 'tree_rev_druhove.json',
    dataFile: 'fact_revenues_by_chapter.csv',
    system: 'rev_druhove', 
    color: '#2E7D32' 
  },
  exp_druhove: { 
    label: 'Výdaje (druhové)', 
    treeFile: 'tree_exp_druhove.json',
    dataFile: 'fact_expenditures_by_chapter.csv',
    system: 'exp_druhove', 
    color: '#C62828' 
  },
  exp_odvetvove: { 
    label: 'Výdaje (odvětvové)', 
    treeFile: 'tree_exp_odvetvove.json',
    dataFile: 'fact_expenditures_by_chapter.csv',
    system: 'exp_odvetvove', 
    color: '#1565C0' 
  }
};

export function BudgetTreemap() {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('exp_odvetvove');
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const config = VIEW_CONFIG[activeView];
        const [treeRes, dataRes] = await Promise.all([
          fetch(`/data/budget/${config.treeFile}`),
          fetch(`/data/budget/${config.dataFile}`)
        ]);

        const tree = await treeRes.json();
        const dataText = await dataRes.text();
        
        setTreeData(tree);
        setBudgetRows(parseCSV(dataText));
        setLoading(false);
      } catch (error) {
        console.error('Failed to load tree data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, [activeView]);

  // Enrich tree with values
  const enrichTreeWithValues = useCallback((node: TreeNode, system: string): TreeNode => {
    const relevantRows = budgetRows.filter(
      row => row.year === 2026 && row.system === system && row.class_code === node.id
    );
    
    const directValue = relevantRows.reduce((sum, row) => sum + Math.abs(row.amount_czk), 0);

    if (!node.children || node.children.length === 0) {
      return {
        ...node,
        value: directValue > 0 ? directValue : undefined
      };
    }

    const enrichedChildren = node.children
      .map(child => enrichTreeWithValues(child, system))
      .filter(child => child.value !== undefined && child.value > 0);

    const childrenValue = enrichedChildren.reduce((sum, child) => sum + (child.value || 0), 0);
    
    return {
      ...node,
      children: enrichedChildren.length > 0 ? enrichedChildren : undefined,
      value: directValue > 0 ? directValue : (childrenValue > 0 ? childrenValue : undefined)
    };
  }, [budgetRows]);

  // Render collapsible tree
  useEffect(() => {
    if (!treeData || !svgRef.current || !containerRef.current || budgetRows.length === 0) return;

    const config = VIEW_CONFIG[activeView];
    
    // Tree data is now a single root object with children
    const enrichedRoot = enrichTreeWithValues(treeData, config.system);
    
    if (!enrichedRoot.children || enrichedRoot.children.length === 0) return;

    const rootData: TreeNode = {
      id: 'root',
      name: config.label,
      children: enrichedRoot.children
    };

    const container = containerRef.current;
    const width = container.clientWidth;
    const marginTop = 20;
    const marginRight = 200;
    const marginBottom = 20;
    const marginLeft = 100;

    const root = d3.hierarchy(rootData);
    const dx = 32;
    const dy = (width - marginLeft - marginRight) / (root.height + 1);

    const treeLayout = d3.tree<TreeNode>().nodeSize([dx, dy]);
    // Create a diagonal path generator
    const diagonal = (source: { x: number; y: number }, target: { x: number; y: number }) => {
      return `M${source.y},${source.x}C${(source.y + target.y) / 2},${source.x} ${(source.y + target.y) / 2},${target.x} ${target.y},${target.x}`;
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Store collapsed children
    const collapsedMap = new Map<string, d3.HierarchyNode<TreeNode>[]>();

    // Collapse all nodes initially except root
    root.descendants().forEach((d, i) => {
      if (i !== 0 && d.children) {
        collapsedMap.set(d.data.id, d.children);
        d.children = undefined;
      }
    });

    const gLink = svg.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5);

    const gNode = svg.append('g')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all');

    function update(source: d3.HierarchyNode<TreeNode>) {
      const nodes = root.descendants();
      const links = root.links();

      treeLayout(root);

      let left = root;
      let right = root;
      root.eachBefore((node) => {
        if ((node.x ?? 0) < (left.x ?? 0)) left = node;
        if ((node.x ?? 0) > (right.x ?? 0)) right = node;
      });

      const height = (right.x ?? 0) - (left.x ?? 0) + marginTop + marginBottom;

      svg
        .attr('height', height)
        .attr('viewBox', `${-marginLeft} ${(left.x ?? 0) - marginTop} ${width} ${height}`);

      // Update nodes
      const node = gNode.selectAll<SVGGElement, d3.HierarchyNode<TreeNode>>('g')
        .data(nodes, d => d.data.id);

      const nodeEnter = node.enter().append('g')
        .attr('transform', `translate(${source.y ?? 0},${source.x ?? 0})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
        .on('click', (_event, d) => {
          const collapsed = collapsedMap.get(d.data.id);
          if (d.children) {
            collapsedMap.set(d.data.id, d.children);
            d.children = undefined;
          } else if (collapsed) {
            d.children = collapsed;
            collapsedMap.delete(d.data.id);
          }
          update(d);
        });

      nodeEnter.append('circle')
        .attr('r', 6)
        .attr('fill', d => {
          const hasCollapsed = collapsedMap.has(d.data.id);
          return hasCollapsed ? config.color : (d.children ? config.color : '#999');
        })
        .attr('stroke', d => {
          const hasCollapsed = collapsedMap.has(d.data.id);
          return hasCollapsed || d.children ? config.color : '#999';
        })
        .attr('stroke-width', 2);

      nodeEnter.append('text')
        .attr('dy', '0.31em')
        .attr('x', d => {
          const hasCollapsed = collapsedMap.has(d.data.id);
          return (d.children || hasCollapsed) ? -10 : 10;
        })
        .attr('text-anchor', d => {
          const hasCollapsed = collapsedMap.has(d.data.id);
          return (d.children || hasCollapsed) ? 'end' : 'start';
        })
        .attr('font-family', 'Source Sans 3, system-ui, sans-serif')
        .attr('font-size', '12px')
        .attr('fill', '#1a1a2e')
        .text(d => {
          // Use code as fallback if name is null/empty
          const name = d.data.name || `[${d.data.id}]`;
          const maxLen = 40;
          return name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
        })
        .clone(true).lower()
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 3)
        .attr('stroke', 'white');

      nodeEnter.append('text')
        .attr('dy', '1.5em')
        .attr('x', d => {
          const hasCollapsed = collapsedMap.has(d.data.id);
          return (d.children || hasCollapsed) ? -10 : 10;
        })
        .attr('text-anchor', d => {
          const hasCollapsed = collapsedMap.has(d.data.id);
          return (d.children || hasCollapsed) ? 'end' : 'start';
        })
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '10px')
        .attr('fill', '#6c757d')
        .text(d => d.data.value ? formatCurrency(d.data.value) : '');

      // Merge enter and update
      const nodeUpdate = nodeEnter.merge(node);
      
      nodeUpdate
        .transition()
        .duration(300)
        .attr('transform', d => `translate(${d.y ?? 0},${d.x ?? 0})`)
        .attr('fill-opacity', 1)
        .attr('stroke-opacity', 1);

      nodeUpdate.select('circle')
        .attr('fill', d => {
          const hasCollapsed = collapsedMap.has(d.data.id);
          return hasCollapsed ? config.color : (d.children ? config.color : '#999');
        });

      // Exit nodes
      node.exit()
        .transition()
        .duration(300)
        .attr('transform', `translate(${source.y ?? 0},${source.x ?? 0})`)
        .attr('fill-opacity', 0)
        .attr('stroke-opacity', 0)
        .remove();

      // Update links
      const link = gLink.selectAll<SVGPathElement, d3.HierarchyLink<TreeNode>>('path')
        .data(links, d => d.target.data.id);

      const linkEnter = link.enter().append('path')
        .attr('d', () => {
          const o = { x: source.x ?? 0, y: source.y ?? 0 };
          return diagonal(o, o);
        });

      linkEnter.merge(link)
        .transition()
        .duration(300)
        .attr('d', d => diagonal(
          { x: d.source.x ?? 0, y: d.source.y ?? 0 }, 
          { x: d.target.x ?? 0, y: d.target.y ?? 0 } 
        ));

      link.exit()
        .transition()
        .duration(300)
        .attr('d', () => {
          const o = { x: source.x ?? 0, y: source.y ?? 0 };
          return diagonal(o, o);
        })
        .remove();
    }

    update(root);

  }, [treeData, budgetRows, activeView, enrichTreeWithValues]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Načítám data rozpočtu...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Zpět na hlavní stránku</Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Vizualizace státního rozpočtu 2026</h1>
        <p className={styles.subtitle}>
          Interaktivní hierarchická vizualizace příjmů a výdajů. Kliknutím na uzel rozbalíte/sbalíte podkategorie.
        </p>

        <div className={styles.navLinks}>
          <Link to="/rozpocet" className={styles.navLink}>
            📋 Tabulková data
          </Link>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs}>
            {(Object.entries(VIEW_CONFIG) as [ViewType, typeof VIEW_CONFIG[ViewType]][]).map(([key, config]) => (
              <button
                key={key}
                className={`${styles.tab} ${activeView === key ? styles.tabActive : ''}`}
                onClick={() => setActiveView(key)}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>

        <p className={styles.instructions}>
          Klikněte na barevný uzel pro rozbalení/sbalení podkategorií.
        </p>

        <div className={styles.treemapContainer} ref={containerRef}>
          <svg ref={svgRef} className={styles.treemapSvg} style={{ overflow: 'visible' }} />
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: VIEW_CONFIG[activeView].color, borderRadius: '50%' }} />
            <span>Lze rozbalit</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#999', borderRadius: '50%' }} />
            <span>Koncový uzel</span>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerLink}>Hlavní stránka</Link>
        <span className={styles.separator}>•</span>
        <Link to="/rozpocet" className={styles.footerLink}>Tabulky rozpočtu</Link>
        <span className={styles.separator}>•</span>
        <Link to="/zdroje-dat" className={styles.footerLink}>Datové řady</Link>
        <span className={styles.separator}>•</span>
        <Link to="/o-projektu" className={styles.footerLink}>O projektu</Link>
      </footer>
    </div>
  );
}
