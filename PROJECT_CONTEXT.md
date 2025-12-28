# Project Context

> **Last Updated:** 2025-12-28

## Overview

**Sisyphus** is a Czech Republic government debt visualization web application. It displays a real-time debt counter and interactive historical debt chart with multiple visualization modes. Served as a static site with unlimited scaling capacity. All data processing happens client-side. The application is in Czech language.

**Motto:** „Ať ho tlačíš, nebo ženeš, Sisyfe — balvan se vždy vrací." (Ovidius)

## Technology Stack

| Component | Version/Details |
|-----------|-----------------|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Language | TypeScript (strict mode) |
| Styling | CSS Modules |
| Charts | D3.js |
| Fonts | Bebas Neue, Crimson Pro, Source Sans 3, JetBrains Mono (OFL) |
| Hosting | Cloudflare Pages |
| Data Storage | Static JSON files (public/data/) |
| Testing | Vitest + @vitest/coverage-v8 |

## Architecture

**Pattern:** Static Site with Client-Side Computation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cloudflare Edge                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐              ┌──────────────────────────────────┐   │
│   │ Pages            │              │ Static JSON Data                  │   │
│   │ (Static React)   │              │ - debt-anchor.json                │   │
│   │                  │              │ - debt-historical.json            │   │
│   └──────────────────┘              │ - events.json                     │   │
│                                      │ - governments.json                │   │
│                                      │ - budget-plans.json               │   │
│                                      │ - economic-data.json              │   │
│                                      │ - demographic-data.json           │   │
│                                      │ - wage-data.json                  │   │
│                                      │ - price-data.json                 │   │
│                                      └──────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │ DebtCounter                                                         │   │
│   │ - Fetches anchor data once on load                                  │   │
│   │ - Computes deficit per second from yearly deficit                   │   │
│   │ - Updates display every second (client-side)                        │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │ DebtChart                                                           │   │
│   │ - 6 graph variants (debt/deficit × absolute/inflation/GDP%)         │   │
│   │ - 3 population modes (country/per capita/per working age)           │   │
│   │ - Alternative metric units (highways, hospitals, petrol, salaries)  │   │
│   │ - Interactive government timeline with party colors                 │   │
│   │ - Event markers with precise date positioning                       │   │
│   │ - 2026 budget predictions (Fiala vs Babiš plans)                    │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

### Graph Variants (6 types)
| ID | Name | Description |
|----|------|-------------|
| `debt-absolute` | Dluh | Cumulative debt in billions CZK |
| `debt-inflation-adjusted` | Dluh (reálný) | Inflation-adjusted to 2025 prices |
| `debt-gdp-percent` | Dluh/HDP | Debt as % of GDP |
| `deficit-absolute` | Schodek | Yearly deficit in billions CZK |
| `deficit-inflation-adjusted` | Schodek (reálný) | Inflation-adjusted deficit |
| `deficit-gdp-percent` | Schodek/HDP | Deficit as % of GDP |

### Population Modes (3 types)
| ID | Name | Description |
|----|------|-------------|
| `country` | Celá země | Absolute values |
| `per-capita` | Na obyvatele | Divided by total population |
| `per-working` | Na prac. obyvatele | Divided by working age (15-64) |

### Metric Units (Alternative value representations)
Different metric units available per population mode:

**Country mode:**
| ID | Name | Description |
|----|------|-------------|
| `czk` | Kč | Czech Koruna (default) |
| `highway-km` | km dálnic | Kilometres of highways built |
| `hospitals` | Nemocnice | Regional hospitals (200-400 beds) |
| `schools` | Školy | Primary schools (500 students) |

**Per-capita mode:**
| ID | Name | Description |
|----|------|-------------|
| `czk` | Kč | Czech Koruna (default) |
| `petrol-litres` | Litry benzínu | Litres of petrol 95 |

**Per-working mode:**
| ID | Name | Description |
|----|------|-------------|
| `czk` | Kč | Czech Koruna (default) |
| `avg-gross-months` | Hrubá prům. | Months of average gross salary |
| `avg-net-months` | Čistá prům. | Months of average net salary |
| `min-gross-months` | Hrubá min. | Months of minimum gross wage |
| `min-net-months` | Čistá min. | Months of minimum net wage |

