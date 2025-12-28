import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useHistoricalDebt } from '../../hooks/useHistoricalDebt';
import { formatCzechCurrency } from '../../utils/formatters';
import type { ChartDataPoint } from '../../types/debt';
import styles from './DebtChart.module.css';

const CHART_CONFIG = {
  marginTop: 20,
  marginRight: 20,
  marginBottom: 40,
  marginLeft: 60,
  barPadding: 0.2,
};

export function DebtChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: ChartDataPoint | null;
  }>({ visible: false, x: 0, y: 0, data: null });

  const { chartData, isLoading, error } = useHistoricalDebt();

  // Handle responsive sizing
  useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = Math.min(400, Math.max(300, width * 0.4));
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
            y: rect.top - containerRect.top - 10,
            data: d,
          });
        }
      })
      .on('mouseleave', () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
      });

    // X Axis
    const xAxis = d3.axisBottom(xScale).tickValues(
      chartData
        .filter((_, i) => i % 5 === 0 || i === chartData.length - 1)
        .map((d) => d.year)
    );

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('class', styles.axisLabel)
      .selectAll('line')
      .attr('class', styles.axisLine);

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d} mld`);

    g.append('g')
      .call(yAxis)
      .attr('class', styles.axisLabel)
      .selectAll('line')
      .attr('class', styles.axisLine);

  }, [chartData, dimensions]);

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
          transform: 'translate(-50%, -100%)',
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

