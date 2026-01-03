import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { Footer } from '../../components/Footer';
import { 
  parseCSV, 
  parseClassificationCSV,
  formatCurrency 
} from '../../utils/budgetData';
import {
  calculateAdjustedDeficit,
  calculateMaxAdjustment,
  createBudgetAdjustment,
  formatGameResultForShare,
  calculateProgressPercent,
  type BudgetAdjustment
} from '../../utils/deficitGame';
import type { BudgetRow, Classification } from '../../utils/budgetData';
import styles from './DeficitGame.module.css';
import rozpoctovkaLogo from '../../assets/rozpoctovka-logo-250x204-pruhledne.png';

// Original deficit from 2026 budget
const ORIGINAL_DEFICIT = -286_000_000_000;

interface TreeNode {
  id: string;
  name: string;
  value?: number;
  children?: TreeNode[];
}

interface HierarchyRectNode extends d3.HierarchyRectangularNode<TreeNode> {
  target?: { x0: number; x1: number; y0: number; y1: number };
}

interface HoverButton {
  nodeId: string;
  x: number;
  y: number;
  name: string;
  value: number;
}

export function DeficitGame() {
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [treeNames, setTreeNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<BudgetAdjustment[]>([]);
  
  // Hover buttons for each chart
  const [revenueHoverButton, setRevenueHoverButton] = useState<HoverButton | null>(null);
  const [expenditureHoverButton, setExpenditureHoverButton] = useState<HoverButton | null>(null);
  
  // Current focus node ID for each chart (for navigation)
  // We store the ID instead of the node reference because the hierarchy is rebuilt on each render
  const [revenueFocusId, setRevenueFocusId] = useState<string | null>(null);
  const [expenditureFocusId, setExpenditureFocusId] = useState<string | null>(null);
  
  const revenueChartRef = useRef<SVGSVGElement>(null);
  const expenditureChartRef = useRef<SVGSVGElement>(null);
  const revenueContainerRef = useRef<HTMLDivElement>(null);
  const expenditureContainerRef = useRef<HTMLDivElement>(null);
  const shareableRef = useRef<HTMLDivElement>(null);
  
  // Share state
  const [shareState, setShareState] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');

  // Calculate current deficit
  const currentDeficit = useMemo(() => {
    const raw = calculateAdjustedDeficit(ORIGINAL_DEFICIT, adjustments);
    // Treat values within 1 billion of zero as zero (accounts for rounding)
    if (Math.abs(raw) < 1_000_000_000) {
      return 0;
    }
    return raw;
  }, [adjustments]);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [revenuesRes, expendituresRes, classRes, treeRevRes, treeExpRes] = await Promise.all([
          fetch('/data/budget/fact_revenues_by_chapter.csv'),
          fetch('/data/budget/fact_expenditures_by_chapter.csv'),
          fetch('/data/budget/dim_classification.csv'),
          fetch('/data/budget/tree_rev_druhove.json'),
          fetch('/data/budget/tree_exp_odvetvove.json')
        ]);

        const [revenuesText, expendituresText, classText] = await Promise.all([
          revenuesRes.text(),
          expendituresRes.text(),
          classRes.text()
        ]);

        const [treeRev, treeExp] = await Promise.all([
          treeRevRes.json(),
          treeExpRes.json()
        ]);

        const revenues = parseCSV(revenuesText);
        const expenditures = parseCSV(expendituresText);
        setBudgetRows([...revenues, ...expenditures]);
        setClassifications(parseClassificationCSV(classText));

        // Extract names from trees
        const names = new Map<string, string>();
        function extractNames(node: TreeNode, prefix: string = '') {
          const key = prefix ? `${prefix}_${node.id}` : node.id;
          if (node.name && node.id !== 'root') {
            names.set(key, node.name);
          }
          if (node.children) {
            node.children.forEach(child => extractNames(child, prefix));
          }
        }
        extractNames(treeRev, 'rev');
        extractNames(treeExp, 'exp');
        setTreeNames(names);

        setLoading(false);
      } catch (error) {
        console.error('Failed to load budget data:', error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Build tree from classification data
  const buildTree = useCallback((kind: 'rev' | 'exp', system: string): TreeNode | null => {
    // Filter classification for this kind/system, excluding totals but keeping root
    const relevantClass = classifications.filter(c => 
      c.kind === kind && c.system === system && (!c.is_total || c.code === '0')
    );
    if (relevantClass.length === 0) return null;

    const nodeMap = new Map<string, TreeNode>();
    
    // Create all nodes
    relevantClass.forEach(c => {
      const fullName = treeNames.get(`${kind}_${c.code}`) || c.name || c.code;
      nodeMap.set(c.code, { id: c.code, name: fullName, children: [] });
    });

    // Create root node
    const rootLabel = kind === 'rev' ? 'Příjmy' : 'Výdaje';
    const root: TreeNode = {
      id: 'root',
      name: rootLabel,
      children: []
    };

    // Build hierarchy
    relevantClass.forEach(c => {
      const node = nodeMap.get(c.code)!;
      if (!c.parent_code || c.parent_code === '' || c.parent_code === '0') {
        // Top-level node
        root.children!.push(node);
      } else if (nodeMap.has(c.parent_code)) {
        nodeMap.get(c.parent_code)!.children!.push(node);
      }
    });

    if (root.children!.length === 0) return null;

    return root;
  }, [classifications, treeNames]);

  // Build value map for a system
  const buildValueMap = useCallback((system: string): Map<string, number> => {
    const valueMap = new Map<string, number>();
    
    // Get leaf classifications for this system
    const leafClass = classifications.filter(c => 
      c.system === system && c.is_leaf && !c.is_total
    );
    const leafCodes = new Set(leafClass.map(c => c.code));
    
    // Sum values for each code from budget rows
    budgetRows
      .filter(r => r.year === 2026 && r.system === system)
      .forEach(r => {
        // Only use leaf values or direct class values
        if (leafCodes.has(r.class_code) || r.class_code.length >= 3) {
          const current = valueMap.get(r.class_code) || 0;
          valueMap.set(r.class_code, current + Math.abs(r.amount_czk));
        }
      });
    
    return valueMap;
  }, [budgetRows, classifications]);

  // Assign values to tree nodes (only to leaves)
  const assignValues = useCallback((tree: TreeNode, valueMap: Map<string, number>): TreeNode | null => {
    function assignRecursive(node: TreeNode): TreeNode | null {
      const hasChildren = node.children && node.children.length > 0;
      
      if (!hasChildren) {
        // Leaf node - get value from map
        const value = valueMap.get(node.id);
        if (!value || value === 0) return null;
        return { ...node, value, children: undefined };
      }
      
      // Non-leaf: process children
      const validChildren = node.children!
        .map(child => assignRecursive(child))
        .filter((child): child is TreeNode => child !== null);
      
      if (validChildren.length === 0) {
        // Check for direct value
        const directValue = valueMap.get(node.id);
        if (directValue && directValue > 0) {
          return { ...node, value: directValue, children: undefined };
        }
        return null;
      }
      
      return { ...node, children: validChildren };
    }

    return assignRecursive(tree);
  }, []);

  // Get color for node
  const getNodeColor = useCallback((depth: number, index: number, type: 'revenue' | 'expenditure') => {
    if (type === 'revenue') {
      const hue = 140; // Green
      const saturation = 50 + (depth * 10);
      const lightness = 70 - (depth * 8) - (index % 3) * 5;
      return `hsl(${hue}, ${saturation}%, ${Math.max(30, lightness)}%)`;
    } else {
      const hue = 0; // Red
      const saturation = 50 + (depth * 10);
      const lightness = 70 - (depth * 8) - (index % 3) * 5;
      return `hsl(${hue}, ${saturation}%, ${Math.max(30, lightness)}%)`;
    }
  }, []);

  // Check if item is selected
  const isSelected = useCallback((id: string) => {
    return adjustments.some(a => a.id === id);
  }, [adjustments]);

  // Handle item selection
  const handleSelectItem = useCallback((id: string, name: string, value: number, type: 'revenue' | 'expenditure') => {
    if (isSelected(id)) {
      // Remove if already selected
      setAdjustments(prev => prev.filter(a => a.id !== id));
    } else {
      // Add new adjustment
      const adjustment = createBudgetAdjustment(id, name, type, value);
      setAdjustments(prev => [...prev, adjustment]);
    }
  }, [isSelected]);

  // Handle adjustment change
  const handleAdjustmentChange = useCallback((id: string, newAmount: number) => {
    setAdjustments(prev => prev.map(a => 
      a.id === id ? { ...a, adjustmentAmount: newAmount } : a
    ));
  }, []);

  // Remove adjustment
  const handleRemoveAdjustment = useCallback((id: string) => {
    setAdjustments(prev => prev.filter(a => a.id !== id));
  }, []);

  // Reset all adjustments
  const handleReset = useCallback(() => {
    setAdjustments([]);
  }, []);

  // Capture screenshot of shareable content
  const captureScreenshot = useCallback(async (): Promise<Blob | null> => {
    if (!shareableRef.current) return null;
    
    try {
      // Make shareable div visible for capture (it's always rendered, just hidden)
      shareableRef.current.style.visibility = 'visible';
      
      // Small delay to ensure everything is painted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(shareableRef.current, {
        backgroundColor: '#f8f9fa',
        scale: 2,
        logging: false,
        useCORS: true,
        width: 600,
        windowWidth: 600,
      });
      
      // Hide it again
      shareableRef.current.style.visibility = 'hidden';
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
      });
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      if (shareableRef.current) {
        shareableRef.current.style.visibility = 'hidden';
      }
      return null;
    }
  }, []);

  // Share result with image
  const handleShare = useCallback(async () => {
    setShareState('capturing');
    
    try {
      const blob = await captureScreenshot();
      const shareText = formatGameResultForShare(ORIGINAL_DEFICIT, adjustments);
      
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], 'rozpoctovka-vysledek.png', { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Zrušil/a jsem schodek!',
            text: shareText,
            files: [file],
          });
          setShareState('success');
        } else {
          // Fallback: share just text + URL
          await navigator.share({
            title: 'Zrušil/a jsem schodek!',
            text: shareText,
            url: window.location.href
          });
          setShareState('success');
        }
      } else if (blob) {
        // No Web Share API - download the image
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'rozpoctovka-vysledek.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Also copy text to clipboard
        await navigator.clipboard.writeText(shareText);
        setShareState('success');
      } else {
        // Fallback: just copy text
        await navigator.clipboard.writeText(shareText);
        setShareState('success');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Share failed:', e);
        setShareState('error');
      } else {
        setShareState('idle');
        return;
      }
    }
    
    setTimeout(() => setShareState('idle'), 2000);
  }, [adjustments, captureScreenshot]);

  // Render icicle chart with navigation
  const renderIcicleChart = useCallback((
    svgRef: React.RefObject<SVGSVGElement | null>,
    containerRef: React.RefObject<HTMLDivElement | null>,
    tree: TreeNode | null,
    type: 'revenue' | 'expenditure',
    setHoverButton: React.Dispatch<React.SetStateAction<HoverButton | null>>,
    focusId: string | null,
    setFocusId: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    if (!svgRef.current || !containerRef.current || !tree) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 400;

    const root = d3.hierarchy(tree)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0)) as HierarchyRectNode;

    if (!root.children || root.children.length === 0) return;

    const visibleColumns = 3;
    const columnWidth = width / visibleColumns;
    const fullWidth = (root.height + 1) * columnWidth;

    d3.partition<TreeNode>()
      .size([height, fullWidth])
      .padding(0)(root);

    // Find focus node by ID, default to root
    let focus: HierarchyRectNode = root;
    if (focusId) {
      const foundNode = root.descendants().find(d => d.data.id === focusId);
      if (foundNode) {
        focus = foundNode as HierarchyRectNode;
      }
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Add clip path
    const clipId = `clip-${type}`;
    svg.append('defs')
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height);

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height)
      .style('font', '11px Source Sans 3, system-ui, sans-serif')
      .style('overflow', 'hidden');

    const mainGroup = svg.append('g')
      .attr('clip-path', `url(#${clipId})`);

    // Calculate scale based on focus
    const xScale = (x: number) => {
      const focusX0 = focus.x0;
      const focusX1 = focus.x1;
      return ((x - focusX0) / (focusX1 - focusX0)) * height;
    };
    
    const yScale = (y: number) => {
      return y - focus.y0;
    };

    const cell = mainGroup
      .selectAll<SVGGElement, HierarchyRectNode>('g')
      .data(root.descendants() as HierarchyRectNode[])
      .join('g')
      .attr('transform', d => `translate(${yScale(d.y0)},${xScale(d.x0)})`);

    // Add rectangles
    cell.append('rect')
      .attr('width', d => Math.max(0, d.y1 - d.y0))
      .attr('height', d => Math.max(0, xScale(d.x1) - xScale(d.x0)))
      .attr('fill', (d, i) => getNodeColor(d.depth, i, type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation();
        // Navigation logic:
        // - If clicking on the current focus node, zoom out to its parent
        // - If clicking on a node with children, zoom into it
        // - If clicking on a leaf, zoom to its parent
        if (d.data.id === focus.data.id) {
          // Clicking on current focus -> zoom out
          if (focus.parent) {
            setFocusId(focus.parent.data.id);
          }
        } else if (d.children) {
          // Clicking on a node with children -> zoom in
          setFocusId(d.data.id);
        } else if (d.parent) {
          // Clicking on leaf -> zoom to its parent
          setFocusId(d.parent.data.id);
        }
      })
      .on('mouseenter', function(event, d) {
        // Show hover button only for LEAF nodes (no children) with value
        const isLeaf = !d.children || d.children.length === 0;
        if (d.depth > 0 && isLeaf && d.value && d.value > 0) {
          const rect = (event.target as SVGRectElement).getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const rectWidth = rect.width;
          const rectHeight = rect.height;
          
          // Only show button if rect is large enough
          if (rectWidth > 30 && rectHeight > 20) {
            setHoverButton({
              nodeId: d.data.id,
              x: rect.right - containerRect.left - 30,
              y: rect.top - containerRect.top + 5,
              name: d.data.name,
              value: d.value // Use D3's summed value
            });
          }
        }
      })
      .on('mouseleave', function(event) {
        const relatedTarget = event.relatedTarget as Element;
        if (!relatedTarget?.closest(`.${styles.selectButton}`)) {
          setHoverButton(null);
        }
      });

    // Add tooltip to cell group (works better with mouseenter/mouseleave handlers on rect)
    cell.append('title')
      .text(d => `${d.data.name}\n${(d.value! / 1_000_000_000).toFixed(1)} mld. Kč`);

    // Add text labels
    cell.append('text')
      .attr('x', 4)
      .attr('y', 13)
      .attr('fill', '#fff')
      .attr('font-weight', 500)
      .text(d => {
        const rectWidth = d.y1 - d.y0;
        const rectHeight = xScale(d.x1) - xScale(d.x0);
        if (rectWidth < 40 || rectHeight < 20) return '';
        const name = d.data.name || '';
        const maxChars = Math.floor(rectWidth / 7);
        return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
      });

    // Add breadcrumb/back navigation hint
    if (focus.data.id !== root.data.id && focus.parent) {
      svg.append('text')
        .attr('x', 10)
        .attr('y', height - 10)
        .attr('fill', '#666')
        .attr('font-size', '10px')
        .text('← Klikni na levý sloupec pro návrat')
        .style('cursor', 'pointer')
        .on('click', () => {
          if (focus.parent) {
            setFocusId(focus.parent.data.id);
          }
        });
    }

  }, [getNodeColor]);

  // Build enriched trees
  const revenueTree = useMemo(() => {
    if (loading || budgetRows.length === 0 || classifications.length === 0) return null;
    const tree = buildTree('rev', 'rev_druhove');
    if (!tree) return null;
    const valueMap = buildValueMap('rev_druhove');
    return assignValues(tree, valueMap);
  }, [loading, budgetRows, classifications, buildTree, buildValueMap, assignValues]);

  const expenditureTree = useMemo(() => {
    if (loading || budgetRows.length === 0 || classifications.length === 0) return null;
    const tree = buildTree('exp', 'exp_odvetvove');
    if (!tree) return null;
    const valueMap = buildValueMap('exp_odvetvove');
    return assignValues(tree, valueMap);
  }, [loading, budgetRows, classifications, buildTree, buildValueMap, assignValues]);

  // Render revenue chart
  useEffect(() => {
    renderIcicleChart(revenueChartRef, revenueContainerRef, revenueTree, 'revenue', setRevenueHoverButton, revenueFocusId, setRevenueFocusId);
  }, [revenueTree, revenueFocusId, renderIcicleChart]);

  // Render expenditure chart
  useEffect(() => {
    renderIcicleChart(expenditureChartRef, expenditureContainerRef, expenditureTree, 'expenditure', setExpenditureHoverButton, expenditureFocusId, setExpenditureFocusId);
  }, [expenditureTree, expenditureFocusId, renderIcicleChart]);

  // Calculate progress percentage using the tested utility function
  const progressPercent = useMemo(() => {
    return calculateProgressPercent(ORIGINAL_DEFICIT, currentDeficit);
  }, [currentDeficit]);

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
        <Link to="/rozpocet" className={styles.backLink}>← Zpět na tabulky rozpočtu</Link>
      </header>

      <main className={styles.main}>
        <div className={styles.logoContainer}>
          <img src={rozpoctovkaLogo} alt="Rozpočtovka" className={styles.logo} />
        </div>
        <h1 className={styles.title}>Zruším schodek!</h1>
        <p className={styles.subtitle}>
          Upravte příjmy a výdaje státního rozpočtu tak, aby schodek klesl na nulu
        </p>

        {/* Progress Section */}
        <section className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>
              Cíl: Snížit schodek z -286 mld. na 0 mld.
            </span>
            <span className={`${styles.deficitValue} ${
              currentDeficit === 0 ? styles.deficitZero :
              currentDeficit > 0 ? styles.deficitPositive :
              styles.deficitNegative
            }`}>
              {currentDeficit === 0 ? 'Vyrovnáno! 🎉' :
               currentDeficit > 0 ? `Přebytek: ${formatCurrency(currentDeficit)}` :
               `Zbývá: ${formatCurrency(currentDeficit)}`}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${
                currentDeficit === 0 ? styles.progressFillZero :
                currentDeficit > 0 ? styles.progressFillPositive :
                styles.progressFillNegative
              }`}
              style={{ width: `${progressPercent}%` }}
            />
            <span className={styles.progressText}>
              {progressPercent.toFixed(0)}% vyřešeno
            </span>
          </div>
        </section>

        {/* Success Banner (non-modal) */}
        {currentDeficit >= 0 && adjustments.length > 0 && (
          <div className={`${styles.successBanner} ${currentDeficit === 0 ? styles.successBannerZero : styles.successBannerPositive}`}>
            <span className={styles.successBannerIcon}>{currentDeficit === 0 ? '🎉' : '💰'}</span>
            <span className={styles.successBannerText}>
              {currentDeficit === 0 
                ? 'Vyrovnaný rozpočet! Podařilo se vám eliminovat schodek.'
                : `Přebytek ${formatCurrency(currentDeficit)}! Už máte více než vyrovnaný rozpočet.`}
            </span>
            <button 
              className={styles.successBannerShare} 
              onClick={handleShare}
              disabled={shareState === 'capturing'}
            >
              {shareState === 'capturing' ? '⏳ Vytvářím...' : 
               shareState === 'success' ? '✓ Hotovo!' :
               shareState === 'error' ? '⚠ Chyba' :
               '📤 Sdílet'}
            </button>
          </div>
        )}

        {/* Adjustments Section - placed above charts for better UX */}
        <section className={styles.adjustmentsSection}>
          <h2 className={styles.adjustmentsTitle}>📋 Moje úpravy rozpočtu</h2>
          
          {adjustments.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>🎯</div>
              <p>Zatím nemáte žádné úpravy. Vyberte položky z grafů níže.</p>
            </div>
          ) : (
            <>
              <div className={styles.adjustmentsList}>
                {adjustments.map(adjustment => {
                  const { min, max } = calculateMaxAdjustment(adjustment.type, adjustment.originalValue);
                  const billionsChange = adjustment.adjustmentAmount / 1_000_000_000;
                  const baseBillions = adjustment.originalValue / 1_000_000_000;
                  const sign = adjustment.adjustmentAmount >= 0 ? '+' : '';
                  
                  // Color logic:
                  // Revenue: + is good (green), - is bad (red)
                  // Expenditure: + is bad (red), - is good (green)
                  const isGoodChange = adjustment.type === 'revenue' 
                    ? adjustment.adjustmentAmount > 0
                    : adjustment.adjustmentAmount < 0;
                  const isBadChange = adjustment.type === 'revenue'
                    ? adjustment.adjustmentAmount < 0
                    : adjustment.adjustmentAmount > 0;
                  
                  // Calculate percentage change
                const percentChange = adjustment.originalValue !== 0 
                  ? (adjustment.adjustmentAmount / adjustment.originalValue) * 100 
                  : 0;
                const percentSign = percentChange >= 0 ? '+' : '';
                
                return (
                    <div 
                      key={adjustment.id} 
                      className={`${styles.adjustmentItem} ${
                        adjustment.type === 'revenue' ? styles.adjustmentRevenue : styles.adjustmentExpenditure
                      }`}
                    >
                      <div className={styles.adjustmentHeader}>
                        <span className={styles.adjustmentName} title={adjustment.name}>
                          {adjustment.type === 'revenue' ? '📈' : '📉'} {adjustment.name}
                        </span>
                        <span className={styles.adjustmentBase}>
                          Základ: {baseBillions.toFixed(1)} mld.
                        </span>
                      </div>
                      <div className={styles.adjustmentControls}>
                        <input
                          type="range"
                          className={styles.adjustmentSlider}
                          min={min}
                          max={max}
                          step={1_000_000_000}
                          value={adjustment.adjustmentAmount}
                          onChange={(e) => handleAdjustmentChange(adjustment.id, Number(e.target.value))}
                        />
                        <span className={`${styles.adjustmentValue} ${
                          isGoodChange ? styles.adjustmentValueGood :
                          isBadChange ? styles.adjustmentValueBad :
                          styles.adjustmentValueZero
                        }`}>
                          {sign}{billionsChange.toFixed(0)} mld. ({percentSign}{percentChange.toFixed(0)}%)
                        </span>
                        <button 
                          className={styles.removeButton}
                          onClick={() => handleRemoveAdjustment(adjustment.id)}
                          title="Odebrat"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.actionsInline}>
                <button 
                  className={`${styles.shareButton} ${styles.shareButtonPrimary}`} 
                  onClick={handleShare}
                  disabled={shareState === 'capturing'}
                >
                  {shareState === 'capturing' ? '⏳ Vytvářím obrázek...' : 
                   shareState === 'success' ? '✓ Hotovo!' :
                   shareState === 'error' ? '⚠ Chyba' :
                   '📤 Sdílet můj plán'}
                </button>
                <button className={styles.resetButton} onClick={handleReset}>
                  🔄 Začít znovu
                </button>
              </div>
            </>
          )}
        </section>

        {/* Instructions */}
        <div className={styles.instructions}>
          <span className={styles.instructionIcon}>💡</span>
          Najeďte myší na <strong>koncovou položku</strong> v grafu a klikněte na tlačítko <strong>+</strong> pro přidání do seznamu úprav. Každou položku můžete navýšit nebo snížit maximálně o 50 %. Položky nelze odebírat ani přidávat.
        </div>

        {/* Charts Section */}
        <section className={styles.chartsSection}>
          {/* Revenue Chart */}
          <div className={styles.chartCard}>
            <h2 className={`${styles.chartTitle} ${styles.chartTitleRevenue}`}>
              📈 Příjmy
            </h2>
            <div className={styles.chartContainer} ref={revenueContainerRef}>
              <svg ref={revenueChartRef} className={styles.chartSvg} />
              {revenueHoverButton && (
                <button
                  className={`${styles.selectButton} ${styles.selectButtonVisible} ${
                    isSelected(revenueHoverButton.nodeId) ? styles.selectButtonSelected : ''
                  }`}
                  style={{ 
                    left: revenueHoverButton.x, 
                    top: revenueHoverButton.y 
                  }}
                  onClick={() => handleSelectItem(
                    revenueHoverButton.nodeId,
                    revenueHoverButton.name,
                    revenueHoverButton.value,
                    'revenue'
                  )}
                  onMouseLeave={() => setRevenueHoverButton(null)}
                  title={isSelected(revenueHoverButton.nodeId) ? 'Odebrat' : 'Přidat do úprav'}
                >
                  {isSelected(revenueHoverButton.nodeId) ? '✓' : '+'}
                </button>
              )}
            </div>
          </div>

          {/* Expenditure Chart */}
          <div className={styles.chartCard}>
            <h2 className={`${styles.chartTitle} ${styles.chartTitleExpenditure}`}>
              📉 Výdaje (odvětvové)
            </h2>
            <div className={styles.chartContainer} ref={expenditureContainerRef}>
              <svg ref={expenditureChartRef} className={styles.chartSvg} />
              {expenditureHoverButton && (
                <button
                  className={`${styles.selectButton} ${styles.selectButtonVisible} ${
                    isSelected(expenditureHoverButton.nodeId) ? styles.selectButtonSelected : ''
                  }`}
                  style={{ 
                    left: expenditureHoverButton.x, 
                    top: expenditureHoverButton.y 
                  }}
                  onClick={() => handleSelectItem(
                    expenditureHoverButton.nodeId,
                    expenditureHoverButton.name,
                    expenditureHoverButton.value,
                    'expenditure'
                  )}
                  onMouseLeave={() => setExpenditureHoverButton(null)}
                  title={isSelected(expenditureHoverButton.nodeId) ? 'Odebrat' : 'Přidat do úprav'}
                >
                  {isSelected(expenditureHoverButton.nodeId) ? '✓' : '+'}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Hidden shareable content for screenshot - always rendered but off-screen */}
      <div ref={shareableRef} className={styles.shareableContent}>
        <div className={styles.shareableHeader}>
          <img src={rozpoctovkaLogo} alt="Rozpočtovka" className={styles.shareableLogo} />
          <h1 className={styles.shareableTitle}>Zruším schodek!</h1>
        </div>
        
        <div className={styles.shareableProgress}>
          <div className={styles.shareableProgressHeader}>
            <span>Cíl: Snížit schodek z -286 mld. na 0 mld.</span>
            <span className={`${styles.shareableDeficitValue} ${
              currentDeficit === 0 ? styles.deficitZero :
              currentDeficit > 0 ? styles.deficitPositive :
              styles.deficitNegative
            }`}>
              {currentDeficit === 0 ? 'Vyrovnáno! 🎉' :
               currentDeficit > 0 ? `Přebytek: ${formatCurrency(currentDeficit)}` :
               `Zbývá: ${formatCurrency(currentDeficit)}`}
            </span>
          </div>
          <div className={styles.shareableProgressBar}>
            <div 
              className={`${styles.shareableProgressFill} ${
                currentDeficit === 0 ? styles.progressFillZero :
                currentDeficit > 0 ? styles.progressFillPositive :
                styles.progressFillNegative
              }`}
              style={{ width: `${progressPercent}%` }}
            />
            <span className={styles.shareableProgressText}>
              {progressPercent.toFixed(0)}% vyřešeno
            </span>
          </div>
        </div>

        {adjustments.length > 0 && (
          <div className={styles.shareableAdjustments}>
            <h2 className={styles.shareableAdjustmentsTitle}>📋 Moje úpravy rozpočtu</h2>
            <div className={styles.shareableAdjustmentsList}>
              {adjustments.filter(a => a.adjustmentAmount !== 0).map(adjustment => {
                const billionsChange = adjustment.adjustmentAmount / 1_000_000_000;
                const baseBillions = adjustment.originalValue / 1_000_000_000;
                const sign = adjustment.adjustmentAmount >= 0 ? '+' : '';
                const percentChange = adjustment.originalValue !== 0 
                  ? (adjustment.adjustmentAmount / adjustment.originalValue) * 100 
                  : 0;
                const percentSign = percentChange >= 0 ? '+' : '';
                
                const isGoodChange = adjustment.type === 'revenue' 
                  ? adjustment.adjustmentAmount > 0
                  : adjustment.adjustmentAmount < 0;
                const isBadChange = adjustment.type === 'revenue'
                  ? adjustment.adjustmentAmount < 0
                  : adjustment.adjustmentAmount > 0;
                
                return (
                  <div 
                    key={adjustment.id}
                    className={`${styles.shareableAdjustmentItem} ${
                      adjustment.type === 'revenue' ? styles.adjustmentRevenue : styles.adjustmentExpenditure
                    }`}
                  >
                    <span className={styles.shareableAdjustmentName}>
                      {adjustment.type === 'revenue' ? '📈' : '📉'} {adjustment.name}
                    </span>
                    <span className={styles.shareableAdjustmentBase}>
                      Základ: {baseBillions.toFixed(1)} mld.
                    </span>
                    <span className={`${styles.shareableAdjustmentValue} ${
                      isGoodChange ? styles.adjustmentValueGood :
                      isBadChange ? styles.adjustmentValueBad :
                      styles.adjustmentValueZero
                    }`}>
                      {sign}{billionsChange.toFixed(0)} mld. ({percentSign}{percentChange.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.shareableFooter}>
          🔗 rozpoctovka.cz
        </div>
      </div>

      <Footer />
    </div>
  );
}

