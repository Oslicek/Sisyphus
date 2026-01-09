/**
 * PopulationPyramid Component
 * 
 * Interactive population pyramid chart with year slider for animation.
 * Displays male/female population distribution by age.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { PopulationPyramids } from '../../../types/pension';
import styles from './PopulationPyramid.module.css';

interface PopulationPyramidProps {
  pyramids: PopulationPyramids;
  baseYear: number;
  horizonYears: number;
}

export function PopulationPyramid({ pyramids, baseYear, horizonYears }: PopulationPyramidProps) {
  const [yearIndex, setYearIndex] = useState(0);
  const chartRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentYear = baseYear + yearIndex;
  const maleData = pyramids.M[yearIndex];
  const femaleData = pyramids.F[yearIndex];

  // Handle slider change with animation support
  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setYearIndex(Number(e.target.value));
  }, []);

  // Draw pyramid
  useEffect(() => {
    if (!chartRef.current || !containerRef.current || !maleData || !femaleData) {
      return;
    }

    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const width = Math.min(containerWidth - 100, 500); // Leave space for legend on right
    const height = Math.max(400, pyramids.maxAge * 3 + 60); // 3px per age group
    const margin = { top: 30, right: 10, bottom: 20, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Find max population for symmetric scale
    const maxPop = Math.max(
      d3.max(maleData) || 0,
      d3.max(femaleData) || 0
    );

    // X scale (symmetric around center)
    const xScale = d3
      .scaleLinear()
      .domain([0, maxPop])
      .range([0, innerWidth / 2 - 20]);

    // Y scale (age)
    const ages = d3.range(0, pyramids.maxAge + 1);
    const yScale = d3
      .scaleBand<number>()
      .domain(ages)
      .range([innerHeight, 0])
      .padding(0.1);

    const centerX = innerWidth / 2;
    const barHeight = yScale.bandwidth();

    // Male bars (left side, extending left from center)
    g.selectAll('.bar-male')
      .data(maleData)
      .enter()
      .append('rect')
      .attr('class', 'bar-male')
      .attr('x', (d) => centerX - xScale(d))
      .attr('y', (_, i) => yScale(i)!)
      .attr('width', (d) => xScale(d))
      .attr('height', barHeight)
      .attr('fill', '#007bff')
      .attr('opacity', 0.8);

    // Female bars (right side, extending right from center)
    g.selectAll('.bar-female')
      .data(femaleData)
      .enter()
      .append('rect')
      .attr('class', 'bar-female')
      .attr('x', centerX)
      .attr('y', (_, i) => yScale(i)!)
      .attr('width', (d) => xScale(d))
      .attr('height', barHeight)
      .attr('fill', '#e75480')
      .attr('opacity', 0.8);

    // Center line
    g.append('line')
      .attr('x1', centerX)
      .attr('x2', centerX)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#dee2e6')
      .attr('stroke-width', 1);

    // Age labels (every 10 years)
    const ageLabels = ages.filter(a => a % 10 === 0);
    g.selectAll('.age-label')
      .data(ageLabels)
      .enter()
      .append('text')
      .attr('class', 'age-label')
      .attr('x', centerX)
      .attr('y', (a) => yScale(a)! + barHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '10px')
      .style('fill', '#6c757d')
      .text((a) => a.toString());

    // Title
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-family', "'Source Sans 3', sans-serif")
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#1a1a2e')
      .text(`Rok ${currentYear}`);

  }, [maleData, femaleData, pyramids.maxAge, currentYear]);

  // Calculate totals for display
  const totalMale = maleData?.reduce((sum, v) => sum + v, 0) || 0;
  const totalFemale = femaleData?.reduce((sum, v) => sum + v, 0) || 0;
  const totalPop = totalMale + totalFemale;

  return (
    <div className={styles.container}>
      <div className={styles.chartRow}>
        <div ref={containerRef} className={styles.chartContainer}>
          <svg ref={chartRef} />
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#007bff' }} />
            <span className={styles.legendLabel}>Muži</span>
            <span className={styles.legendValue}>{formatPopulation(totalMale)}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#e75480' }} />
            <span className={styles.legendLabel}>Ženy</span>
            <span className={styles.legendValue}>{formatPopulation(totalFemale)}</span>
          </div>
          <div className={styles.legendTotal}>
            <span>Celkem</span>
            <span className={styles.legendValue}>{formatPopulation(totalPop)}</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.sliderRow}>
          <span className={styles.sliderLabel}>{baseYear}</span>
          <input
            type="range"
            min={0}
            max={horizonYears}
            value={yearIndex}
            onChange={handleYearChange}
            className={styles.slider}
          />
          <span className={styles.sliderLabel}>{baseYear + horizonYears}</span>
          <span className={styles.yearValue}>{currentYear}</span>
        </div>
      </div>
    </div>
  );
}

function formatPopulation(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)} mil`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} tis`;
  }
  return value.toFixed(0);
}
