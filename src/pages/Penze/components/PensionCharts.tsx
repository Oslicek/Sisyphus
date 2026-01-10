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
import { PopulationPyramid } from './PopulationPyramid';
import styles from './PensionCharts.module.css';

type ChartType = 'balance' | 'requiredRate' | 'dependencyRatio' | 'workersPerPensioner' | 'population' | 'requiredRetAge' | 'requiredPensionRatio' | 'lifetimeAccount' | 'generationalAccount' | 'pyramid';

interface PensionChartsProps {
  result: ScenarioResult;
  mode?: 'balance' | 'equilibrium';
  contribRate?: number;
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
    description: 'Jaká sazba pojistného by byla nutná pro vyrovnanou bilanci. Přerušovaná čára ukazuje nastavenou sazbu.',
  },
  dependencyRatio: {
    label: 'Poměr závislosti',
    description: 'Počet důchodců na jednoho pracujícího. Čím vyšší poměr, tím větší zátěž pro systém a pracující.',
  },
  workersPerPensioner: {
    label: 'Pracujících na důchodce',
    description: 'Kolik pracujících živí jednoho důchodce. AHA moment: "V roce 2050 bude na každého důchodce pracovat jen 1,4 člověka."',
  },
  population: {
    label: 'Populace',
    description: 'Celkový počet obyvatel v čase. Závisí na plodnosti, úmrtnosti a migraci.',
  },
  requiredRetAge: {
    label: 'Požadovaný věk',
    description: 'Jaký věk odchodu do důchodu by byl nutný pro vyrovnanou bilanci při daném náhradovém poměru.',
  },
  requiredPensionRatio: {
    label: 'Požadovaný poměr',
    description: 'Jaký náhradový poměr (důchod/mzda) by byl nutný pro vyrovnanou bilanci při daném věku odchodu.',
  },
  lifetimeAccount: {
    label: 'Osobní účet',
    description: 'AHA graf: Kolik za život odvedete na pojistném (zelená) vs. kolik dostanete na důchodech (modrá). PAYG není spoření – vaše peníze jdou současným důchodcům.',
  },
  generationalAccount: {
    label: 'Generační účet',
    description: 'AHA graf: Odhad celoživotní bilance (důchod − příspěvky) pro různé generace. Zahrnuje historické i budoucí příspěvky. Záporná hodnota = odvedete víc, než dostanete.',
  },
  pyramid: {
    label: 'Populační pyramida',
    description: 'Věková struktura populace podle pohlaví. Posuvníkem pod grafem můžete procházet jednotlivé roky simulace.',
  },
};

// Charts shown in each mode
const BALANCE_CHARTS: ChartType[] = ['balance', 'requiredRate', 'workersPerPensioner', 'lifetimeAccount', 'generationalAccount', 'population', 'pyramid'];
const EQUILIBRIUM_CHARTS: ChartType[] = ['requiredRetAge', 'requiredPensionRatio', 'requiredRate', 'workersPerPensioner', 'lifetimeAccount', 'generationalAccount', 'pyramid'];

