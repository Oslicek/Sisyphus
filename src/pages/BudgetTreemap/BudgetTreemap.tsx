import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import { parseCSV, formatCurrency } from '../../utils/budgetData';
import type { BudgetRow } from '../../utils/budgetData';
import styles from './BudgetTreemap.module.css';

interface ClassificationRow {
  kind: string;
  system: string;
  code: string;
  name: string;
  parent_code: string;
  level: number;
  is_leaf: boolean;
  is_total: boolean;
}

interface TreeFileNode {
  id: string;
  name: string;
  children?: TreeFileNode[];
}

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  value?: number;
}

type ViewType = 'revenues' | 'exp_druhove' | 'exp_odvetvove';

// Order: Příjmy, Výdaje (odvětvové), Výdaje (druhové)
const VIEW_CONFIG: Record<ViewType, { 
  label: string; 
  dataFile: string;
  treeFile: string;
  system: string;
  kind: string;
  order: number;
}> = {
  revenues: { 
    label: 'Příjmy', 
    dataFile: 'fact_revenues_by_chapter.csv',
    treeFile: 'tree_rev_druhove.json',
    system: 'rev_druhove',
    kind: 'rev',
    order: 1
  },
  exp_odvetvove: { 
    label: 'Výdaje (odvětvové)', 
    dataFile: 'fact_expenditures_by_chapter.csv',
    treeFile: 'tree_exp_odvetvove.json',
    system: 'exp_odvetvove',
    kind: 'exp',
    order: 2
  },
  exp_druhove: { 
    label: 'Výdaje (druhové)', 
    dataFile: 'fact_expenditures_by_chapter.csv',
    treeFile: 'tree_exp_druhove.json',
    system: 'exp_druhove',
    kind: 'exp',
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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseClassificationCSV(text: string): ClassificationRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    return {
      kind: values[0] || '',
      system: values[1] || '',
      code: values[2] || '',
      name: values[3] || '',
      parent_code: values[4] || '',
      level: parseInt(values[5]) || 0,
      is_leaf: values[6] === 'True',
      is_total: values[7] === 'True'
    };
  });
}

// Extract names from tree file into a map
function extractNamesFromTree(node: TreeFileNode, nameMap: Map<string, string>): void {
  if (node.name && node.id !== 'root') {
    nameMap.set(node.id, node.name);
  }
  if (node.children) {
    node.children.forEach(child => extractNamesFromTree(child, nameMap));
  }
}