### Chart Annotations
- **Government timeline**: Colored bars showing each government's term with party colors
- **Event markers**: Red dots at exact dates (Lehman Brothers, Covid-19, Ukraine invasion)
- **Staggered event labels**: Automatically positioned to prevent overlap
- **2026 predictions**: Toggle between Fiala and Babiš budget plans

## Project Structure

```
sisyphus/
├── src/
│   ├── components/
│   │   ├── DebtCounter/        # Real-time debt counter
│   │   │   ├── DebtCounter.tsx
│   │   │   ├── DebtCounter.module.css
│   │   │   └── index.ts
│   │   └── DebtChart/          # D3.js interactive chart
│   │       ├── DebtChart.tsx
│   │       ├── DebtChart.module.css
│   │       └── index.ts
│   ├── config/
│   │   ├── graphVariants.ts    # Graph variant definitions
│   │   ├── populationModes.ts  # Population mode definitions
│   │   └── metricUnits.ts      # Metric unit definitions
│   ├── hooks/
│   │   ├── useDebtCounter.ts   # Counter logic hook
│   │   └── useHistoricalDebt.ts # All data fetching hook
│   ├── utils/
│   │   ├── calculations.ts     # Debt calculations (TDD)
│   │   ├── calculations.test.ts
│   │   ├── formatters.ts       # Czech currency formatting (TDD)
│   │   ├── formatters.test.ts
│   │   ├── historicalData.ts   # Historical data processing (TDD)
│   │   ├── historicalData.test.ts
│   │   ├── chartHelpers.ts     # Chart utilities (TDD)
│   │   ├── chartHelpers.test.ts
│   │   ├── graphCalculations.ts # Inflation, GDP%, deficit (TDD)
│   │   ├── graphCalculations.test.ts
│   │   ├── unitConversions.ts  # Metric unit conversions (TDD)
│   │   └── unitConversions.test.ts
│   ├── types/
│   │   └── debt.ts             # TypeScript interfaces
│   ├── App.tsx                 # Main app with data sources footer
│   ├── App.module.css
│   ├── main.tsx
│   └── index.css               # Global styles, light theme
├── public/
│   └── data/
│       ├── debt-anchor.json    # Anchor for real-time counter
│       ├── debt-historical.json # Historical debt 1993-2025
│       ├── events.json         # Significant events with dates
│       ├── governments.json    # Government timeline + party colors
│       ├── budget-plans.json   # 2026 budget predictions
│       ├── economic-data.json  # Inflation rates + GDP 1993-2026
│       ├── demographic-data.json # Population data 1993-2026
│       ├── wage-data.json      # Average/minimum wages 1993-2026
│       └── price-data.json     # Petrol, highway, hospital, school costs
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── PROJECT_RULES.md
└── PROJECT_CONTEXT.md
```

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DebtCounter` | src/components/DebtCounter/ | Real-time debt display with Kč |
| `DebtChart` | src/components/DebtChart/ | D3.js interactive chart with variants |
| `useDebtCounter` | src/hooks/ | Fetches anchor, computes & updates every second |
| `useHistoricalDebt` | src/hooks/ | Fetches all JSON data files |
| `calculations.ts` | src/utils/ | Deficit per second, elapsed time, current debt |
| `formatters.ts` | src/utils/ | Czech locale currency formatting |
| `historicalData.ts` | src/utils/ | Extract Q4 data for chart display |
| `chartHelpers.ts` | src/utils/ | Year formatting, government lookup |
| `graphCalculations.ts` | src/utils/ | Inflation adjustment, GDP %, yearly deficit |
| `unitConversions.ts` | src/utils/ | Metric unit conversions (highways, petrol, salaries) |

## Data Models

### Debt Anchor (debt-anchor.json)
```typescript
interface DebtAnchor {
  baseAmount: number;           // Debt at anchor date in CZK
  anchorDate: string;           // ISO 8601 date (YYYY-MM-DD)
  plannedDeficit2025: number;   // Planned deficit for 2025 in CZK
  currency: string;             // "CZK"
  source: string;
  lastUpdated: string;
}
```

### Governments (governments.json)
```typescript
interface Government {
  name: string;           // e.g., "Fiala"
  startDate: string;      // ISO date
  endDate: string | null; // null for current government
  party: string;          // Party ID
}