export function PensionCharts({ result, mode = 'balance', contribRate = 0.2 }: PensionChartsProps) {
  const availableCharts = mode === 'equilibrium' ? EQUILIBRIUM_CHARTS : BALANCE_CHARTS;
  const [activeChart, setActiveChart] = useState<ChartType>(availableCharts[0]);
  const chartRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset to first chart when mode changes
  useEffect(() => {
    setActiveChart(availableCharts[0]);
  }, [mode]);

  // Draw chart when data or selection changes (skip for pyramid - it has its own component)
  useEffect(() => {
    if (activeChart === 'pyramid') {
      return;
    }
    
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
        drawRequiredRateChart(g, points, xScale, innerWidth, innerHeight, contribRate);
        break;
      case 'dependencyRatio':
        drawDependencyRatioChart(g, points, xScale, innerWidth, innerHeight);
        break;
      case 'workersPerPensioner':
        drawWorkersPerPensionerChart(g, points, xScale, innerWidth, innerHeight);
        break;
      case 'population':
        drawPopulationChart(g, points, xScale, innerWidth, innerHeight);
        break;
      case 'requiredRetAge':
        drawRequiredRetAgeChart(g, points, xScale, innerWidth, innerHeight);
        break;
      case 'requiredPensionRatio':
        drawRequiredPensionRatioChart(g, points, xScale, innerWidth, innerHeight);
        break;
      case 'lifetimeAccount':
        drawLifetimeAccountChart(g, points, xScale, innerWidth, innerHeight, contribRate);
        break;
      case 'generationalAccount':
        drawGenerationalAccountChart(g, points, xScale, innerWidth, innerHeight, result.baseYear, contribRate);
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
        {availableCharts.map((type) => (
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

      {activeChart === 'pyramid' ? (
        <PopulationPyramid
          pyramids={result.pyramids}
          baseYear={result.baseYear}
          horizonYears={result.horizonYears}
        />
      ) : (
        <div ref={containerRef} className={styles.chartContainer}>
          <svg ref={chartRef} />
        </div>
      )}

      <SummaryCards result={result} mode={mode} />
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
  innerWidth: number,
  innerHeight: number,
  currentRate: number = 0.2
) {
  const maxRate = d3.max(points, (p) => p.requiredRate) || 0.5;

  const yScale = d3
    .scaleLinear()
    .domain([0, Math.min(Math.max(maxRate * 1.2, currentRate * 1.5), 1)])
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

  // Reference line for current/set rate
  if (currentRate < Math.max(maxRate * 1.2, currentRate * 1.5)) {
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(currentRate))
      .attr('y2', yScale(currentRate))
      .attr('stroke', '#28a745')
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 2);

    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', yScale(currentRate) - 5)
      .attr('text-anchor', 'end')
      .style('font-family', "'Source Sans 3', sans-serif")
      .style('font-size', '10px')
      .style('fill', '#28a745')
      .text(`Nastavená sazba ${(currentRate * 100).toFixed(0)}%`);
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
 * Draw required retirement age chart
 */
function drawRequiredRetAgeChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  xScale: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number
) {
  const validPoints = points.filter(p => p.requiredRetAge !== null);
  
  if (validPoints.length === 0) {
    // No valid data - show message
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight / 2)
      .attr('text-anchor', 'middle')
      .style('font-family', "'Source Sans 3', sans-serif")
      .style('font-size', '14px')
      .style('fill', '#dc3545')
      .text('Nelze dosáhnout rovnováhy (i při max. věku odchodu)');
    return;
  }

  const ages = validPoints.map(p => p.requiredRetAge!);
  const minAge = Math.min(50, d3.min(ages)! - 2);
  const maxAge = Math.max(80, d3.max(ages)! + 2);

  const yScale = d3
    .scaleLinear()
    .domain([minAge, maxAge])
    .range([innerHeight, 0]);

  // Y axis
  g.append('g')
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => `${(d as number).toFixed(0)} let`)
        .ticks(6)
    )
    .selectAll('text')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '11px');

  // Y axis label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -55)
    .attr('x', -innerHeight / 2)
    .attr('text-anchor', 'middle')
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '12px')
    .style('fill', '#6c757d')
    .text('Věk odchodu do důchodu');

  // Area fill
  const area = d3
    .area<YearPoint>()
    .x((d) => xScale(d.year))
    .y0(innerHeight)
    .y1((d) => yScale(d.requiredRetAge!))
    .defined((d) => d.requiredRetAge !== null);

  g.append('path')
    .datum(validPoints)
    .attr('fill', 'rgba(255, 152, 0, 0.2)')
    .attr('d', area);

  // Line
  const line = d3
    .line<YearPoint>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.requiredRetAge!))
    .defined((d) => d.requiredRetAge !== null);

  g.append('path')
    .datum(validPoints)
    .attr('fill', 'none')
    .attr('stroke', '#ff9800')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Reference line for typical retirement age (65)
  g.append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', yScale(65))
    .attr('y2', yScale(65))
    .attr('stroke', '#6c757d')
    .attr('stroke-dasharray', '5,5')
    .attr('stroke-width', 1);

  g.append('text')
    .attr('x', innerWidth - 5)
    .attr('y', yScale(65) - 5)
    .attr('text-anchor', 'end')
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '10px')
    .style('fill', '#6c757d')
    .text('Typický věk 65 let');
}

/**
 * Draw required pension/wage ratio chart
 */
function drawRequiredPensionRatioChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  xScale: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number
) {
  const validPoints = points.filter(p => p.requiredPensionRatio !== null);
  
  if (validPoints.length === 0) {
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight / 2)
      .attr('text-anchor', 'middle')
      .style('font-family', "'Source Sans 3', sans-serif")
      .style('font-size', '14px')
      .style('fill', '#dc3545')
      .text('Nelze dosáhnout rovnováhy');
    return;
  }

  const ratios = validPoints.map(p => p.requiredPensionRatio!);
  const maxRatio = Math.min(d3.max(ratios)! * 1.2, 1);

  const yScale = d3
    .scaleLinear()
    .domain([0, maxRatio])
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
    .text('Náhradový poměr (důchod / mzda)');

  // Area fill
  const area = d3
    .area<YearPoint>()
    .x((d) => xScale(d.year))
    .y0(innerHeight)
    .y1((d) => yScale(d.requiredPensionRatio!))
    .defined((d) => d.requiredPensionRatio !== null);

  g.append('path')
    .datum(validPoints)
    .attr('fill', 'rgba(156, 39, 176, 0.2)')
    .attr('d', area);

  // Line
  const line = d3
    .line<YearPoint>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.requiredPensionRatio!))
    .defined((d) => d.requiredPensionRatio !== null);

  g.append('path')
    .datum(validPoints)
    .attr('fill', 'none')
    .attr('stroke', '#9c27b0')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Reference line for typical ratio (45%)
  const typicalRatio = 0.45;
  if (typicalRatio < maxRatio) {
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(typicalRatio))
      .attr('y2', yScale(typicalRatio))
      .attr('stroke', '#6c757d')
      .attr('stroke-dasharray', '5,5')
      .attr('stroke-width', 1);

    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', yScale(typicalRatio) - 5)
      .attr('text-anchor', 'end')
      .style('font-family', "'Source Sans 3', sans-serif")
      .style('font-size', '10px')
      .style('fill', '#6c757d')
      .text('Typický poměr 45%');
  }
}

/**
 * Draw workers per pensioner chart (inverse of dependency ratio - more intuitive)
 */
function drawWorkersPerPensionerChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  xScale: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number
) {
  const workers = points.map(p => p.workersPerPensioner);
  const maxWorkers = Math.min(d3.max(workers)! * 1.2, 10);
  const minWorkers = Math.max(d3.min(workers)! * 0.8, 0);

  const yScale = d3
    .scaleLinear()
    .domain([minWorkers, maxWorkers])
    .range([innerHeight, 0]);

  // Y axis
  g.append('g')
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => (d as number).toFixed(1))
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
    .text('Pracujících na 1 důchodce');

  // Area fill with warning gradient
  const area = d3
    .area<YearPoint>()
    .x((d) => xScale(d.year))
    .y0(innerHeight)
    .y1((d) => yScale(d.workersPerPensioner));

  // Gradient from green (good) to red (bad)
  const gradient = g.append('defs')
    .append('linearGradient')
    .attr('id', 'workers-gradient')
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '0%')
    .attr('y2', '0%');

  gradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(220, 53, 69, 0.3)');
  gradient.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(255, 193, 7, 0.3)');
  gradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(40, 167, 69, 0.3)');

  g.append('path')
    .datum(points)
    .attr('fill', 'url(#workers-gradient)')
    .attr('d', area);

  // Line
  const line = d3
    .line<YearPoint>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.workersPerPensioner));

  g.append('path')
    .datum(points)
    .attr('fill', 'none')
    .attr('stroke', '#1976d2')
    .attr('stroke-width', 2.5)
    .attr('d', line);

  // Critical threshold lines
  const criticalLevels = [
    { value: 2, label: 'Kritická hranice', color: '#dc3545' },
    { value: 3, label: 'Udržitelná', color: '#28a745' },
  ];

  criticalLevels.forEach(level => {
    if (level.value >= minWorkers && level.value <= maxWorkers) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(level.value))
        .attr('y2', yScale(level.value))
        .attr('stroke', level.color)
        .attr('stroke-dasharray', '5,5')
        .attr('stroke-width', 1);

      g.append('text')
        .attr('x', 5)
        .attr('y', yScale(level.value) - 5)
        .style('font-family', "'Source Sans 3', sans-serif")
        .style('font-size', '10px')
        .style('fill', level.color)
        .text(level.label);
    }
  });

  // Add data labels at start, mid, end
  const labelPoints = [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]];
  labelPoints.forEach(p => {
    g.append('circle')
      .attr('cx', xScale(p.year))
      .attr('cy', yScale(p.workersPerPensioner))
      .attr('r', 4)
      .attr('fill', '#1976d2');

    g.append('text')
      .attr('x', xScale(p.year))
      .attr('y', yScale(p.workersPerPensioner) - 10)
      .attr('text-anchor', 'middle')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#1976d2')
      .text(p.workersPerPensioner.toFixed(1));
  });
}

