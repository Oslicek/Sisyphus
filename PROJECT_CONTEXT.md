# Project Context

> **Last Updated:** 2025-12-28

## Overview

**Sisyphus** is a Czech Republic government debt visualization web application. It displays a real-time debt counter and historical debt chart, served as a static site with unlimited scaling capacity. All data processing happens client-side. The application is in Czech language.

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
| Testing | Vitest |

## Architecture

**Pattern:** Static Site with Client-Side Computation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cloudflare Edge                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐              ┌──────────────────────────────────┐   │
│   │ Pages            │              │ Static JSON                       │   │
│   │ (Static React)   │              │ - debt-anchor.json                │   │
│   │                  │              │ - debt-historical.json            │   │
│   └──────────────────┘              └──────────────────────────────────┘   │
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
│   │ - Fetches historical data once on load                              │   │
│   │ - D3.js bar chart showing debt 1993-2025                            │   │
│   │ - Interactive tooltips                                              │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```
[Static JSON] → [React App fetches on load] → [Client processes & renders]
```

## Project Structure

```
sisyphus/
├── src/
│   ├── components/
│   │   ├── DebtCounter/        # Real-time debt counter
│   │   │   ├── DebtCounter.tsx
│   │   │   ├── DebtCounter.module.css
│   │   │   └── index.ts
│   │   └── DebtChart/          # D3.js historical chart
│   │       ├── DebtChart.tsx
│   │       ├── DebtChart.module.css
│   │       └── index.ts
│   ├── hooks/
│   │   ├── useDebtCounter.ts   # Counter logic hook
│   │   └── useHistoricalDebt.ts # Historical data hook
│   ├── utils/
│   │   ├── calculations.ts     # Debt calculations (TDD)
│   │   ├── calculations.test.ts
│   │   ├── formatters.ts       # Czech currency formatting (TDD)
│   │   ├── formatters.test.ts
│   │   ├── historicalData.ts   # Historical data processing (TDD)
│   │   └── historicalData.test.ts
│   ├── types/
│   │   └── debt.ts             # TypeScript interfaces
│   ├── App.tsx
│   ├── App.module.css
│   ├── main.tsx
│   └── index.css               # Global styles, light theme
├── public/
│   └── data/
│       ├── debt-anchor.json    # Anchor data for debt counter
│       └── debt-historical.json # Historical data 1993-2025
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
| `DebtChart` | src/components/DebtChart/ | D3.js bar chart 1993-2025 |
| `useDebtCounter` | src/hooks/ | Fetches anchor, computes & updates every second |
| `useHistoricalDebt` | src/hooks/ | Fetches & processes historical data |
| `calculations.ts` | src/utils/ | Deficit per second, elapsed time, current debt |
| `formatters.ts` | src/utils/ | Czech locale currency formatting |
| `historicalData.ts` | src/utils/ | Extract Q4 data for chart display |

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

### Historical Data (debt-historical.json)
```typescript
interface HistoricalDebtData {
  source: string;               // "Ministerstvo financí ČR"
  sourceUrl: string;            // MFCR URL
  lastUpdated: string;
  currency: string;
  unit: string;                 // "billionCZK"
  description: string;
  data: HistoricalDebtPoint[];
}

interface HistoricalDebtPoint {
  year: number;
  q1?: number;  // Q1 value in billion CZK
  q2?: number;
  q3?: number;
  q4?: number;
}
```

**Data Source:** [Ministerstvo financí ČR](https://www.mfcr.cz/cs/rozpoctova-politika/makroekonomika/statistika-vladniho-sektoru/2025/ctvrtletni-prehledy-o-stavu-a-vyvoji-statniho-dluh-61526)

## Testing Strategy

**TDD Focus Areas:**
- Debt growth calculations
- Czech currency formatting
- Historical data processing (Q4 extraction)

**Test Files (22 tests total):**
```
src/utils/calculations.test.ts      (8 tests)
src/utils/formatters.test.ts        (4 tests)
src/utils/historicalData.test.ts    (10 tests)
```

## Current State

**Phase:** MVP - Counter + Chart

**Completed:**
- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Debt counter with real-time updates (Kč)
- [x] Historical data JSON from MFCR (1993-2025, quarterly)
- [x] D3.js bar chart showing yearly debt
- [x] Ovidius motto at top of page
- [x] Light theme with CSS Modules
- [x] Czech-compatible fonts
- [x] TDD: 22 tests passing

**Pending:**
- [ ] Cloudflare Worker for data updates
- [ ] Cloudflare Pages deployment
- [ ] Additional visualizations

## Notes

- All business logic has tests (TDD)
- Application is in Czech language
- Light theme only
- Fonts support Czech diacritics (háčky, čárky)
- Chart uses Q4 values (or latest available quarter)
- Historical data updated from MFCR as of 2025-10-17
