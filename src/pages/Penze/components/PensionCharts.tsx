/**
 * PensionCharts Component
 * 
 * D3.js visualizations for pension simulation results:
 * - PAYG Balance timeline (contributions vs benefits)
 * - Required contribution rate over time
 * - Dependency ratio over time
 */

import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { ScenarioResult, YearPoint } from '../../../types/pension';
import styles from './PensionCharts.module.css';

type ChartType = 'balance' | 'requiredRate' | 'dependencyRatio' | 'population';

interface PensionChartsProps {
  result: ScenarioResult;
}

interface ChartInfo {
  label: string;
  description: string;
}

const CHART_INFO: Record<ChartType, ChartInfo> = {
  balance: {
    label: 'Bilance PAYG',
    description: 'Rozdíl mezi příspěvky (zelená) a vyplacenými důchody (červená). Záporná bilance = deficit, který musí stát dofinancovat.',
  },
  requiredRate: {
    label: 'Požadovaná sazba',
    description: 'Jaká sazba pojistného by byla nutná pro vyrovnanou bilanci. Přerušovaná čára ukazuje současnou sazbu 20%.',
  },
  dependencyRatio: {
    label: 'Poměr závislosti',
    description: 'Počet důchodců na jednoho pracujícího. Čím vyšší poměr, tím větší zátěž pro systém a pracující.',
  },
  population: {
    label: 'Populace',
    description: 'Celkový počet obyvatel v čase. Závisí na plodnosti, úmrtnosti a migraci.',
  },
};

export function PensionCharts({ result }: PensionChartsProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('balance');
  const chartRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw chart when data or selection changes
  useEffect(() => {
    if (!chartRef.current || !containerRef.current || !result.points.length) {
      return;
    }

    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const width = Math.min(containerWidth, 800);
    const height = 350;
    const margin = { top: 30, right: 30, bottom: 50, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const points = result.points;
    const years = points.map((p) => p.year);

    // X scale (years)
    const xScale = d3
      .scaleLinear()
      .domain([d3.min(years)!, d3.max(years)!])
      .range([0, innerWidth]);

    // Draw based on chart type
    switch (activeChart) {
      case 'balance':
        drawBalanceChart(g, points, xScale, innerWidth, innerHeight);
        break;
      case 'requiredRate':
        drawRequiredRateChart(g, points, xScale, innerWidth, innerHeight);
        break;
      case 'dependencyRatio':
        drawDependencyRatioChart(g, points, xScale, innerWidth, innerHeight);
        break;
      case 'population':
        drawPopulationChart(g, points, xScale, innerWidth, innerHeight);
        break;
    }

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => d.toString())
          .ticks(Math.min(points.length, 10))
      )
      .selectAll('text')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '11px');

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .style('font-family', "'Source Sans 3', sans-serif")
      .style('font-size', '12px')
      .style('fill', '#6c757d')
      .text('Rok');
  }, [result, activeChart]);

  return (
    <div className={styles.container}>
      <div className={styles.chartTabs}>
        {(Object.keys(CHART_INFO) as ChartType[]).map((type) => (
          <button
            key={type}
            className={`${styles.tab} ${activeChart === type ? styles.tabActive : ''}`}
            onClick={() => setActiveChart(type)}
          >
            {CHART_INFO[type].label}
          </button>
        ))}
      </div>

      <p className={styles.chartDescription}>{CHART_INFO[activeChart].description}</p>

      <div ref={containerRef} className={styles.chartContainer}>
        <svg ref={chartRef} />
      </div>

      <SummaryCards result={result} />
    </div>
  );
}

/**
 * Draw PAYG balance chart (contributions vs benefits)
 */
function drawBalanceChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  xScale: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number
) {
  const maxVal = d3.max(points, (p) => Math.max(p.contrib, p.benefits)) || 1;

  const yScaleValues = d3
    .scaleLinear()
    .domain([0, maxVal * 1.1])
    .range([innerHeight, 0]);

  // Y axis
  g.append('g')
    .call(
      d3
        .axisLeft(yScaleValues)
        .tickFormat((d) => formatBillions(d as number))
        .ticks(6)
    )
    .selectAll('text')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '11px');

  // Y axis label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -60)
    .attr('x', -innerHeight / 2)
    .attr('text-anchor', 'middle')
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '12px')
    .style('fill', '#6c757d')
    .text('Mld. Kč');

  // Contributions line
  const contribLine = d3
    .line<YearPoint>()
    .x((d) => xScale(d.year))
    .y((d) => yScaleValues(d.contrib));

  g.append('path')
    .datum(points)
    .attr('fill', 'none')
    .attr('stroke', '#28a745')
    .attr('stroke-width', 2)
    .attr('d', contribLine);

  // Benefits line
  const benefitsLine = d3
    .line<YearPoint>()
    .x((d) => xScale(d.year))
    .y((d) => yScaleValues(d.benefits));

  g.append('path')
    .datum(points)
    .attr('fill', 'none')
    .attr('stroke', '#dc3545')
    .attr('stroke-width', 2)
    .attr('d', benefitsLine);

  // Legend
  const legend = g.append('g').attr('transform', `translate(${innerWidth - 120}, 10)`);

  legend
    .append('line')
    .attr('x1', 0)
    .attr('x2', 20)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', '#28a745')
    .attr('stroke-width', 2);
  legend
    .append('text')
    .attr('x', 25)
    .attr('y', 4)
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '11px')
    .text('Příspěvky');

  legend
    .append('line')
    .attr('x1', 0)
    .attr('x2', 20)
    .attr('y1', 20)
    .attr('y2', 20)
    .attr('stroke', '#dc3545')
    .attr('stroke-width', 2);
  legend
    .append('text')
    .attr('x', 25)
    .attr('y', 24)
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '11px')
    .text('Dávky');
}

/**
 * Draw required contribution rate chart
 */
function drawRequiredRateChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  xScale: d3.ScaleLinear<number, number>,
  _innerWidth: number,
  innerHeight: number
) {
  const maxRate = d3.max(points, (p) => p.requiredRate) || 0.5;

  const yScale = d3
    .scaleLinear()
    .domain([0, Math.min(maxRate * 1.2, 1)])
    .range([innerHeight, 0]);

  // Y axis
  g.append('g')
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => `${((d as number) * 100).toFixed(0)}%`)
        .ticks(6)
    )
    .selectAll('text')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '11px');

  // Y axis label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -50)
    .attr('x', -innerHeight / 2)
    .attr('text-anchor', 'middle')
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '12px')
    .style('fill', '#6c757d')
    .text('Požadovaná sazba');

  // Area fill
  const area = d3
    .area<YearPoint>()
    .x((d) => xScale(d.year))
    .y0(innerHeight)
    .y1((d) => yScale(d.requiredRate));

  g.append('path')
    .datum(points)
    .attr('fill', 'rgba(196, 30, 58, 0.2)')
    .attr('d', area);

  // Line
  const line = d3
    .line<YearPoint>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.requiredRate));

  g.append('path')
    .datum(points)
    .attr('fill', 'none')
    .attr('stroke', '#c41e3a')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Reference line for current rate (20%)
  const currentRate = 0.2;
  if (currentRate < maxRate * 1.2) {
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(currentRate))
      .attr('y2', yScale(currentRate))
      .attr('stroke', '#6c757d')
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 1);

    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', yScale(currentRate) - 5)
      .attr('text-anchor', 'end')
      .style('font-family', "'Source Sans 3', sans-serif")
      .style('font-size', '10px')
      .style('fill', '#6c757d')
      .text('Současná sazba');
  }
}

/**
 * Draw dependency ratio chart
 */
function drawDependencyRatioChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  xScale: d3.ScaleLinear<number, number>,
  _innerWidth: number,
  innerHeight: number
) {
  const maxRatio = d3.max(points, (p) => p.dependencyRatio) || 1;

  const yScale = d3
    .scaleLinear()
    .domain([0, maxRatio * 1.2])
    .range([innerHeight, 0]);

  // Y axis
  g.append('g')
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => (d as number).toFixed(2))
        .ticks(6)
    )
    .selectAll('text')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '11px');

  // Y axis label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -50)
    .attr('x', -innerHeight / 2)
    .attr('text-anchor', 'middle')
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '12px')
    .style('fill', '#6c757d')
    .text('Důchodci / Pracující');

  // Area fill
  const area = d3
    .area<YearPoint>()
    .x((d) => xScale(d.year))
    .y0(innerHeight)
    .y1((d) => yScale(d.dependencyRatio));

  g.append('path')
    .datum(points)
    .attr('fill', 'rgba(0, 123, 255, 0.2)')
    .attr('d', area);

  // Line
  const line = d3
    .line<YearPoint>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.dependencyRatio));

  g.append('path')
    .datum(points)
    .attr('fill', 'none')
    .attr('stroke', '#007bff')
    .attr('stroke-width', 2)
    .attr('d', line);
}