/**
 * Draw lifetime account chart (contributions vs pensions over a lifetime)
 */
function drawLifetimeAccountChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  xScale: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number,
  contribRate: number
) {
  // Model a person born 25 years before base year, retiring at 65
  const baseYear = points[0].year;
  const birthYear = baseYear - 25; // Person is 25 at start of simulation
  const workStartAge = 20;
  const retAge = 65;
  
  // Build cumulative data
  let cumulativeContrib = 0;
  let cumulativePension = 0;
  
  // Pre-simulation working years (before projection starts)
  const preWorkYears = Math.min(5, baseYear - birthYear - workStartAge);
  if (preWorkYears > 0) {
    cumulativeContrib = points[0].avgWage * contribRate * preWorkYears;
  }
  
  const lifetimeData = points.map(p => {
    const age = p.year - birthYear;
    
    if (age >= workStartAge && age < retAge) {
      cumulativeContrib += p.avgWage * contribRate;
    }
    if (age >= retAge) {
      cumulativePension += p.avgPension;
    }
    
    return {
      year: p.year,
      age,
      cumulativeContrib,
      cumulativePension,
      balance: cumulativePension - cumulativeContrib,
    };
  });

  const maxValue = d3.max(lifetimeData, d => Math.max(d.cumulativeContrib, d.cumulativePension)) || 1;

  const yScale = d3
    .scaleLinear()
    .domain([0, maxValue * 1.1])
    .range([innerHeight, 0]);

  // Y axis
  g.append('g')
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => {
          const val = d as number;
          if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
          if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
          return val.toFixed(0);
        })
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
    .text('Kumulativní částka (Kč)');

  // Area for contributions
  const contribArea = d3
    .area<typeof lifetimeData[0]>()
    .x((d) => xScale(d.year))
    .y0(innerHeight)
    .y1((d) => yScale(d.cumulativeContrib));

  g.append('path')
    .datum(lifetimeData)
    .attr('fill', 'rgba(40, 167, 69, 0.3)')
    .attr('d', contribArea);

  // Line for contributions
  const contribLine = d3
    .line<typeof lifetimeData[0]>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.cumulativeContrib));

  g.append('path')
    .datum(lifetimeData)
    .attr('fill', 'none')
    .attr('stroke', '#28a745')
    .attr('stroke-width', 2)
    .attr('d', contribLine);

  // Line for pensions
  const pensionLine = d3
    .line<typeof lifetimeData[0]>()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.cumulativePension));

  g.append('path')
    .datum(lifetimeData)
    .attr('fill', 'none')
    .attr('stroke', '#1976d2')
    .attr('stroke-width', 2)
    .attr('d', pensionLine);

  // Retirement age marker
  const retirementYear = birthYear + retAge;
  if (retirementYear >= points[0].year && retirementYear <= points[points.length - 1].year) {
    g.append('line')
      .attr('x1', xScale(retirementYear))
      .attr('x2', xScale(retirementYear))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#6c757d')
      .attr('stroke-dasharray', '5,5');

    g.append('text')
      .attr('x', xScale(retirementYear) + 5)
      .attr('y', 15)
      .style('font-family', "'Source Sans 3', sans-serif")
      .style('font-size', '10px')
      .style('fill', '#6c757d')
      .text('Odchod do důchodu');
  }

  // Legend
  const legend = g.append('g').attr('transform', `translate(${innerWidth - 150}, 10)`);
  
  legend.append('rect').attr('x', 0).attr('y', 0).attr('width', 15).attr('height', 15).attr('fill', '#28a745');
  legend.append('text').attr('x', 20).attr('y', 12).style('font-size', '11px').text('Odvedeno');
  
  legend.append('rect').attr('x', 0).attr('y', 20).attr('width', 15).attr('height', 15).attr('fill', '#1976d2');
  legend.append('text').attr('x', 20).attr('y', 32).style('font-size', '11px').text('Vyplaceno');

  // Final balance annotation
  const lastData = lifetimeData[lifetimeData.length - 1];
  const balanceText = lastData.balance >= 0 
    ? `+${(lastData.balance / 1_000_000).toFixed(1)}M (zisk)` 
    : `${(lastData.balance / 1_000_000).toFixed(1)}M (ztráta)`;
  
  g.append('text')
    .attr('x', innerWidth - 10)
    .attr('y', innerHeight - 10)
    .attr('text-anchor', 'end')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', lastData.balance >= 0 ? '#28a745' : '#dc3545')
    .text(`Bilance: ${balanceText}`);
}

