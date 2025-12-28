import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useHistoricalDebt } from '../../hooks/useHistoricalDebt';
import { formatCzechCurrency } from '../../utils/formatters';
import { formatYearLabel, getGovernmentForYear } from '../../utils/chartHelpers';
import type { ChartDataPoint } from '../../types/debt';
import styles from './DebtChart.module.css';

const CHART_CONFIG = {
  marginTop: 20,
  marginRight: 20,
  marginBottom: 100, // Increased for 3-line axis
  marginLeft: 60,
  barPadding: 0.2,
};

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

  const { chartData, events, governments, parties, isLoading, error } = useHistoricalDebt();

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

  // Draw chart with D3
  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const { marginTop, marginRight, marginBottom, marginLeft, barPadding } = CHART_CONFIG;
    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    // Scales
    const xScale = d3
      .scaleBand<number>()
      .domain(chartData.map((d) => d.year))
      .range([0, innerWidth])
      .padding(barPadding);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => d.amount) ?? 0])
      .nice()
      .range([innerHeight, 0]);

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
    g.selectAll('rect')
      .data(chartData)
      .join('rect')
      .attr('class', styles.bar)
      .attr('x', (d) => xScale(d.year) ?? 0)
      .attr('y', (d) => yScale(d.amount))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.amount))
      .on('mouseenter', (event, d) => {
        const rect = event.target.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setTooltip({
            visible: true,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + 10,
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

    chartData.forEach((d) => {
      const x = (xScale(d.year) ?? 0) + xScale.bandwidth() / 2;
      yearsGroup
        .append('text')
        .attr('x', x)
        .attr('y', 12)
        .attr('text-anchor', 'middle')
        .attr('class', styles.yearLabel)
        .text(formatYearLabel(d.year));
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

    // === LINE 2: Events ===
    const eventsGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight + 25})`);

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

    // === LINE 3: Governments ===
    const governmentsGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight + 45})`);

    // Track which governments we've already labeled to avoid duplicates
    const labeledGovernments = new Set<string>();

    chartData.forEach((d) => {
      const gov = getGovernmentForYear(d.year, governments);
      if (gov && !labeledGovernments.has(gov.name)) {
        // Find all years for this government
        const govYears = chartData.filter(
          (point) => getGovernmentForYear(point.year, governments)?.name === gov.name
        );
        
        if (govYears.length > 0) {
          const firstYear = govYears[0].year;
          const lastYear = govYears[govYears.length - 1].year;
          
          const startX = xScale(firstYear) ?? 0;
          const endX = (xScale(lastYear) ?? 0) + xScale.bandwidth();
          const centerX = startX + (endX - startX) / 2;
          
          const partyInfo = parties[gov.party];
          const color = partyInfo?.color || '#666';
          
          // Background bar for government
          governmentsGroup
            .append('rect')
            .attr('x', startX)
            .attr('y', 0)
            .attr('width', endX - startX)
            .attr('height', 18)
            .attr('fill', color)
            .attr('opacity', 0.15)
            .attr('rx', 2);
          
          // Government name
          governmentsGroup
            .append('text')
            .attr('x', centerX)
            .attr('y', 13)
            .attr('text-anchor', 'middle')
            .attr('fill', color)
            .attr('class', styles.governmentLabel)
            .text(gov.name);
          
          labeledGovernments.add(gov.name);
        }
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

  }, [chartData, events, governments, parties, dimensions]);

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

  return (
    <section className={styles.container} ref={containerRef}>
      <h2 className={styles.chartTitle}>Vývoj státního dluhu (1993–2025)</h2>
      <div className={styles.svgContainer}>
        <svg
          ref={svgRef}
          className={styles.chart}
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>
      <div
        className={`${styles.tooltip} ${tooltip.visible ? styles.visible : ''}`}
        style={{
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, 0)',
        }}
      >
        {tooltip.data && (
          <>
            <div className={styles.tooltipYear}>{tooltip.data.year}</div>
            <div className={styles.tooltipAmount}>
              {formatCzechCurrency(tooltip.data.amount * 1_000_000_000)} Kč
            </div>
          </>
        )}
      </div>
    </section>
  );
}