/**
 * Draw population chart
 */
function drawPopulationChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  xScale: d3.ScaleLinear<number, number>,
  _innerWidth: number,
  innerHeight: number
) {
  const maxPop = d3.max(points, (p) => p.totalPop) || 1;

  const yScale = d3
    .scaleLinear()
    .domain([0, maxPop * 1.1])
    .range([innerHeight, 0]);

  // Y axis
  g.append('g')
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => formatThousands(d as number))
        .ticks(6)
    )
    .selectAll('text')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '11px');

  // Y axis label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -60)
    .attr('x', -innerHeight / 2)
    .attr('text-anchor', 'middle')
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '12px')
    .style('fill', '#6c757d')
    .text('Populace');

  // Area fill
  const area = d3
    .area<YearPoint>()
    .x((d) => xScale(d.year))
    .y0(innerHeight)
    .y1((d) => yScale(d.totalPop));

  g.append('path')
    .datum(points)
    .attr('fill', 'rgba(108, 117, 125, 0.2)')
    .attr('d', area);

  // Line
  const line = d3
    .line<YearPoint>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.totalPop));

  g.append('path')
    .datum(points)
    .attr('fill', 'none')
    .attr('stroke', '#6c757d')
    .attr('stroke-width', 2)
    .attr('d', line);
}

/**
 * Summary cards showing key metrics
 */
function SummaryCards({ result }: { result: ScenarioResult }) {
  const firstPoint = result.points[0];
  const lastPoint = result.points[result.points.length - 1];
  const midIndex = Math.floor(result.points.length / 2);
  const midPoint = result.points[midIndex];

  const metrics = [
    {
      label: 'Rok',
      start: firstPoint.year.toString(),
      mid: midPoint.year.toString(),
      end: lastPoint.year.toString(),
    },
    {
      label: 'Populace',
      start: formatThousands(firstPoint.totalPop),
      mid: formatThousands(midPoint.totalPop),
      end: formatThousands(lastPoint.totalPop),
    },
    {
      label: 'Důchodci',
      start: formatThousands(firstPoint.pensioners),
      mid: formatThousands(midPoint.pensioners),
      end: formatThousands(lastPoint.pensioners),
    },
    {
      label: 'Bilance',
      start: formatBillions(firstPoint.balance),
      mid: formatBillions(midPoint.balance),
      end: formatBillions(lastPoint.balance),
      isBalance: true,
    },
    {
      label: 'Pož. sazba',
      start: formatPercent(firstPoint.requiredRate),
      mid: formatPercent(midPoint.requiredRate),
      end: formatPercent(lastPoint.requiredRate),
    },
  ];

  return (
    <div className={styles.summaryCards}>
      <table className={styles.summaryTable}>
        <thead>
          <tr>
            <th>Ukazatel</th>
            <th>{firstPoint.year}</th>
            <th>{midPoint.year}</th>
            <th>{lastPoint.year}</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.label}>
              <td>{m.label}</td>
              <td className={m.isBalance && parseFloat(m.start) < 0 ? styles.negative : ''}>
                {m.start}
              </td>
              <td className={m.isBalance && parseFloat(m.mid) < 0 ? styles.negative : ''}>
                {m.mid}
              </td>
              <td className={m.isBalance && parseFloat(m.end) < 0 ? styles.negative : ''}>
                {m.end}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Formatting helpers
function formatBillions(value: number): string {
  const billions = value / 1_000_000_000;
  if (Math.abs(billions) >= 1) {
    return `${billions.toFixed(1)} mld`;
  }
  const millions = value / 1_000_000;
  return `${millions.toFixed(0)} mil`;
}

function formatThousands(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} mil`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} tis`;
  }
  return value.toFixed(0);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