/**
 * Draw generational account chart (lifetime balance by birth year)
 * NOW includes estimated HISTORICAL contributions/pensions before simulation!
 */
function drawGenerationalAccountChart(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  points: YearPoint[],
  _xScale: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number,
  _baseYear: number,
  contribRate: number
) {
  // Generate birth cohorts from 1950 to 2010
  const birthYears = [];
  for (let y = 1950; y <= 2010; y += 10) {
    birthYears.push(y);
  }

  const workStartAge = 20;
  const retAge = 65;
  const lifeExpectancy = 82;
  const historicalWageGrowth = 0.02; // 2% real wage growth historically
  const historicalContribRate = 0.25; // Historical contribution rate was ~25%
  
  const baseYear = points[0].year;
  const baseWage = points[0].avgWage;
  const basePension = points[0].avgPension;
  const lastPoint = points[points.length - 1];
  const lastYear = lastPoint.year;

  // Calculate generational accounts WITH HISTORICAL DATA
  const accounts = birthYears.map(birthYear => {
    let totalContrib = 0;
    let totalPension = 0;
    
    const workStartYear = birthYear + workStartAge;
    const retireYear = birthYear + retAge;
    const deathYear = birthYear + lifeExpectancy;
    
    // =========================================
    // 1. HISTORICAL period (before baseYear)
    // =========================================
    
    // Historical working years (before projection)
    const historicalWorkStart = Math.max(workStartYear, 1950);
    const historicalWorkEnd = Math.min(retireYear, baseYear);
    
    if (historicalWorkEnd > historicalWorkStart) {
      for (let year = historicalWorkStart; year < historicalWorkEnd; year++) {
        // Estimate historical wage by backward extrapolation
        const yearsBeforeBase = baseYear - year;
        const historicalWage = baseWage / Math.pow(1 + historicalWageGrowth, yearsBeforeBase);
        totalContrib += historicalWage * historicalContribRate;
      }
    }
    
    // Historical pension years (if already retired before projection)
    const historicalRetStart = Math.max(retireYear, 1990);
    const historicalRetEnd = Math.min(deathYear, baseYear);
    
    if (historicalRetEnd > historicalRetStart) {
      for (let year = historicalRetStart; year < historicalRetEnd; year++) {
        // Estimate historical pension (pensions grow slower than wages)
        const yearsBeforeBase = baseYear - year;
        const historicalPension = basePension / Math.pow(1 + historicalWageGrowth * 0.7, yearsBeforeBase);
        totalPension += historicalPension;
      }
    }
    
    // =========================================
    // 2. PROJECTION period (within points[])
    // =========================================
    
    for (const p of points) {
      const age = p.year - birthYear;
      
      if (age >= workStartAge && age < retAge) {
        totalContrib += p.avgWage * contribRate;
      }
      if (age >= retAge && age <= lifeExpectancy) {
        totalPension += p.avgPension;
      }
    }
    
    // =========================================
    // 3. FUTURE period (after projection ends)
    // =========================================
    
    const lastAge = lastYear - birthYear;
    
    // Extrapolate remaining working years
    if (lastAge < retAge && lastAge >= workStartAge) {
      const remainingWorkYears = retAge - lastAge - 1;
      totalContrib += lastPoint.avgWage * contribRate * remainingWorkYears;
    }
    
    // Extrapolate retirement years
    if (lastAge >= retAge) {
      const remainingRetYears = lifeExpectancy - lastAge;
      if (remainingRetYears > 0) {
        totalPension += lastPoint.avgPension * remainingRetYears;
      }
    } else if (lastAge < retAge) {
      // Person hasn't retired yet - extrapolate full retirement
      const retYears = lifeExpectancy - retAge;
      if (retYears > 0) {
        totalPension += lastPoint.avgPension * retYears;
      }
    }
    
    return {
      birthYear,
      totalContrib,
      totalPension,
      balance: totalPension - totalContrib,
    };
  });

  // X scale for birth years
  const xScaleBirth = d3
    .scaleBand<number>()
    .domain(birthYears)
    .range([0, innerWidth])
    .padding(0.3);

  // Y scale for balance
  const maxAbs = d3.max(accounts, d => Math.abs(d.balance)) || 1;
  const yScale = d3
    .scaleLinear()
    .domain([-maxAbs * 1.2, maxAbs * 1.2])
    .range([innerHeight, 0]);

  // Y axis
  g.append('g')
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => {
          const val = d as number;
          if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
          return `${(val / 1_000).toFixed(0)}k`;
        })
        .ticks(8)
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
    .text('Celoživotní bilance (Kč)');

  // X axis
  g.append('g')
    .attr('transform', `translate(0,${yScale(0)})`)
    .call(d3.axisBottom(xScaleBirth).tickFormat(d => d.toString()))
    .selectAll('text')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '11px');

  // Zero line
  g.append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', yScale(0))
    .attr('y2', yScale(0))
    .attr('stroke', '#6c757d')
    .attr('stroke-width', 1);

  // Bars
  g.selectAll('.bar')
    .data(accounts)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScaleBirth(d.birthYear)!)
    .attr('width', xScaleBirth.bandwidth())
    .attr('y', d => d.balance >= 0 ? yScale(d.balance) : yScale(0))
    .attr('height', d => Math.abs(yScale(d.balance) - yScale(0)))
    .attr('fill', d => d.balance >= 0 ? '#28a745' : '#dc3545')
    .attr('opacity', 0.8);

  // Value labels on bars
  g.selectAll('.bar-label')
    .data(accounts)
    .enter()
    .append('text')
    .attr('class', 'bar-label')
    .attr('x', d => xScaleBirth(d.birthYear)! + xScaleBirth.bandwidth() / 2)
    .attr('y', d => d.balance >= 0 ? yScale(d.balance) - 5 : yScale(d.balance) + 15)
    .attr('text-anchor', 'middle')
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '10px')
    .style('fill', d => d.balance >= 0 ? '#28a745' : '#dc3545')
    .text(d => {
      const val = d.balance / 1_000_000;
      return val >= 0 ? `+${val.toFixed(1)}M` : `${val.toFixed(1)}M`;
    });

  // Annotation
  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 40)
    .attr('text-anchor', 'middle')
    .style('font-family', "'Source Sans 3', sans-serif")
    .style('font-size', '11px')
    .style('fill', '#6c757d')
    .text('Rok narození');
}

