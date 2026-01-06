import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useHistoricalDebt } from '../../hooks/useHistoricalDebt';
import { formatBillionsCzech } from '../../utils/formatters';
import { formatYearLabel } from '../../utils/chartHelpers';
import {
  adjustForInflation,
  calculateGdpPercentage,
  calculateYearlyDeficit,
  calculateCumulativeInterest,
} from '../../utils/graphCalculations';
import { convertToMetricUnit } from '../../utils/unitConversions';
import { GRAPH_VARIANTS, getGraphVariantInfo } from '../../config/graphVariants';
import { POPULATION_MODES, getPopulationModeInfo } from '../../config/populationModes';
import { getMetricUnitsForMode, getMetricUnitInfo } from '../../config/metricUnits';
import type { ChartDataPoint, Government, GraphVariant, PopulationMode, MetricUnit, DemographicYearData } from '../../types/debt';
import styles from './DebtChart.module.css';

const CHART_CONFIG = {
  marginTop: 20,
  marginRight: 20,
  marginBottomBase: 25, // Just for years axis
  marginBottomGovernments: 75, // Additional space for governments
  marginBottomEvents: 60, // Additional space for events
  marginLeft: 70,
  barPadding: 0.2,
  minBarWidthForAllYears: 18,
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
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: ChartDataPoint | null;
  }>({ visible: false, x: 0, y: 0, data: null });
  const [activePlan, setActivePlan] = useState('fiala');
  const [activeVariant, setActiveVariant] = useState<GraphVariant>('debt-absolute');
  const [populationMode, setPopulationMode] = useState<PopulationMode>('country');
  const [metricUnit, setMetricUnit] = useState<MetricUnit>('czk');
  const [showBabisInfoModal, setShowBabisInfoModal] = useState(false);
  
  // Detect if desktop/tablet (wider than mobile breakpoint)
  const isDesktopOrTablet = typeof window !== 'undefined' && window.innerWidth >= 768;
  
  // Governments expanded by default on desktop/tablet, collapsed on mobile
  // Events always collapsed by default
  const [showGovernments, setShowGovernments] = useState(isDesktopOrTablet);
  const [showEvents, setShowEvents] = useState(false);

  const { chartData, events, governments, parties, budgetPlans, economicData, demographicData, wageData, priceData, foodPriceData, interestData, isLoading, error } = useHistoricalDebt();

  // Reset metric unit to 'czk' when population mode changes
  const handlePopulationModeChange = (mode: PopulationMode) => {
    setPopulationMode(mode);
    setMetricUnit('czk');
  };

  // Handle responsive sizing - triggered when containerElement changes
  useEffect(() => {
    function updateDimensions() {
      if (containerElement) {
        // Subtract 2px to prevent potential overflow from rounding
        const width = Math.floor(containerElement.clientWidth) - 2;
        const height = Math.min(450, Math.max(350, width * 0.45));
        setDimensions({ width: Math.max(300, width), height });
      }
    }

    if (!containerElement) return;

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerElement]);

  // Build chart data with predictions for 2025 and 2026
  // 2025 always uses Fiala's plan (approved budget), 2026 uses selected plan (toggle)
  const getChartDataWithPrediction = (baseData: ChartDataPoint[]): ChartDataPoint[] => {
    if (baseData.length === 0 || budgetPlans.length === 0) return baseData;

    // 2025 always uses Fiala's approved budget
    const fialaPlan = budgetPlans.find((p) => p.id === 'fiala');
    // 2026 uses the selected plan (toggle)
    const selectedPlan = budgetPlans.find((p) => p.id === activePlan);
    
    if (!fialaPlan || !selectedPlan) return baseData;

    const result = [...baseData];

    // Find 2024 debt (last actual data point)
    const debt2024 = baseData.find((d) => d.year === 2024);
    if (!debt2024) return baseData;

    // Add 2025 prediction (always Fiala's plan)
    const existing2025 = baseData.find((d) => d.year === 2025);
    const prediction2025 = fialaPlan.predictions.find((p) => p.year === 2025);
    
    let debt2025Amount: number;
    if (existing2025) {
      debt2025Amount = existing2025.amount;
    } else if (prediction2025) {
      const deficit2025InBillions = prediction2025.deficit / 1_000_000_000;
      debt2025Amount = debt2024.amount + deficit2025InBillions;
      result.push({
        year: 2025,
        amount: debt2025Amount,
        isPrediction: true,
        planId: fialaPlan.id,
        planName: fialaPlan.name,
        planColor: fialaPlan.color,
        note: prediction2025.note,
      });
    } else {
      return baseData;
    }

    // Add 2026 prediction (uses selected plan - toggle)
    const prediction2026 = selectedPlan.predictions.find((p) => p.year === 2026);
    if (prediction2026) {
      const deficit2026InBillions = prediction2026.deficit / 1_000_000_000;
      const debt2026Amount = debt2025Amount + deficit2026InBillions;
      result.push({
        year: 2026,
        amount: debt2026Amount,
        isPrediction: true,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        planColor: selectedPlan.color,
        note: prediction2026.note,
      });
    }

    return result;
  };

  // Apply per-capita division based on population mode
  const applyPopulationMode = (data: ChartDataPoint[], mode: PopulationMode, demographic: DemographicYearData[]): ChartDataPoint[] => {
    if (mode === 'country') return data;
    
    return data.map((point) => {
      const demo = demographic.find((d) => d.year === point.year);
      if (!demo) return point;
      
      // Amount is in billions CZK, convert to per-capita in CZK
      // Multiply by 1 billion, then divide by population
      const divisor = mode === 'per-capita' ? demo.population : demo.workingAge;
      const perCapitaAmount = (point.amount * 1_000_000_000) / divisor;
      
      return { ...point, amount: perCapitaAmount };
    });
  };

  // Transform data based on active variant
  const transformedData = useMemo(() => {
    if (chartData.length === 0 || economicData.length === 0) return [];

    let baseData = [...chartData];
    const targetYear = 2025; // Base year for inflation adjustment

    // Add prediction for debt variants
    if (activeVariant.startsWith('debt-')) {
      baseData = getChartDataWithPrediction(baseData);
    }

    let result: ChartDataPoint[];

    switch (activeVariant) {
      case 'debt-absolute':
        result = baseData;
        break;
      
      case 'debt-inflation-adjusted':
        result = adjustForInflation(baseData, economicData, targetYear);
        break;
      
      case 'debt-gdp-percent':
        result = calculateGdpPercentage(baseData, economicData);
        break;
      
      case 'deficit-absolute': {
        const withPrediction = getChartDataWithPrediction(chartData);
        result = calculateYearlyDeficit(withPrediction);
        break;
      }
      
      case 'deficit-inflation-adjusted': {
        const withPrediction = getChartDataWithPrediction(chartData);
        const deficits = calculateYearlyDeficit(withPrediction);  // FIRST: Calculate deficit from nominal
        result = adjustForInflation(deficits, economicData, targetYear);  // THEN: Adjust for inflation
        break;
      }
      
      case 'deficit-gdp-percent': {
        const withPrediction = getChartDataWithPrediction(chartData);
        const deficits = calculateYearlyDeficit(withPrediction);
        result = calculateGdpPercentage(deficits, economicData);
        break;
      }
      
      case 'interest-absolute': {
        // Convert interest data to ChartDataPoint format
        // Mark estimates (2025, 2026) as predictions with Fiala's blue color
        result = interestData.map(d => ({
          year: d.year,
          amount: d.interest,
          isPrediction: d.isEstimate,
          planColor: d.isEstimate ? '#0033A0' : undefined,
        }));
        break;
      }
      
      case 'interest-cumulative': {
        // Calculate cumulative interest payments adjusted for inflation (2025 baseline)
        result = calculateCumulativeInterest(interestData, economicData, targetYear);
        break;
      }
      
      default:
        result = baseData;
    }

    // Apply per-capita calculation if not GDP percentage (already relative)
    if (!activeVariant.includes('gdp-percent') && demographicData.length > 0) {
      result = applyPopulationMode(result, populationMode, demographicData);
    }

    // Apply metric unit conversion (skip for GDP percentage which is already relative)
    if (!activeVariant.includes('gdp-percent') && metricUnit !== 'czk' && priceData.length > 0) {
      result = convertToMetricUnit(result, metricUnit, populationMode, priceData, wageData, foodPriceData);
    }

    // For 2025: Only show as actual (red bar) for certain nominal CZK variants
    // - debt-absolute + country + czk
    // - interest-absolute + country + czk
    // - interest-cumulative + country + czk
    // All other variants use additional estimates (inflation, GDP, demographics, prices)
    // so 2025 should be marked as prediction (blue bar) for those
    const actualVariants = ['debt-absolute', 'interest-absolute', 'interest-cumulative'];
    const isActual2025Variant = actualVariants.includes(activeVariant) && populationMode === 'country' && metricUnit === 'czk';
    if (!isActual2025Variant) {
      result = result.map((point) => {
        if (point.year === 2025 && !point.isPrediction) {
          const fialaPlan = budgetPlans.find((p) => p.id === 'fiala');
          return {
            ...point,
            isPrediction: true,
            planId: 'fiala',
            planName: fialaPlan?.name || 'Rozpočet Fialovy vlády',
            planColor: fialaPlan?.color || '#0033A0',
          };
        }
        return point;
      });
    }

    return result;
  }, [chartData, economicData, demographicData, activeVariant, activePlan, budgetPlans, populationMode, metricUnit, priceData, wageData, foodPriceData, interestData]);

  // Get the minimum year for the current metric unit (for data-limited metrics like food)
  const metricMinYear = useMemo(() => {
    const unitInfo = getMetricUnitInfo(metricUnit, populationMode);
    return unitInfo.minYear;
  }, [metricUnit, populationMode]);

  // Filter data based on metric unit's minimum year
  const displayData = useMemo(() => {
    if (!metricMinYear) return transformedData;
    return transformedData.filter(d => d.year >= metricMinYear);
  }, [transformedData, metricMinYear]);

  const variantInfo = getGraphVariantInfo(activeVariant);
  const isDeficitVariant = activeVariant.startsWith('deficit-');
  const isPercentVariant = activeVariant.includes('gdp-percent');
  const isNonCzkMetric = metricUnit !== 'czk';

  // Calculate dynamic margin bottom based on visible sections
  const marginBottom = useMemo(() => {
    let margin = CHART_CONFIG.marginBottomBase;
    if (showGovernments) margin += CHART_CONFIG.marginBottomGovernments;
    if (showEvents) margin += CHART_CONFIG.marginBottomEvents;
    return margin;
  }, [showGovernments, showEvents]);

  // Draw chart with D3
  useEffect(() => {
    if (!svgRef.current || displayData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const { marginTop, marginRight, marginLeft, barPadding, minBarWidthForAllYears } = CHART_CONFIG;
    const innerWidth = width - marginLeft - marginRight;
    const innerHeight = height - marginTop - marginBottom;

    // Scales
    const xScale = d3
      .scaleBand<number>()
      .domain(displayData.map((d) => d.year))
      .range([0, innerWidth])
      .padding(barPadding);

    // For deficit charts, we need to handle negative values
    const minValue = isDeficitVariant ? Math.min(0, d3.min(displayData, (d) => d.amount) ?? 0) : 0;
    const maxValue = d3.max(displayData, (d) => d.amount) ?? 0;

    const yScale = d3
      .scaleLinear()
      .domain([minValue, maxValue])
      .nice()
      .range([innerHeight, 0]);

    const barWidth = xScale.bandwidth();
    const showAllYears = barWidth >= minBarWidthForAllYears;
    const zeroY = yScale(0);

    // Time scale for precise date positioning (governments, events)
    const years = displayData.map((d) => d.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const timeScale = d3
      .scaleTime()
      .domain([new Date(minYear, 0, 1), new Date(maxYear, 11, 31)])
      .range([0, innerWidth]);

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
      .data(displayData)
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
        const containerRect = containerElement?.getBoundingClientRect();
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

    const yearsToShow = getYearTickValues(displayData, showAllYears);

    displayData.forEach((d) => {
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

    // Date bounds for governments and events positioning
    const chartStartDate = new Date(minYear, 0, 1);
    const chartEndDate = new Date(maxYear, 11, 31);

    // === LINE 2: Governments (collapsible) ===
    if (showGovernments) {
    const governmentsGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight + 22})`);

    // Build government spans using precise dates
    
    const govSpans: GovernmentSpan[] = governments
      .filter((gov) => {
        const govStart = new Date(gov.startDate);
        const govEnd = gov.endDate ? new Date(gov.endDate) : chartEndDate;
        // Include if government overlaps with chart range
        return govStart <= chartEndDate && govEnd >= chartStartDate;
      })
      .map((gov) => {
        const govStart = new Date(gov.startDate);
        const govEnd = gov.endDate ? new Date(gov.endDate) : chartEndDate;
        
        // Clamp to chart bounds
        const clampedStart = govStart < chartStartDate ? chartStartDate : govStart;
        const clampedEnd = govEnd > chartEndDate ? chartEndDate : govEnd;
        
        const startX = timeScale(clampedStart);
        const endX = timeScale(clampedEnd);
        const spanWidth = Math.max(endX - startX, 2); // minimum 2px width
        
        const partyInfo = parties[gov.party];
        const color = partyInfo?.color || '#666';
        
        // Calculate years count for reference
        const yearsCount = Math.ceil((clampedEnd.getTime() - clampedStart.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        return {
          gov,
          startX,
          endX,
          width: spanWidth,
          centerX: startX + spanWidth / 2,
          color,
          yearsCount,
        };
      });

    // Draw government bars with visible borders
    govSpans.forEach((span) => {
      governmentsGroup
        .append('rect')
        .attr('x', span.startX)
        .attr('y', 0)
        .attr('width', span.width)
        .attr('height', 18)
        .attr('fill', span.color)
        .attr('opacity', 0.15)
        .attr('stroke', span.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.6)
        .attr('rx', 2);
    });

    // Assign staggered heights to government labels to avoid overlaps
    const govLabelHeight = 14;
    const minGovLabelSpacing = 55; // minimum pixels between labels on same line
    const govLabelHeights: number[] = [];
    
    govSpans.forEach((span, index) => {
      let assignedLine = 0;
      
      // Check previous labels for overlap on each line
      for (let line = 0; line < 4; line++) {
        let hasOverlap = false;
        for (let i = 0; i < index; i++) {
          if (govLabelHeights[i] === line) {
            const distance = span.centerX - govSpans[i].centerX;
            if (Math.abs(distance) < minGovLabelSpacing) {
              hasOverlap = true;
              break;
            }
          }
        }
        if (!hasOverlap) {
          assignedLine = line;
          break;
        }
      }
      govLabelHeights.push(assignedLine);
    });

    // Draw government labels with staggered heights and connecting lines
    govSpans.forEach((span, index) => {
      const lineOffset = govLabelHeights[index] * govLabelHeight;
      const lineStartY = 18; // bottom of bar
      const lineEndY = 24 + lineOffset; // just above text
      
      // Draw vertical connecting line (like events)
      governmentsGroup
        .append('line')
        .attr('x1', span.centerX)
        .attr('x2', span.centerX)
        .attr('y1', lineStartY)
        .attr('y2', lineEndY)
        .attr('stroke', span.color)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.5);
      
      // Draw label
      governmentsGroup
        .append('text')
        .attr('x', span.centerX)
        .attr('y', lineEndY + 10)
        .attr('text-anchor', 'middle')
        .attr('fill', span.color)
        .attr('class', styles.governmentLabel)
        .text(span.gov.name);
    });
    } // end showGovernments

    // === LINE 3: Events (collapsible) ===
    if (showEvents) {
    const eventsYOffset = innerHeight + 22 + (showGovernments ? CHART_CONFIG.marginBottomGovernments : 0);
    const eventsGroup = g
      .append('g')
      .attr('transform', `translate(0,${eventsYOffset})`);

    // Draw a horizontal line for events timeline
    eventsGroup
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', '#9d4edd')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', '2,4');

    // Sort events by date and calculate positions with staggered heights
    const sortedEvents = [...events]
      .filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= chartStartDate && eventDate <= chartEndDate;
      })
      .map((event) => ({
        ...event,
        x: timeScale(new Date(event.date)),
      }))
      .sort((a, b) => a.x - b.x);

    // Assign staggered heights to avoid overlaps
    const labelHeight = 14;
    const minLabelSpacing = 100; // minimum pixels between labels on same line
    const eventHeights: number[] = [];
    
    sortedEvents.forEach((event, index) => {
      let assignedLine = 0;
      
      // Check previous events for overlap on each line
      for (let line = 0; line < 3; line++) {
        let hasOverlap = false;
        for (let i = 0; i < index; i++) {
          if (eventHeights[i] === line) {
            const distance = event.x - sortedEvents[i].x;
            if (distance < minLabelSpacing) {
              hasOverlap = true;
              break;
            }
          }
        }
        if (!hasOverlap) {
          assignedLine = line;
          break;
        }
      }
      eventHeights.push(assignedLine);
    });

    sortedEvents.forEach((event, index) => {
      const x = event.x;
      const lineOffset = eventHeights[index] * labelHeight;
      const lineEndY = 15 + lineOffset;
      
      // Draw dot at exact event position
      eventsGroup
        .append('circle')
        .attr('cx', x)
        .attr('cy', 0)
        .attr('r', 5)
        .attr('class', styles.eventDot);

      // Draw vertical line connecting dot to label
      eventsGroup
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 5)
        .attr('y2', lineEndY)
        .attr('stroke', '#9d4edd')
        .attr('stroke-width', 1);

      eventsGroup
        .append('text')
        .attr('x', x)
        .attr('y', lineEndY + 11)
        .attr('text-anchor', 'middle')
        .attr('class', styles.eventLabel)
        .text(event.name);
    });
    } // end showEvents

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => {
        if (isPercentVariant) return `${d}%`;
        
        // Handle alternative metric units
        if (isNonCzkMetric) {
          const val = Number(d);
          // For months, show with 1 decimal if small
          if (metricUnit.includes('months')) {
            return val >= 10 ? `${Math.round(val)}` : `${val.toFixed(1)}`;
          }
          // For other units, format large numbers
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)} mil`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)} tis`;
          return `${Math.round(val)}`;
        }
        
        if (populationMode !== 'country') {
          // Format as thousands of CZK for per-capita
          const val = Number(d);
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)} mil`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)} tis`;
          return `${val}`;
        }
        return `${d} mld`;
      });

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

  }, [displayData, events, governments, parties, dimensions, isDeficitVariant, isPercentVariant, populationMode, metricUnit, isNonCzkMetric, showGovernments, showEvents, marginBottom]);

  const populationModeInfo = getPopulationModeInfo(populationMode);
  const metricUnitInfo = getMetricUnitInfo(metricUnit, populationMode);
  const isPerCapita = populationMode !== 'country';

  const formatTooltipValue = (data: ChartDataPoint): string => {
    if (data.note === '?') return '?';
    if (isPercentVariant) {
      return `${data.amount.toFixed(1)} % HDP`;
    }
    
    // Handle alternative metric units
    if (isNonCzkMetric) {
      const suffix = metricUnitInfo.formatSuffix;
      // For months, show 1 decimal
      if (metricUnit.includes('months')) {
        return `${data.amount.toFixed(1)} ${suffix}`;
      }
      // For large numbers (km, hospitals, schools, litres), format with thousands separator
      if (data.amount >= 1000) {
        return `${Math.round(data.amount).toLocaleString('cs-CZ')} ${suffix}`;
      }
      return `${data.amount.toFixed(0)} ${suffix}`;
    }
    
    if (isPerCapita) {
      // Format as CZK per person
      return `${Math.round(data.amount).toLocaleString('cs-CZ')} Kč`;
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

  const getStartYear = (): number => {
    if (metricMinYear) return metricMinYear;
    return activeVariant.startsWith('deficit-') ? 1994 : 1993;
  };
  const titleYears = `${getStartYear()}–2026`;
  const getMetricSuffix = (): string => {
    if (isPercentVariant) return '';
    if (isNonCzkMetric) {
      return ` v ${metricUnitInfo.name.toLowerCase()}`;
    }
    if (isPerCapita) {
      return ` – ${populationModeInfo.name}`;
    }
    return '';
  };
  const titleSuffix = getMetricSuffix();

  return (
    <section className={styles.container} ref={setContainerElement}>
      <h2 className={styles.chartTitle}>{variantInfo.name}{titleSuffix} ({titleYears})</h2>
      
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

      {/* Population mode selector - only show for non-GDP-percent variants */}
      {!isPercentVariant && (
        <div className={styles.populationSelector}>
          {POPULATION_MODES.map((mode) => (
            <button
              key={mode.id}
              className={`${styles.populationButton} ${populationMode === mode.id ? styles.populationButtonActive : ''}`}
              onClick={() => handlePopulationModeChange(mode.id)}
              title={mode.description}
            >
              {mode.shortName}
            </button>
          ))}
        </div>
      )}

      {/* Metric unit selector - only show for non-GDP-percent variants */}
      {!isPercentVariant && (
        <div className={styles.metricSelector}>
          {getMetricUnitsForMode(populationMode).map((unit) => (
            <button
              key={unit.id}
              className={`${styles.metricButton} ${metricUnit === unit.id ? styles.metricButtonActive : ''}`}
              onClick={() => setMetricUnit(unit.id)}
              title={unit.description}
            >
              {unit.shortName}
            </button>
          ))}
        </div>
      )}

      {/* Inflation base year note */}
      {activeVariant.includes('inflation-adjusted') && (
        <p className={styles.inflationNote}>
          Hodnoty přepočteny na cenovou hladinu roku 2025
        </p>
      )}

      <div className={styles.svgContainer}>
        <svg
          ref={svgRef}
          className={styles.chart}
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>

      {/* Collapsible section toggles */}
      <div className={styles.sectionToggles}>
        <button
          className={`${styles.sectionToggle} ${showGovernments ? styles.sectionToggleActive : ''}`}
          onClick={() => setShowGovernments(!showGovernments)}
          aria-expanded={showGovernments}
        >
          <span className={styles.toggleIcon}>{showGovernments ? '▼' : '▶'}</span>
          Vlády
        </button>
        <button
          className={`${styles.sectionToggle} ${showEvents ? styles.sectionToggleActive : ''}`}
          onClick={() => setShowEvents(!showEvents)}
          aria-expanded={showEvents}
        >
          <span className={styles.toggleIcon}>{showEvents ? '▼' : '▶'}</span>
          Události
        </button>
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
              onClick={() => {
                if (plan.id === 'babis') {
                  setShowBabisInfoModal(true);
                } else {
                  setActivePlan(plan.id);
                }
              }}
            >
              {plan.name}
            </button>
          ))}
        </div>
      </div>

      {/* Babiš budget info modal */}
      {showBabisInfoModal && (
        <div 
          className={styles.modalOverlay} 
          onClick={() => {
            setShowBabisInfoModal(false);
            setActivePlan('babis');
          }}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) {
              setShowBabisInfoModal(false);
              setActivePlan('babis');
            }
          }}
        >
          <div 
            className={styles.modalContent} 
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <p className={styles.modalText}>
              Rozpočet Babišovy vlády a jeho plánovaný schodek zatím není znám. 
              Až bude zveřejněn, doplníme jej.
            </p>
            <button 
              type="button"
              className={styles.modalButton}
              onClick={() => {
                setShowBabisInfoModal(false);
                setActivePlan('babis');
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setShowBabisInfoModal(false);
                setActivePlan('babis');
              }}
            >
              Rozumím
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
