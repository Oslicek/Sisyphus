import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useHistoricalDebt } from '../../hooks/useHistoricalDebt';
import { formatBillionsCzech } from '../../utils/formatters';
import { formatYearLabel, getGovernmentForYear } from '../../utils/chartHelpers';
import {
  adjustForInflation,
  calculateGdpPercentage,
  calculateYearlyDeficit,
} from '../../utils/graphCalculations';
import { GRAPH_VARIANTS, getGraphVariantInfo } from '../../config/graphVariants';
import type { ChartDataPoint, Government, BudgetPlan, GraphVariant, EconomicYearData } from '../../types/debt';
import styles from './DebtChart.module.css';

const CHART_CONFIG = {
  marginTop: 20,
  marginRight: 20,
  marginBottom: 100,
  marginLeft: 70,
  barPadding: 0.2,
  minBarWidthForAllYears: 18,
  minWidthForGovLabels: 30,
};

function getYearTickValues(data: ChartDataPoint[], showAll: boolean): number[] {
  if (showAll) {
    return data.map((d) => d.year);
  }
  const tickYears = [1993, 1995, 2000, 2005, 2010, 2015, 2020, 2025, 2026];
  const years = data.map((d) => d.year);
  return tickYears.filter((year) => years.includes(year));
}

interface GovernmentSpan {
  gov: Government;
  startX: number;
  endX: number;
  width: number;
  centerX: number;
  color: string;
  yearsCount: number;
}