/**
 * Summary cards showing key metrics
 */
function SummaryCards({ result, mode = 'balance' }: { result: ScenarioResult; mode?: 'balance' | 'equilibrium' }) {
  const firstPoint = result.points[0];
  const lastPoint = result.points[result.points.length - 1];
  const midIndex = Math.floor(result.points.length / 2);
  const midPoint = result.points[midIndex];

  const formatRetAge = (v: number | null) => v !== null ? `${v.toFixed(1)} let` : '—';
  const formatRatio = (v: number | null) => v !== null ? `${(v * 100).toFixed(1)}%` : '—';

  const balanceMetrics = [
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

  const equilibriumMetrics = [
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
      label: 'Pož. věk',
      start: formatRetAge(firstPoint.requiredRetAge),
      mid: formatRetAge(midPoint.requiredRetAge),
      end: formatRetAge(lastPoint.requiredRetAge),
    },
    {
      label: 'Pož. poměr',
      start: formatRatio(firstPoint.requiredPensionRatio),
      mid: formatRatio(midPoint.requiredPensionRatio),
      end: formatRatio(lastPoint.requiredPensionRatio),
    },
    {
      label: 'Pož. sazba',
      start: formatPercent(firstPoint.requiredRate),
      mid: formatPercent(midPoint.requiredRate),
      end: formatPercent(lastPoint.requiredRate),
    },
  ];

  const metrics = mode === 'equilibrium' ? equilibriumMetrics : balanceMetrics;

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
              <td className={'isBalance' in m && m.isBalance && parseFloat(m.start) < 0 ? styles.negative : ''}>
                {m.start}
              </td>
              <td className={'isBalance' in m && m.isBalance && parseFloat(m.mid) < 0 ? styles.negative : ''}>
                {m.mid}
              </td>
              <td className={'isBalance' in m && m.isBalance && parseFloat(m.end) < 0 ? styles.negative : ''}>
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
