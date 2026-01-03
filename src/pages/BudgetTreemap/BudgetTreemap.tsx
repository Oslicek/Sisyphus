import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import { Footer } from '../../components/Footer';
import { 
  parseBudgetItemsCSV,
  buildTreeFromItems,
  formatCurrency,
  type BudgetItem,
  type TreeNode
} from '../../utils/budgetData';
import styles from './BudgetTreemap.module.css';

type ViewType = 'revenues' | 'exp_druhove' | 'exp_odvetvove';

// Order: Příjmy, Výdaje (odvětvové), Výdaje (druhové)
const VIEW_CONFIG: Record<ViewType, { 
  label: string; 
  dataFile: string;
  order: number;
}> = {
  revenues: { 
    label: 'Příjmy', 
    dataFile: 'prijmy_druhove_2026.csv',
    order: 1
  },
  exp_odvetvove: { 
    label: 'Výdaje (odvětvové)', 
    dataFile: 'vydaje_odvetvove_2026.csv',
    order: 2
  },
  exp_druhove: { 
    label: 'Výdaje (druhové)', 
    dataFile: 'vydaje_druhove_2026.csv',
    order: 3
  }
};

// Color palettes for top-level categories
const CATEGORY_COLORS: Record<string, string> = {
  // Revenues (příjmy) - by first digit
  '1': '#1B5E20', // Daňové příjmy - dark green
  '2': '#2E7D32', // Nedaňové příjmy - green
  '3': '#388E3C', // Kapitálové příjmy - medium green
  '4': '#43A047', // Přijaté transfery - light green
  
  // Expenditures druhové (výdaje) - by first digit
  '5': '#C62828', // Běžné výdaje - red
  '6': '#1565C0', // Kapitálové výdaje - blue
  
  // Expenditures odvětvové - by first digit
  'odv_1': '#33691E', // Zemědělství - olive
  'odv_2': '#F57F17', // Průmysl - amber
  'odv_3': '#1565C0', // Služby pro obyvatelstvo - blue
  'odv_4': '#6A1B9A', // Sociální věci - purple
  'odv_5': '#4E342E', // Bezpečnost - brown
  'odv_6': '#37474F', // Všeobecná veřejná správa - blue grey
};

interface RectNode extends d3.HierarchyRectangularNode<TreeNode> {
  target?: { x0: number; x1: number; y0: number; y1: number };
}

