# Project Context

> **Last Updated:** 2025-12-28

## Overview

**Sisyphus** is a Czech Republic government debt visualization web application. It displays a real-time debt counter, served as a static site with virtually unlimited scaling capacity. All data processing and visualization happens client-side. The application is in Czech language.

## Technology Stack

| Component | Version/Details |
|-----------|-----------------|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Language | TypeScript (strict mode) |
| Styling | CSS Modules |
| Fonts | Bebas Neue, Source Sans 3, JetBrains Mono (OFL) |
| Hosting | Cloudflare Pages |
| Scheduled Tasks | Cloudflare Workers (TypeScript) |
| Data Storage | Static JSON files (public/data/) |
| Testing | Vitest |

## Architecture

**Pattern:** Static Site with Client-Side Computation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cloudflare Edge                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐ │
│   │ Pages            │    │ Workers          │    │ Static JSON          │ │
│   │ (Static React)   │    │ (Cron Tasks)     │    │ (debt-anchor.json)   │ │
│   └──────────────────┘    └──────────────────┘    └──────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Browser                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │ DebtCounter Component                                               │   │
│   │ - Fetches anchor data once on load                                  │   │
│   │ - Computes deficit per second from yearly planned deficit           │   │
│   │ - Updates display every second (client-side, no further fetches)    │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```
[Static JSON] → [React App fetches on load] → [Client computes & updates every second]
```

## Project Structure

```
sisyphus/
├── src/                        # React application
│   ├── components/
│   │   └── DebtCounter/        # Real-time debt counter
│   │       ├── DebtCounter.tsx
│   │       ├── DebtCounter.module.css
│   │       └── index.ts
│   ├── hooks/
│   │   └── useDebtCounter.ts   # Counter logic hook
│   ├── utils/
│   │   ├── calculations.ts     # Debt calculations (TDD)
│   │   ├── calculations.test.ts
│   │   ├── formatters.ts       # Czech currency formatting (TDD)
│   │   └── formatters.test.ts
│   ├── types/
│   │   └── debt.ts             # TypeScript interfaces
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # Global styles, light theme
├── public/
│   └── data/
│       └── debt-anchor.json    # Anchor data for debt calculation
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
| `DebtCounter` | src/components/DebtCounter/ | Real-time debt display in Czech |
| `useDebtCounter` | src/hooks/ | Fetches data, computes & updates debt every second |
| `calculations.ts` | src/utils/ | Deficit per second, seconds since anchor, current debt |
| `formatters.ts` | src/utils/ | Czech locale currency formatting |
| `debt.ts` | src/types/ | DebtAnchor and DebtState interfaces |

## Data Models

### Debt Anchor (debt-anchor.json)
```typescript
interface DebtAnchor {
  baseAmount: number;           // Debt at anchor date in CZK
  anchorDate: string;           // ISO 8601 date (YYYY-MM-DD)
  plannedDeficit2025: number;   // Planned budget deficit for 2025 in CZK
  currency: string;             // "CZK"
  source: string;               // Data source name
  lastUpdated: string;          // ISO 8601 date
}
```

**Current values:**
- Base amount: 3,365,200,000,000 CZK (as of 2024-12-31)
- Planned deficit 2025: 241,000,000,000 CZK

## Calculation Logic

1. **On page load:** Fetch `debt-anchor.json`
2. **Compute deficit per second:** `plannedDeficit2025 / secondsInYear`
3. **Compute seconds elapsed:** `now - anchorDate`
4. **Current debt:** `baseAmount + (deficitPerSecond × secondsElapsed)`
5. **Every second:** Increment display by `deficitPerSecond`

## Testing Strategy

**TDD Focus Areas:**
- Debt growth calculations
- Czech currency formatting
- Leap year handling

**Test Files:**
```
src/utils/calculations.test.ts  (8 tests)
src/utils/formatters.test.ts    (4 tests)
```

## Current State

**Phase:** MVP - Debt Counter

**Completed:**
- [x] Project scaffolding (Vite + React + TypeScript)
- [x] PROJECT_RULES.md and PROJECT_CONTEXT.md
- [x] Vitest configuration
- [x] Core data types
- [x] Debt calculation logic with TDD (12 tests passing)
- [x] Czech currency formatting with TDD
- [x] DebtCounter component with Czech UI
- [x] Light theme with CSS Modules
- [x] Czech-compatible fonts (Bebas Neue, Source Sans 3, JetBrains Mono)

**Pending:**
- [ ] D3.js visualizations
- [ ] Cloudflare Worker setup
- [ ] Data import logic
- [ ] Cloudflare Pages deployment

## Notes

- All business logic has tests (TDD)
- Application is in Czech language
- Light theme only
- Fonts chosen support Czech diacritics (háčky, čárky)
- No server-side rendering - pure client-side React
- Unlimited scaling via CDN edge caching