export function DebtChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: ChartDataPoint | null;
  }>({ visible: false, x: 0, y: 0, data: null });
  const [activePlan, setActivePlan] = useState('fiala');
  const [activeVariant, setActiveVariant] = useState<GraphVariant>('debt-absolute');

  const { chartData, events, governments, parties, budgetPlans, economicData, isLoading, error } = useHistoricalDebt();

  // Handle responsive sizing
  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = Math.min(450, Math.max(350, width * 0.45));
        setDimensions({ width, height });
      }
    }

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Build chart data with prediction
  const getChartDataWithPrediction = (baseData: ChartDataPoint[]): ChartDataPoint[] => {
    if (baseData.length === 0 || budgetPlans.length === 0) return baseData;

    const plan = budgetPlans.find((p) => p.id === activePlan);
    if (!plan) return baseData;

    const prediction2026 = plan.predictions.find((p) => p.year === 2026);
    if (!prediction2026) return baseData;

    const debt2025 = baseData.find((d) => d.year === 2025);
    if (!debt2025) return baseData;

    const deficit2026InBillions = prediction2026.deficit / 1_000_000_000;
    const debt2026 = debt2025.amount + deficit2026InBillions;

    return [
      ...baseData,
      {
        year: 2026,
        amount: debt2026,
        isPrediction: true,
        planId: plan.id,
        planName: plan.name,
        planColor: plan.color,
        note: prediction2026.note,
      },
    ];
  };

  // Transform data based on active variant
  const transformedData = useMemo(() => {
    if (chartData.length === 0 || economicData.length === 0) return [];

    let baseData = [...chartData];
    const targetYear = 2024; // Base year for inflation adjustment

    // Add prediction for debt variants
    if (activeVariant.startsWith('debt-')) {
      baseData = getChartDataWithPrediction(baseData);
    }

    switch (activeVariant) {
      case 'debt-absolute':
        return baseData;
      
      case 'debt-inflation-adjusted':
        return adjustForInflation(baseData, economicData, targetYear);
      
      case 'debt-gdp-percent':
        return calculateGdpPercentage(baseData, economicData);
      
      case 'deficit-absolute': {
        const withPrediction = getChartDataWithPrediction(chartData);
        return calculateYearlyDeficit(withPrediction);
      }
      
      case 'deficit-inflation-adjusted': {
        const withPrediction = getChartDataWithPrediction(chartData);
        const adjusted = adjustForInflation(withPrediction, economicData, targetYear);
        return calculateYearlyDeficit(adjusted);
      }
      
      case 'deficit-gdp-percent': {
        const withPrediction = getChartDataWithPrediction(chartData);
        const deficits = calculateYearlyDeficit(withPrediction);
        return calculateGdpPercentage(deficits, economicData);
      }
      
      default:
        return baseData;
    }
  }, [chartData, economicData, activeVariant, activePlan, budgetPlans]);

  const variantInfo = getGraphVariantInfo(activeVariant);
  const isDeficitVariant = activeVariant.startsWith('deficit-');
  const isPercentVariant = activeVariant.includes('gdp-percent');

  // Draw chart with D3
  useEffect(() => {
    if (!svgRef.current || transformedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const { marginTop, marginRight, marginBottom, marginLeft, barPadding, minBarWidthForAllYears, minWidthForGovLabels } = CHART_CONFIG;
    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    // Scales
    const xScale = d3
      .scaleBand<number>()
      .domain(transformedData.map((d) => d.year))
      .range([0, innerWidth])
      .padding(barPadding);

    // For deficit charts, we need to handle negative values
    const minValue = isDeficitVariant ? Math.min(0, d3.min(transformedData, (d) => d.amount) ?? 0) : 0;
    const maxValue = d3.max(transformedData, (d) => d.amount) ?? 0;

    const yScale = d3
      .scaleLinear()
      .domain([minValue, maxValue])
      .nice()
      .range([innerHeight, 0]);

    const barWidth = xScale.bandwidth();
    const showAllYears = barWidth >= minBarWidthForAllYears;
    const zeroY = yScale(0);

    // Chart group
    const g = svg
      .append('g')
      .attr('transform', `translate(${marginLeft},${marginTop})`);

    // Grid lines
    g.append('g')
      .attr('class', styles.gridLine)
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d));

    // Zero line for deficit charts
    if (isDeficitVariant && minValue < 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', zeroY)
        .attr('y2', zeroY)
        .attr('stroke', '#1a1a2e')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');
    }

    // Bars
    g.selectAll('rect.bar')
      .data(transformedData)
      .join('rect')
      .attr('class', (d) => {
        if (d.isPrediction) return styles.barPrediction;
        if (isDeficitVariant && d.amount < 0) return styles.barSurplus;
        return styles.bar;
      })
      .attr('x', (d) => xScale(d.year) ?? 0)
      .attr('y', (d) => {
        if (d.amount >= 0) return yScale(d.amount);
        return zeroY;
      })
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => {
        if (d.amount >= 0) return zeroY - yScale(d.amount);
        return yScale(d.amount) - zeroY;
      })
      .attr('fill', (d) => d.isPrediction ? (d.planColor || '#666') : '')
      .on('mouseenter', (event, d) => {
        const rect = event.target.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setTooltip({
            visible: true,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 8,
            data: d,
          });
        }
      })
      .on('mouseleave', () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      });

    // === LINE 1: Years ===
    const yearsGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight + 5})`);

    const yearsToShow = getYearTickValues(transformedData, showAllYears);

    transformedData.forEach((d) => {
      if (yearsToShow.includes(d.year)) {
        const x = (xScale(d.year) ?? 0) + xScale.bandwidth() / 2;
        yearsGroup
          .append('text')
          .attr('x', x)
          .attr('y', 12)
          .attr('text-anchor', 'middle')
          .attr('class', styles.yearLabel)
          .text(formatYearLabel(d.year));
      }
    });

    // X axis line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', innerHeight)
      .attr('y2', innerHeight)
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round');

    // === LINE 2: Governments ===
    const governmentsGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight + 22})`);

    const govSpans: GovernmentSpan[] = [];
    const processedGovs = new Set<string>();

    transformedData.forEach((d) => {
      if (d.isPrediction) return;
      const gov = getGovernmentForYear(d.year, governments);
      if (gov && !processedGovs.has(gov.name)) {
        const govYears = transformedData.filter(
          (point) => !point.isPrediction && getGovernmentForYear(point.year, governments)?.name === gov.name
        );
        
        if (govYears.length > 0) {
          const firstYear = govYears[0].year;
          const lastYear = govYears[govYears.length - 1].year;
          
          const startX = xScale(firstYear) ?? 0;
          const endX = (xScale(lastYear) ?? 0) + xScale.bandwidth();
          const spanWidth = endX - startX;
          
          const partyInfo = parties[gov.party];
          const color = partyInfo?.color || '#666';
          
          govSpans.push({
            gov,
            startX,
            endX,
            width: spanWidth,
            centerX: startX + spanWidth / 2,
            color,
            yearsCount: govYears.length,
          });
          
          processedGovs.add(gov.name);
        }
      }
    });

    govSpans.forEach((span) => {
      governmentsGroup
        .append('rect')
        .attr('x', span.startX)
        .attr('y', 0)
        .attr('width', span.width)
        .attr('height', 18)
        .attr('fill', span.color)
        .attr('opacity', 0.2)
        .attr('rx', 2);

      const labelWidth = span.gov.name.length * 6;
      const shouldRotate = span.width < labelWidth + 4;
      const showLabel = span.width >= minWidthForGovLabels || span.yearsCount >= 2;

      if (showLabel) {
        if (shouldRotate) {
          governmentsGroup
            .append('text')
            .attr('x', span.centerX)
            .attr('y', 9)
            .attr('text-anchor', 'start')
            .attr('transform', `rotate(-45, ${span.centerX}, 9)`)
            .attr('fill', span.color)
            .attr('class', styles.governmentLabelRotated)
            .text(span.gov.name);
        } else {
          governmentsGroup
            .append('text')
            .attr('x', span.centerX)
            .attr('y', 13)
            .attr('text-anchor', 'middle')
            .attr('fill', span.color)
            .attr('class', styles.governmentLabel)
            .text(span.gov.name);
        }
      }
    });

    // === LINE 3: Events ===
    const eventsGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight + 48})`);

    events.forEach((event) => {
      const x = (xScale(event.year) ?? 0) + xScale.bandwidth() / 2;
      if (xScale(event.year) !== undefined) {
        eventsGroup
          .append('text')
          .attr('x', x)
          .attr('y', 12)
          .attr('text-anchor', 'middle')
          .attr('class', styles.eventLabel)
          .text(event.name);
      }
    });

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => isPercentVariant ? `${d}%` : `${d} mld`);

    const yAxisGroup = g.append('g').call(yAxis);

    yAxisGroup.select('.domain')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round');

    yAxisGroup.selectAll('.tick line')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-linecap', 'round');

    yAxisGroup.selectAll('.tick text')
      .attr('class', styles.axisLabel);

  }, [transformedData, events, governments, parties, dimensions, isDeficitVariant, isPercentVariant]);

  const formatTooltipValue = (data: ChartDataPoint): string => {
    if (data.note === '?') return '?';
    if (isPercentVariant) {
      return `${data.amount.toFixed(1)} % HDP`;
    }
    return formatBillionsCzech(data.amount);
  };

  if (isLoading) {
    return (
      <section className={styles.container}>
        <p className={styles.loading}>Načítání grafu...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.container}>
        <p className={styles.error}>{error}</p>
      </section>
    );
  }

  const titleYears = activeVariant.startsWith('deficit-') ? '1994–2026' : '1993–2026';

  return (
    <section className={styles.container} ref={containerRef}>
      <h2 className={styles.chartTitle}>{variantInfo.name} ({titleYears})</h2>
      
      {/* Graph variant selector */}
      <div className={styles.variantSelector}>
        {GRAPH_VARIANTS.map((variant) => (
          <button
            key={variant.id}
            className={`${styles.variantButton} ${activeVariant === variant.id ? styles.variantButtonActive : ''}`}
            onClick={() => setActiveVariant(variant.id)}
            title={variant.description}
          >
            {variant.shortName}
          </button>
        ))}
      </div>

      <div className={styles.svgContainer}>
        <svg
          ref={svgRef}
          className={styles.chart}
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>
      
      {/* Tooltip */}
      <div
        className={`${styles.tooltip} ${tooltip.visible ? styles.visible : ''}`}
        style={{
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
        }}
      >
        {tooltip.data && (
          <>
            <div className={styles.tooltipYear}>
              {tooltip.data.year}
              {tooltip.data.isPrediction && ' (predikce)'}
            </div>
            <div className={styles.tooltipAmount}>
              {formatTooltipValue(tooltip.data)}
            </div>
            {tooltip.data.planName && (
              <div className={styles.tooltipPlan}>{tooltip.data.planName}</div>
            )}
          </>
        )}
      </div>

      {/* Budget plan switch */}
      <div className={styles.planSwitch}>
        <span className={styles.planSwitchLabel}>Rozpočet 2026:</span>
        <div className={styles.planButtons}>
          {budgetPlans.map((plan) => (
            <button
              key={plan.id}
              className={`${styles.planButton} ${activePlan === plan.id ? styles.planButtonActive : ''}`}
              style={{
                '--plan-color': plan.color,
              } as React.CSSProperties}
              onClick={() => setActivePlan(plan.id)}
            >
              {plan.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