export function BudgetTreemap() {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('exp_odvetvove');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([]);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load budget data when view changes
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setBreadcrumbs([]);
      try {
        const config = VIEW_CONFIG[activeView];
        const dataRes = await fetch(`/data/budget/${config.dataFile}`);
        const text = await dataRes.text();
        const items = parseBudgetItemsCSV(text);
        setBudgetItems(items);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    }
    loadData();
  }, [activeView]);


  // Build tree from budget items
  const buildTree = useCallback((): TreeNode | null => {
    if (budgetItems.length === 0) return null;
    return buildTreeFromItems(budgetItems);
  }, [budgetItems]);


  // Get color for a node
  const getNodeColor = useCallback((d: RectNode): string => {
    const ancestors = d.ancestors().reverse();
    
    if (ancestors.length < 2) {
      return '#1565C0';
    }
    
    const topCategory = ancestors[1];
    const topCategoryId = topCategory.data.id;
    
    // Determine color key based on view type
    let colorKey: string;
    if (activeView === 'exp_odvetvove') {
      colorKey = `odv_${topCategoryId}`;
    } else {
      colorKey = topCategoryId.charAt(0);
    }
    
    const baseColor = CATEGORY_COLORS[colorKey] || CATEGORY_COLORS[topCategoryId] || '#1565C0';
    
    // Lighten based on depth
    const depth = d.depth;
    const lightenAmount = Math.min(depth * 0.08, 0.35);
    
    const color = d3.color(baseColor);
    if (color) {
      const hsl = d3.hsl(color);
      hsl.l = Math.min(hsl.l + lightenAmount, 0.85);
      return hsl.formatHex();
    }
    
    return baseColor;
  }, [activeView]);

  // Render zoomable icicle (Observable style - 3 columns)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || budgetItems.length === 0) return;

    const tree = buildTree();
    if (!tree || !tree.children || tree.children.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 600;

    // Create hierarchy and sort by value (descending)
    const root = d3.hierarchy(tree)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0)) as RectNode;

    // Calculate max depth for column sizing
    let maxDepth = 0;
    root.each(d => { if (d.depth > maxDepth) maxDepth = d.depth; });
    
    // Fixed number of visible columns (3) - column width stays constant
    const visibleColumns = 3;
    const columnWidth = width / visibleColumns;

    // Create partition layout with full depth
    // The partition uses the FULL width based on actual depth, not visible columns
    // This ensures column widths stay fixed when zooming
    const fullWidth = (maxDepth + 1) * columnWidth;
    
    d3.partition<TreeNode>()
      .size([height, fullWidth])
      .padding(0)(root);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height)
      .style('font', '12px Source Sans 3, system-ui, sans-serif')
      .style('overflow', 'hidden');

    // Add clipPath to hide content outside visible area
    const clipId = `clip-${activeView}`;
    svg.append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height);
    
    // Create main group with clipping
    const g = svg.append('g')
      .attr('clip-path', `url(#${clipId})`);

    // Current focus node
    let focus: RectNode = root;

    // Helper to get rectangle dimensions
    const rectWidth = (d: RectNode) => Math.max(0, d.y1 - d.y0);
    const rectHeight = (d: RectNode) => Math.max(0, d.x1 - d.x0);

    // Get text fill color based on background
    const getTextFill = (d: RectNode) => {
      const bgColor = d3.color(getNodeColor(d));
      if (bgColor) {
        const hsl = d3.hsl(bgColor);
        return hsl.l > 0.5 ? '#1a1a2e' : '#fff';
      }
      return '#1a1a2e';
    };

    // Format label text
    const labelText = (d: RectNode, w: number, h: number) => {
      if (w < 40 || h < 16) return '';
      const name = d.data.name || `[${d.data.id}]`;
      const maxChars = Math.floor((w - 8) / 6.5);
      return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    };

    // Format value text
    const valueText = (d: RectNode, w: number, h: number) => {
      if (w < 50 || h < 32) return '';
      return d.value ? formatCurrency(d.value) : '';
    };

    // Create cell groups inside clipped container
    const cell = g
      .selectAll<SVGGElement, RectNode>('g.cell')
      .data(root.descendants() as RectNode[])
      .join('g')
      .attr('class', 'cell')
      .attr('transform', d => `translate(${d.y0},${d.x0})`);

    // Add rectangles with tooltip
    const rect = cell.append('rect')
      .attr('width', d => rectWidth(d))
      .attr('height', d => rectHeight(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('click', clicked);
    
    // Add tooltip with full name and value
    rect.append('title')
      .text(d => `${d.data.name}\n${(d.value! / 1_000_000_000).toFixed(1)} mld. Kč`);

    // Add text elements
    const text = cell.append('text')
      .attr('pointer-events', 'none')
      .attr('x', 4)
      .attr('y', 16)
      .attr('fill', d => getTextFill(d))
      .style('font-weight', d => d.depth <= 2 ? '600' : '400');

    text.append('tspan')
      .attr('class', 'name-label')
      .text(d => labelText(d, rectWidth(d), rectHeight(d)));

    text.append('tspan')
      .attr('class', 'value-label')
      .attr('x', 4)
      .attr('y', 30)
      .style('font-family', 'JetBrains Mono, monospace')
      .style('font-size', '10px')
      .style('opacity', 0.9)
      .text(d => valueText(d, rectWidth(d), rectHeight(d)));

    // Add tooltip
    cell.append('title')
      .text(d => `${d.data.name || d.data.id}\n${formatCurrency(d.value || 0)}`);

    // Click handler - Observable style zoom
    function clicked(_event: MouseEvent, p: RectNode) {
      // If clicking current focus, go to parent (or stay if at root)
      const newFocus = focus === p ? ((p.parent as RectNode) || root) : p;
      focus = newFocus;

      // Update breadcrumbs
      if (focus === root) {
        setBreadcrumbs([]);
      } else {
        const ancestors = focus.ancestors().reverse().slice(1) as RectNode[];
        setBreadcrumbs(ancestors.map(a => ({ id: a.data.id, name: a.data.name || a.data.id })));
      }

      // Calculate the new positions - Observable style
      // The focus node should fill the entire height (x0=0, x1=height)
      // and be positioned at the left edge (y0=0)
      const x0 = focus.x0;
      const x1 = focus.x1;
      const y0 = focus.y0;

      (root.descendants() as RectNode[]).forEach(d => {
        d.target = {
          // Vertical: scale so focus fills entire height
          x0: ((d.x0 - x0) / (x1 - x0)) * height,
          x1: ((d.x1 - x0) / (x1 - x0)) * height,
          // Horizontal: shift so focus is at left edge, keep column widths
          y0: d.y0 - y0,
          y1: d.y1 - y0
        };
      });

      // Animate cells
      cell.transition()
        .duration(750)
        .attr('transform', d => {
          const t = d.target!;
          return `translate(${t.y0},${t.x0})`;
        });

      // Animate rectangles
      rect.transition()
        .duration(750)
        .attr('width', d => {
          const t = d.target!;
          return Math.max(0, t.y1 - t.y0);
        })
        .attr('height', d => {
          const t = d.target!;
          return Math.max(0, t.x1 - t.x0);
        });

      // Update text visibility
      text.transition()
        .duration(750)
        .attr('fill-opacity', d => {
          const t = d.target!;
          const w = t.y1 - t.y0;
          const h = t.x1 - t.x0;
          // Hide if outside visible area or too small
          if (t.y0 < -10 || t.y0 >= width) return 0;
          if (t.x0 >= height || t.x1 <= 0) return 0;
          return (w > 40 && h > 16) ? 1 : 0;
        });

      // Update text labels after transition
      setTimeout(() => {
        text.select('.name-label')
          .text(d => {
            const node = d as RectNode;
            const t = node.target!;
            return labelText(node, t.y1 - t.y0, t.x1 - t.x0);
          });

        text.select('.value-label')
          .text(d => {
            const node = d as RectNode;
            const t = node.target!;
            return valueText(node, t.y1 - t.y0, t.x1 - t.x0);
          });
      }, 750);
    }

  }, [budgetItems, activeView, buildTree, getNodeColor]);

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setBreadcrumbs([]);
    } else {
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
  };

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
        <h1 className={styles.title}>Vizualizace státního rozpočtu vlády Petra Fialy na rok 2026</h1>
        <p className={styles.subtitle}>
          Interaktivní hierarchická vizualizace příjmů a výdajů. Kliknutím na oblast přiblížíte podkategorie.
        </p>

        <div className={styles.navLinks}>
          <Link to="/rozpocet" className={styles.navLink}>
            📋 Tabulková data
          </Link>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs}>
            {(Object.entries(VIEW_CONFIG) as [ViewType, typeof VIEW_CONFIG[ViewType]][])
              .sort((a, b) => a[1].order - b[1].order)
              .map(([key, config]) => (
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

        {breadcrumbs.length > 0 && (
          <div className={styles.breadcrumbs}>
            <button 
              className={styles.breadcrumb}
              onClick={() => handleBreadcrumbClick(-1)}
            >
              {VIEW_CONFIG[activeView].label}
            </button>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.id}>
                <span className={styles.breadcrumbSeparator}> › </span>
                <button 
                  className={styles.breadcrumb}
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        )}

        <p className={styles.instructions}>
          Klikněte na oblast pro přiblížení. Klikněte znovu pro návrat zpět.
        </p>

        <div className={styles.treemapContainer} ref={containerRef}>
          <svg ref={svgRef} className={styles.treemapSvg} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
