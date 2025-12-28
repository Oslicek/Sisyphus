import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useHistoricalDebt } from '../../hooks/useHistoricalDebt';
import { formatBillionsCzech } from '../../utils/formatters';
import { formatYearLabel, getGovernmentForYear } from '../../utils/chartHelpers';
import type { ChartDataPoint, Government, BudgetPlan } from '../../types/debt';
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

interface DebtChartProps {
  selectedPlanId?: string;
  onPlanChange?: (planId: string) => void;
}

export function DebtChart({ selectedPlanId = 'fiala', onPlanChange }: DebtChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: ChartDataPoint | null;
  }>({ visible: false, x: 0, y: 0, data: null });
  const [activePlan, setActivePlan] = useState(selectedPlanId);

  const { chartData, events, governments, parties, budgetPlans, isLoading, error } = useHistoricalDebt();

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
  const getChartDataWithPrediction = (): ChartDataPoint[] => {
    if (chartData.length === 0 || budgetPlans.length === 0) return chartData;

    const plan = budgetPlans.find((p) => p.id === activePlan);
    if (!plan) return chartData;

    const prediction2026 = plan.predictions.find((p) => p.year === 2026);
    if (!prediction2026) return chartData;

    // Get 2025 value as base
    const debt2025 = chartData.find((d) => d.year === 2025);
    if (!debt2025) return chartData;

    // Calculate 2026 debt: 2025 debt + 2026 deficit (convert to billions)
    const deficit2026InBillions = prediction2026.deficit / 1_000_000_000;
    const debt2026 = debt2025.amount + deficit2026InBillions;

    return [
      ...chartData,
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

  const fullChartData = getChartDataWithPrediction();

  // Draw chart with D3
  useEffect(() => {
    if (!svgRef.current || fullChartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const { marginTop, marginRight, marginBottom, marginLeft, barPadding, minBarWidthForAllYears, minWidthForGovLabels } = CHART_CONFIG;
    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    // Scales
    const xScale = d3
      .scaleBand<number>()
      .domain(fullChartData.map((d) => d.year))
      .range([0, innerWidth])
      .padding(barPadding);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(fullChartData, (d) => d.amount) ?? 0])
      .nice()
      .range([innerHeight, 0]);

    const barWidth = xScale.bandwidth();
    const showAllYears = barWidth >= minBarWidthForAllYears;

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

    // Bars
    g.selectAll('rect.bar')
      .data(fullChartData)
      .join('rect')
      .attr('class', (d) => d.isPrediction ? styles.barPrediction : styles.bar)
      .attr('x', (d) => xScale(d.year) ?? 0)
      .attr('y', (d) => yScale(d.amount))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.amount))
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

    const yearsToShow = getYearTickValues(fullChartData, showAllYears);

    fullChartData.forEach((d) => {
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

    fullChartData.forEach((d) => {
      if (d.isPrediction) return; // Skip prediction year for governments
      const gov = getGovernmentForYear(d.year, governments);
      if (gov && !processedGovs.has(gov.name)) {
        const govYears = fullChartData.filter(
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
      .tickFormat((d) => `${d} mld`);

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

  }, [fullChartData, events, governments, parties, dimensions]);

  const handlePlanChange = (planId: string) => {
    setActivePlan(planId);
    onPlanChange?.(planId);
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

  // Find current plan for tooltip
  const currentPlan = budgetPlans.find((p) => p.id === activePlan);

  return (
    <section className={styles.container} ref={containerRef}>
      <h2 className={styles.chartTitle}>Vývoj státního dluhu (1993–2026)</h2>
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
              {tooltip.data.note === '?' ? '?' : formatBillionsCzech(tooltip.data.amount)}
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
              onClick={() => handlePlanChange(plan.id)}
            >
              {plan.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
