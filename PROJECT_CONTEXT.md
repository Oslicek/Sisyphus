# Project Context

> **Last Updated:** 2025-12-28

## Overview

**Sisyphus** is a state government debt visualization web application. It displays real-time debt counters and interactive charts, served as a static site with virtually unlimited scaling capacity. All data processing and visualization happens client-side.

## Technology Stack

| Component | Version/Details |
|-----------|-----------------|
| Framework | React 18 |
| Build Tool | Vite |
| Language | TypeScript (strict mode) |
| Visualization | D3.js |
| Hosting | Cloudflare Pages |
| Scheduled Tasks | Cloudflare Workers (TypeScript) |
| Data Storage | Cloudflare R2 (static JSON files) |
| Analytics | Cloudflare Web Analytics |
| Testing | Vitest |

## Architecture

**Pattern:** Static Site + Edge Workers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cloudflare Edge                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐ │
│   │ Pages            │    │ Workers          │    │ R2 Storage           │ │
│   │ (Static React)   │    │ (Cron Tasks)     │    │ (JSON Data Files)    │ │
│   └──────────────────┘    └──────────────────┘    └──────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────────────┐     │
│   │ Debt Counter   │   │ D3.js Charts   │   │ Filters/Selectors      │     │
│   │ (Real-time)    │   │ (Visualization)│   │ (Client-side)          │     │
│   └────────────────┘   └────────────────┘   └────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Layers:**
- **Static Frontend** - React SPA, served from CDN edge
- **Data Layer** - Static JSON files, fetched on load
- **Update Layer** - Cloudflare Workers with cron triggers

**Data Flow:**
```
[External API] → [Worker (cron)] → [R2 JSON files] → [React App] → [User Browser]
```

## Project Structure

```
sisyphus/
├── src/                        # React application
│   ├── components/
│   │   ├── DebtCounter/        # Real-time debt counter
│   │   └── Visualization/      # D3.js chart components
│   ├── hooks/
│   │   ├── useDebtData.ts      # Data fetching hook
│   │   └── useDebtCounter.ts   # Counter animation hook
│   ├── utils/
│   │   ├── calculations.ts     # Debt calculations (TDD)
│   │   └── formatters.ts       # Number formatting (TDD)
│   ├── types/
│   │   └── debt.ts             # TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── data/
│       ├── debt-metadata.json  # Current debt + growth rate
│       └── historical.json     # Time series data
├── worker/                     # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts            # Worker entry point
│   │   └── importer.ts         # Data import logic (TDD)
│   ├── wrangler.toml
│   └── package.json
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── PROJECT_RULES.md
├── PROJECT_CONTEXT.md
└── README.md
```

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DebtCounter` | src/components/ | Real-time animated debt display |
| `useDebtCounter` | src/hooks/ | requestAnimationFrame-based counter |
| `useDebtData` | src/hooks/ | Fetch and cache JSON data |
| `calculations.ts` | src/utils/ | Debt growth calculations (TDD) |
| `formatters.ts` | src/utils/ | Currency/number formatting (TDD) |
| `importer.ts` | worker/src/ | External API data import (TDD) |

## Data Models

### Debt Metadata (debt-metadata.json)
```typescript
interface DebtMetadata {
  baseAmount: number;           // Debt at reference time (cents)
  referenceTimestamp: number;   // Unix timestamp (ms)
  growthRatePerSecond: number;  // Cents per second
  lastUpdated: string;          // ISO 8601 date
  currency: string;             // "USD"
  source: string;               // Data source name
}
```

### Historical Data (historical.json)
```typescript
interface HistoricalData {
  timeSeries: TimeSeriesPoint[];
  categories: DebtCategory[];
}

interface TimeSeriesPoint {
  date: string;                 // ISO 8601 date
  total: number;                // Total debt (cents)
  breakdown?: Record<string, number>;
}

interface DebtCategory {
  id: string;
  name: string;
  color: string;
}
```

## Testing Strategy

**TDD Focus Areas:**
- Data import and transformation
- Debt growth calculations
- Number formatting
- Data validation

**Test Locations:**
```
src/utils/calculations.test.ts
src/utils/formatters.test.ts
worker/src/importer.test.ts
```

## Current State

**Phase:** Initial Setup

**Completed:**
- [ ] Project scaffolding (Vite + React + TypeScript)
- [ ] PROJECT_RULES.md and PROJECT_CONTEXT.md
- [ ] Vitest configuration
- [ ] Basic project structure

**In Progress:**
- [ ] Core data types

**Pending:**
- [ ] Debt counter component
- [ ] D3.js visualization
- [ ] Cloudflare Worker setup
- [ ] Data import logic
- [ ] Cloudflare Pages deployment

## External APIs

| API | Purpose | Update Frequency |
|-----|---------|------------------|
| TBD | Government debt data | Daily |

## Notes

- All business logic must have tests (TDD)
- Data files are static JSON, updated by Workers
- No server-side rendering - pure client-side React
- Unlimited scaling via CDN edge caching