export function BudgetTreemap() {
  const [classification, setClassification] = useState<ClassificationRow[]>([]);
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('exp_odvetvove');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([]);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load classification data once
  useEffect(() => {
    async function loadClassification() {
      try {
        const res = await fetch('/data/budget/dim_classification.csv');
        const text = await res.text();
        setClassification(parseClassificationCSV(text));
      } catch (error) {
        console.error('Failed to load classification:', error);
      }
    }
    loadClassification();
  }, []);

  // Load budget data and names when view changes
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setBreadcrumbs([]);
      try {
        const config = VIEW_CONFIG[activeView];
        const [dataRes, treeRes] = await Promise.all([
          fetch(`/data/budget/${config.dataFile}`),
          fetch(`/data/budget/${config.treeFile}`)
        ]);
        
        const text = await dataRes.text();
        setBudgetRows(parseCSV(text));
        
        // Extract names from tree file
        const treeData = await treeRes.json() as TreeFileNode;
        const names = new Map<string, string>();
        extractNamesFromTree(treeData, names);
        setNameMap(names);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    }
    loadData();
  }, [activeView]);

  // Get classification for current view (exclude only the root total "0")
  const currentClassification = useMemo(() => {
    const config = VIEW_CONFIG[activeView];
    return classification.filter(c => c.system === config.system && c.code !== '0');
  }, [classification, activeView]);

  // Build value map from budget data - find effective leaves PER CHAPTER then aggregate
  const valueMap = useMemo((): Map<string, number> => {
    const config = VIEW_CONFIG[activeView];
    
    // First pass: collect all codes per chapter (including combined codes)
    const byChapterAll = new Map<string, Map<string, number>>();
    
    budgetRows
      .filter(row => row.year === 2026 && row.system === config.system && row.class_code !== '0')
      .forEach(row => {
        if (!byChapterAll.has(row.chapter_code)) {
          byChapterAll.set(row.chapter_code, new Map());
        }
        const chapterMap = byChapterAll.get(row.chapter_code)!;
        const existing = chapterMap.get(row.class_code) || 0;
        chapterMap.set(row.class_code, existing + Math.abs(row.amount_czk));
      });
    
    // Second pass: filter combined codes that have all parts present
    const byChapter = new Map<string, Map<string, number>>();
    
    byChapterAll.forEach((chapterCodes, chapterCode) => {
      const filtered = new Map<string, number>();
      
      chapterCodes.forEach((amount, code) => {
        if (code.includes('_')) {
          // Combined code like "31_32" or "122_123"
          const parts = code.split('_');
          // Only skip if ALL parts exist as separate entries
          const allPartsExist = parts.every(part => chapterCodes.has(part));
          if (allPartsExist) {
            // This is a sum of existing parts - skip it
            return;
          }
        }
        filtered.set(code, amount);
      });
      
      byChapter.set(chapterCode, filtered);
    });
    
    // For each chapter, find effective leaves (codes with no children in that chapter)
    const aggregated = new Map<string, number>();
    
    byChapter.forEach((chapterCodes) => {
      const allCodesInChapter = Array.from(chapterCodes.keys());
      
      chapterCodes.forEach((amount, code) => {
        // Check if this code has any children with values in THIS chapter
        const hasChildWithValue = allCodesInChapter.some(
          other => other !== code && other.startsWith(code)
        );
        
        if (!hasChildWithValue) {
          // This is an effective leaf for this chapter - add to aggregate
          const existing = aggregated.get(code) || 0;
          aggregated.set(code, existing + amount);
        }
      });
    });
    
    return aggregated;
  }, [budgetRows, activeView]);

  // Get the best name for a code
  const getName = useCallback((code: string, classificationName?: string): string => {
    // First try tree file names (best quality)
    const treeName = nameMap.get(code);
    if (treeName && treeName.length > 3) return treeName;
    
    // Then try classification name
    if (classificationName && classificationName.length > 3) return classificationName;
    
    // Fallback to code
    return `[${code}]`;
  }, [nameMap]);

  // Build tree from classification data
  const buildTree = useCallback((): TreeNode | null => {
    if (currentClassification.length === 0) return null;

    // Create a map of all nodes
    const nodeMap = new Map<string, TreeNode>();
    
    // First pass: create all nodes
    currentClassification.forEach(c => {
      nodeMap.set(c.code, {
        id: c.code,
        name: getName(c.code, c.name),
        children: []
      });
    });

    // Second pass: build parent-child relationships
    let rootNode: TreeNode | null = null;
    
    // Create root node
    rootNode = {
      id: 'root',
      name: VIEW_CONFIG[activeView].label,
      children: []
    };
    
    currentClassification.forEach(c => {
      const node = nodeMap.get(c.code)!;
      
      if (!c.parent_code || c.parent_code === '' || c.parent_code === '0') {
        // This is a top-level node (root child)
        rootNode!.children!.push(node);
      } else {
        const parent = nodeMap.get(c.parent_code);
        if (parent) {
          parent.children!.push(node);
        }
      }
    });

    // Also add any codes from data that aren't in classification
    valueMap.forEach((_, code) => {
      if (!nodeMap.has(code)) {
        // Find parent by prefix matching
        let parentCode = code.slice(0, -1);
        while (parentCode.length > 0 && !nodeMap.has(parentCode)) {
          parentCode = parentCode.slice(0, -1);
        }
        
        const newNode: TreeNode = {
          id: code,
          name: getName(code),
          children: []
        };
        
        if (parentCode && nodeMap.has(parentCode)) {
          nodeMap.get(parentCode)!.children!.push(newNode);
        } else if (rootNode) {
          rootNode.children!.push(newNode);
        }
        
        nodeMap.set(code, newNode);
      }
    });

    return rootNode;
  }, [currentClassification, valueMap, activeView, getName]);

  // Assign values to leaf nodes only
  const assignValues = useCallback((node: TreeNode): TreeNode | null => {
    const hasChildren = node.children && node.children.length > 0;
    
    if (!hasChildren) {
      // Leaf node - get value from data
      const value = valueMap.get(node.id);
      if (!value || value === 0) return null;
      return { ...node, value, children: undefined };
    }
    
    // Non-leaf: process children
    const validChildren = node.children!
      .map(child => assignValues(child))
      .filter((child): child is TreeNode => child !== null);
    
    if (validChildren.length === 0) {
      // No children with values - check if this node has direct value
      const directValue = valueMap.get(node.id);
      if (directValue && directValue > 0) {
        return { ...node, value: directValue, children: undefined };
      }
      return null;
    }
    
    return { ...node, children: validChildren };
  }, [valueMap]);

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
    if (!svgRef.current || !containerRef.current || budgetRows.length === 0 || currentClassification.length === 0) return;

    const rawTree = buildTree();
    if (!rawTree) return;

    const enrichedTree = assignValues(rawTree);
    if (!enrichedTree || !enrichedTree.children || enrichedTree.children.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 600;

    // Create hierarchy and sort by value (descending)
    const root = d3.hierarchy(enrichedTree)
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

    // Add rectangles
    const rect = cell.append('rect')
      .attr('width', d => rectWidth(d))
      .attr('height', d => rectHeight(d))
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('click', clicked);

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

  }, [budgetRows, currentClassification, activeView, buildTree, assignValues, getNodeColor]);

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