interface GovernmentsData {
  parties: Record<string, { name: string; color: string }>;
  governments: Government[];
}
```

### Demographic Data (demographic-data.json)
```typescript
interface DemographicYearData {
  year: number;
  population: number;   // Total population
  workingAge: number;   // Population 15-64
}
```

## Data Sources

| Data | Source | URL |
|------|--------|-----|
| Státní dluh ČR | Ministerstvo financí ČR | [mfcr.cz](https://www.mfcr.cz/cs/rozpoctova-politika/makroekonomika/statistika-vladniho-sektoru/2025/ctvrtletni-prehledy-o-stavu-a-vyvoji-statniho-dluh-61526) |
| Seznam vlád Česka | Wikipedia | [wikipedia.org](https://cs.wikipedia.org/wiki/Seznam_vlád_Česka) |
| Rozpočtové plány | Ministerstvo financí ČR | [mfcr.cz](https://www.mfcr.cz/) |
| Inflace a HDP | Český statistický úřad | [czso.cz](https://www.czso.cz/) |
| Demografická data | Český statistický úřad | [csu.gov.cz](https://csu.gov.cz/produkty/obyvatelstvo_hu) |
| Mzdová data | ČSÚ, MPSV | [czso.cz](https://www.czso.cz/csu/czso/prace_a_mzdy_prace) |
| Cenová data | ČSÚ, ŘSD, MZ ČR, MŠMT | [czso.cz](https://www.czso.cz/) |

## Testing Strategy

**TDD Focus Areas:**
- Debt growth calculations
- Czech currency formatting
- Historical data processing (Q4 extraction)
- Inflation adjustment calculations
- GDP percentage calculations
- Yearly deficit calculations
- Chart helper functions
- Metric unit conversions

**Test Coverage: 100%**
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |     100 |      100 |     100 |     100 |
 calculations.ts    |     100 |      100 |     100 |     100 |
 chartHelpers.ts    |     100 |      100 |     100 |     100 |
 formatters.ts      |     100 |      100 |     100 |     100 |
 graphCalculations  |     100 |      100 |     100 |     100 |
 historicalData.ts  |     100 |      100 |     100 |     100 |
 unitConversions.ts |     100 |      100 |     100 |     100 |
--------------------|---------|----------|---------|---------|
```

**Test Summary:**
- 87 tests across 6 test files
- All utility functions fully covered

## Current State

**Phase:** MVP Complete

**Completed:**
- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Debt counter with real-time updates (Kč)
- [x] Historical data JSON from MFCR (1993-2025, quarterly)
- [x] D3.js bar chart with 6 graph variants
- [x] 3 population modes (country/per capita/per working age)
- [x] Alternative metric units (highways, hospitals, schools, petrol, salaries)
- [x] Government timeline with party colors
- [x] Event markers with precise date positioning
- [x] 2026 budget plan predictions with toggle
- [x] Inflation adjustment (2025 baseline)
- [x] GDP percentage calculations
- [x] Yearly deficit calculations
- [x] Ovidius motto at top of page
- [x] Light theme with CSS Modules
- [x] Czech-compatible fonts
- [x] Data sources footer with links
- [x] Responsive design (up to 2400px width)
- [x] TDD: 87 tests, 100% coverage

**Pending:**
- [ ] Cloudflare Worker for data updates
- [ ] Cloudflare Pages deployment

## Notes

- All business logic has 100% test coverage (TDD)
- Application is in Czech language
- Light theme only
- Fonts support Czech diacritics (háčky, čárky)
- Chart uses Q4 values (or latest available quarter)
- Time scale positioning for governments and events (precise dates)
- Inflation baseline: 2025
- Historical data updated from MFCR as of 2025-10-17
