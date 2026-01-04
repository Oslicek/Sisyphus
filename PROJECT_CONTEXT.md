# Project Context

> **Last Updated:** 2026-01-04 (v8)

## Overview

**Sisyphus** is a Czech Republic government debt visualization web application. It displays a real-time debt counter and interactive historical debt chart with multiple visualization modes. Served as a static site with unlimited scaling capacity. All data processing happens client-side. The application is in Czech language.

**Tagline:** Státní dluh – náš společný balvan

**Motto:** „Ať ho tlačíš, nebo ženeš, Sisyfe — balvan se vždy vrací." (Ovidius)

## Technology Stack

| Component | Version/Details |
|-----------|-----------------|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Language | TypeScript (strict mode) |
| Styling | CSS Modules |
| Charts | D3.js |
| Sharing | react-share, html2canvas |
| Routing | react-router-dom |
| Fonts | Bebas Neue, Crimson Pro, Source Sans 3, JetBrains Mono, Titan One, Nunito (OFL) |
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
│   │ (Static React)   │              │ - debt-anchor.json (multi-anchor) │   │
│   │                  │              │ - debt-historical.json            │   │
│   └──────────────────┘              │ - debt-monthly.json               │   │
│                                      │ - debt-interest.json              │   │
│                                      │ - events.json                     │   │
│                                      │ - governments.json                │   │
│                                      │ - budget-plans.json               │   │
│                                      │ - economic-data.json              │   │
│                                      │ - demographic-data.json           │   │
│                                      │ - wage-data.json                  │   │
│                                      │ - price-data.json                 │   │
│                                      │ - food-prices.json                │   │
│                                      │ - blog-posts.json                 │   │
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
│   │ - Fetches multi-anchor data once on load                            │   │
│   │ - Selects active anchor based on current date                       │   │
│   │ - Computes growth rate: EOY-target (2025) or deficit-based (2026+)  │   │
│   │ - Auto-switches anchor at year boundary (2026-01-01 00:00:00)       │   │
│   │ - Updates display every second (client-side)                        │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │ DebtChart                                                           │   │
│   │ - 8 graph variants (debt/deficit/interest variants)                 │   │
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

### Graph Variants (8 types)
| ID | Name | Description |
|----|------|-------------|
| `debt-absolute` | Dluh | Cumulative debt in billions CZK |
| `debt-inflation-adjusted` | Dluh (reálný) | Inflation-adjusted to 2025 prices |
| `debt-gdp-percent` | Dluh/HDP | Debt as % of GDP |
| `deficit-absolute` | Schodek | Yearly deficit in billions CZK |
| `deficit-inflation-adjusted` | Schodek (reálný) | Inflation-adjusted deficit |
| `deficit-gdp-percent` | Schodek/HDP | Deficit as % of GDP |
| `interest-absolute` | Úroky | Yearly interest payments in billions CZK |
| `interest-cumulative` | Σ Úroky | Cumulative interest since 1993 (inflation-adjusted) |

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
| `petrol-litres` | Benzín | Litres of petrol 95 |
| `bread-kg` | Chléb | Kilograms of bread (2006+) |
| `eggs-10` | Vejce | 10-packs of eggs (2006+) |
| `butter-kg` | Máslo | Kilograms of butter (2006+) |
| `potatoes-kg` | Brambory | Kilograms of potatoes (2006+) |
| `beer-05l` | Pivo | 0.5l bottles of beer (2006+) |

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
│   │   ├── DebtChart/          # D3.js interactive chart (8 variants)
│   │   │   ├── DebtChart.tsx
│   │   │   ├── DebtChart.module.css
│   │   │   └── index.ts
│   │   ├── ShareButtons/       # Social sharing + screenshot
│   │   │   ├── ShareButtons.tsx
│   │   │   ├── ShareButtons.module.css
│   │   │   └── index.ts
│   │   ├── BuyCalculator/      # "What can I buy" wizard
│   │   │   ├── BuyCalculator.tsx
│   │   │   ├── BuyCalculator.module.css
│   │   │   └── index.ts
│   │   ├── Navigation/         # Hamburger menu navigation
│   │   │   ├── Navigation.tsx
│   │   │   ├── Navigation.module.css
│   │   │   └── index.ts
│   │   ├── Footer/             # Unified footer (links + test banner)
│   │   │   ├── Footer.tsx
│   │   │   ├── Footer.module.css
│   │   │   └── index.ts
│   │   └── TestBanner/         # Test mode banner
│   │       ├── TestBanner.tsx
│   │       ├── TestBanner.module.css
│   │       └── index.ts
│   ├── pages/
│   │   ├── About/              # O projektu Sisyfos
│   │   │   ├── About.tsx
│   │   │   ├── About.module.css
│   │   │   └── index.ts
│   │   ├── Blog/               # Blog - příspěvky Projektu Sisyfos
│   │   │   ├── Blog.tsx
│   │   │   ├── Blog.module.css
│   │   │   └── index.ts
│   │   ├── DataSources/        # Datové řady a zdroje dat
│   │   │   ├── DataSources.tsx
│   │   │   ├── DataSources.module.css
│   │   │   └── index.ts
│   │   ├── BudgetTables/       # Tabulky státního rozpočtu 2026
│   │   │   ├── BudgetTables.tsx
│   │   │   ├── BudgetTables.module.css
│   │   │   └── index.ts
│   │   ├── BudgetTreemap/      # Vizualizace rozpočtu (zoomable icicle)
│   │   │   ├── BudgetTreemap.tsx
│   │   │   ├── BudgetTreemap.module.css
│   │   │   └── index.ts
│   │   └── DeficitGame/        # "Zruším schodek!" interactive game
│   │       ├── DeficitGame.tsx
│   │       ├── DeficitGame.module.css
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
│   │   ├── unitConversions.test.ts
│   │   ├── deficitGame.ts      # Deficit game logic (TDD)
│   │   ├── deficitGame.test.ts
│   │   ├── budgetData.ts       # Budget data parsing (TDD)
│   │   ├── budgetData.test.ts
│   │   └── chartIntegration.test.ts # Integration tests for chart computation chains
│   ├── types/
│   │   └── debt.ts             # TypeScript interfaces
│   ├── assets/
│   │   ├── sisyfos-logo-200x200.png  # Logo for main page
│   │   ├── sisyfos-logo-400x400.png  # Logo for About page
│   │   └── rozpoctovka-logo-250x204-pruhledne.png  # Logo for deficit game
│   ├── App.tsx                 # Main app with logo, tagline, footer
│   ├── App.module.css
│   ├── main.tsx
│   └── index.css               # Global styles, light theme
├── public/
│   ├── images/
│   │   └── blog/               # Blog post images
│   │       ├── Vyplouvame.png
│   │       └── uvadime-rozpoctovku.png
│   └── data/
│       ├── debt-anchor.json    # Anchor for real-time counter
│       ├── debt-historical.json # Historical debt 1993-2025
│       ├── debt-interest.json  # Yearly interest payments 1993-2024
│       ├── events.json         # Significant events with dates
│       ├── governments.json    # Government timeline + party colors
│       ├── budget-plans.json   # 2026 budget predictions
│       ├── blog-posts.json     # Blog posts with metadata
│       ├── budget/             # Státní rozpočet 2026 (Fiala)
│       │   ├── dim_chapter.csv           # Chapter definitions (for tables)
│       │   ├── dim_classification.csv    # Classification codes and names (for tables)
│       │   ├── fact_revenues_by_chapter.csv    # Revenues by chapter (for tables)
│       │   ├── fact_expenditures_by_chapter.csv # Expenditures by chapter (for tables)
│       │   ├── prijmy_druhove_2026.csv         # Aggregated revenues (for treemaps/game)
│       │   ├── vydaje_druhove_2026.csv         # Aggregated expenditures by type (for treemaps)
│       │   └── vydaje_odvetvove_2026.csv       # Aggregated expenditures by sector (for treemaps/game)
│       ├── economic-data.json  # Inflation rates + GDP 1993-2024
│       ├── demographic-data.json # Population data 1993-2024
│       ├── wage-data.json      # Average/minimum wages 1993-2024
│       ├── price-data.json     # Petrol, highway, hospital, school 1993-2024
│       └── food-prices.json    # Food prices 2006-2024 (bread, eggs, butter, potatoes, beer)
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
| `ShareButtons` | src/components/ShareButtons/ | Social sharing + screenshot capture |
| `BuyCalculator` | src/components/BuyCalculator/ | "What can I buy with my debt share" wizard |
| `Navigation` | src/components/Navigation/ | Hamburger menu with tree navigation |
| `Footer` | src/components/Footer/ | Unified footer with links and test banner |
| `About` | src/pages/About/ | O projektu Sisyfos page |
| `Blog` | src/pages/Blog/ | Blog příspěvky - dynamically loaded from JSON |
| `DataSources` | src/pages/DataSources/ | Datové řady a zdroje dat page |
| `BudgetTables` | src/pages/BudgetTables/ | Tabulky rozpočtu 2026 (kapitoly, příjmy, výdaje) |
| `BudgetTreemap` | src/pages/BudgetTreemap/ | Vizualizace rozpočtu vlády Petra Fialy (zoomable icicle) |
| `DeficitGame` | src/pages/DeficitGame/ | "Zruším schodek!" interactive game (unique playful theme) |
| `deficitGame.ts` | src/utils/ | Deficit game logic with progress calculation |
| `budgetData.ts` | src/utils/ | Budget CSV/JSON parsing utilities |
| `useDebtCounter` | src/hooks/ | Fetches anchor, computes & updates every second |
| `useHistoricalDebt` | src/hooks/ | Fetches all JSON data files |
| `calculations.ts` | src/utils/ | Deficit per second, elapsed time, current debt |
| `formatters.ts` | src/utils/ | Czech locale currency formatting |
| `historicalData.ts` | src/utils/ | Extract Q4 data for chart display |
| `chartHelpers.ts` | src/utils/ | Year formatting, government lookup |
| `graphCalculations.ts` | src/utils/ | Inflation adjustment, GDP %, yearly deficit |
| `unitConversions.ts` | src/utils/ | Metric unit conversions (highways, petrol, salaries) |

## Data Models

### Debt Anchor (debt-anchor.json) - Multi-Anchor System
```typescript
interface DebtAnchorEntry {
  id: string;                   // Year identifier ("2025", "2026-provisorium")
  baseAmount: number;           // Debt at anchor date in CZK
  anchorDate: string;           // ISO 8601 date (YYYY-MM-DD)
  plannedEoyDebt?: number;      // For 'eoy-target' type
  plannedDeficit?: number;      // For 'deficit-based' type
  dailyIncrement?: number;      // For 'daily-increment' type (budget provisorium)
  eoyDate: string;              // End of year (typically Jan 1 next year)
  calculationType: 'eoy-target' | 'deficit-based' | 'daily-increment';
  source?: string;
  sourceUrl?: string;
}

interface DebtAnchorData {
  anchors: DebtAnchorEntry[];   // One anchor per year
  currency: string;             // "CZK"
  lastUpdated: string;
}
```

**Calculation Types:**
- `eoy-target`: Growth rate = (plannedEoyDebt - baseAmount) / seconds to EOY
- `deficit-based`: Growth rate = plannedDeficit / seconds in year
- `daily-increment`: Growth rate = dailyIncrement / 86400 (for budget provisorium)

**Anchor Switching:**
- Counter automatically selects the active anchor based on current date
- At 2026-01-01 00:00:00, switches from 2025 to 2026 anchor
- 2025: Starts at Oct 1 (3517.95B), targets 3613.6B at year end
- 2026: Starts at Jan 1 (3613.6B), adds 286B deficit over the year

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
| Náklady dluhové služby | Ministerstvo financí ČR | [mfcr.cz](https://www.mfcr.cz/cs/rozpoctova-politika/rizeni-statniho-dluhu) |
| Seznam vlád Česka | Wikipedia | [wikipedia.org](https://cs.wikipedia.org/wiki/Seznam_vlád_Česka) |
| Rozpočtové plány | Ministerstvo financí ČR | [mfcr.cz](https://www.mfcr.cz/) |
| Inflace a HDP | Český statistický úřad | [czso.cz](https://www.czso.cz/) |
| Demografická data | Český statistický úřad | [csu.gov.cz](https://csu.gov.cz/produkty/obyvatelstvo_hu) |
| Mzdová data | ČSÚ, MPSV | [czso.cz](https://www.czso.cz/csu/czso/prace_a_mzdy_prace) |
| Cenová data | ČSÚ, ŘSD, MZ ČR, MŠMT | [czso.cz](https://www.czso.cz/) |
| Ceny potravin | Český statistický úřad | [csu.gov.cz](https://csu.gov.cz/vyvoj-prumernych-cen-vybranych-potravin-2024) |

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
- Integration tests for chart computation chains

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
- 212 tests across 9 test files
- All utility functions fully covered
- Integration tests for chart computation chains (deficit-inflation-adjusted, deficit-gdp-percent, population modes, metric units)
- Multi-anchor debt counter tests (anchor selection, growth rate calculation, boundary transitions)
- Deficit game logic tests (progress calculation, adjustment validation, sharing)

## Current State

**Phase:** MVP Complete

**Completed:**
- [x] Project scaffolding (Vite + React + TypeScript)
- [x] Debt counter with real-time updates (Kč)
- [x] Historical data JSON from MFCR (1993-2025, quarterly)
- [x] D3.js bar chart with 8 graph variants (incl. interest payments + cumulative)
- [x] 3 population modes (country/per capita/per working age)
- [x] Alternative metric units (highways, hospitals, schools, petrol, salaries, food)
- [x] Government timeline with party colors
- [x] Event markers with precise date positioning
- [x] 2026 budget plan predictions with toggle (Babiš plan shows info modal)
- [x] Inflation adjustment (2025 baseline)
- [x] GDP percentage calculations
- [x] Yearly deficit calculations
- [x] Ovidius motto at top of page
- [x] Light theme with CSS Modules
- [x] Czech-compatible fonts
- [x] Data sources footer with links
- [x] Responsive design (up to 2400px width)
- [x] Social sharing buttons (Facebook, X, LinkedIn, WhatsApp, Telegram, Viber, Reddit, Email)
- [x] Screenshot capture and share (Web Share API) / download
- [x] BuyCalculator wizard - "What can I buy with my debt share"
- [x] Multi-page app with react-router-dom
- [x] About page (O projektu Sisyfos) with centered logo and contact section
- [x] Data Sources page with data series tables, bar/line charts, grid lines, axes
- [x] TDD: 205 tests, 100% coverage
- [x] Multi-anchor debt counter with auto-switching (2025→2026-provisorium)
- [x] Budget provisorium mode with daily-increment calculation (700M CZK/day)
- [x] Project logo with tagline (responsive sizing)
- [x] Logo links to About page
- [x] Collapsible governments and events sections (collapsed by default)
- [x] Budget 2026 tables page (chapters, revenues, expenditures overview)
- [x] Budget 2026 visualization page (zoomable icicle chart with D3.js)
- [x] "Zruším schodek!" interactive deficit game with:
  - Rozpočtovka logo at top of page
  - Dual icicle charts (revenues, expenditures)
  - Leaf-node selection with hover buttons
  - Adjustment sliders (±50% range) with absolute and percentage display
  - Progress bar with real-time deficit tracking
  - Non-blocking success banner when deficit reaches zero or surplus
  - Image sharing (screenshot with logo, deficit indicator, and adjustments)
  - Web Share API support on HTTPS (native share dialog on mobile)
  - Fallback to image download on HTTP/non-secure contexts
  - Graceful handling of missing Clipboard API
  - Copy image to clipboard functionality (when available)
  - Social share buttons (Facebook, X, LinkedIn, WhatsApp, Telegram)
  - Open Graph meta tags for social media previews
  - Tooltips showing full item names and values
  - Instructions explaining 50% adjustment limit
  - Unique playful design with Titan One and Nunito fonts
- [x] Hamburger menu navigation with tree structure:
  - Státní dluh → Datové řady a zdroje dat
  - Státní rozpočet → Vizualizace
  - Hra Rozpočtovka
  - Blog
  - O Projektu Sisyfos
- [x] Unified footer component on all pages:
  - Basic links: Dluh | Rozpočet | Rozpočtovka | Blog | O projektu Sisyfos
  - Active page shown as text (not link)
  - Data disclaimer text: "V našich datech mohou být chyby. Pokud je chcete k něčemu použít, důrazně doporučujeme jejich ověření."
  - Test banner as second line
- [x] Blog page with dynamic content loading:
  - Blog posts loaded from blog-posts.json
  - Support for title images (stored in /images/blog/)
  - Markdown-style links in content [text](url)
  - Date formatting in Czech locale
  - Social sharing buttons per post
  - Český dluh logo in Rozpočtovka page (top-left, links to main page)

**Pending:**
- [ ] Cloudflare Worker for data updates

**Deployment:**
- Production: https://sisyphus-prod.pages.dev/ (project: sisyphus-prod)
- Staging: https://sisyphus-9u4.pages.dev/ (project: sisyphus)
- Deploy to production: `npm run build && wrangler pages deploy dist --project-name sisyphus-prod`
- Auto-deploy on push to main (Cloudflare Pages integration)

## Notes

- All business logic has 100% test coverage (TDD)
- Application is in Czech language
- Light theme only
- Fonts support Czech diacritics (háčky, čárky)
- Chart uses Q4 values (or latest available quarter)
- Governments and events sections are collapsible (collapsed by default, expandable by user)
- Inflation baseline: 2025
- Historical data updated from MFCR as of 2025-10-17
- Data files contain only verified historical data (no projections except budget plans)
- Babiš government budget for 2026 is pending - currently shows info modal
- Multi-anchor debt counter:
  - 2025: EOY-target mode (interpolates to 3613.6B on Jan 1, 2026)
  - 2026-provisorium: Daily-increment mode (700M CZK/day = 8102 CZK/second) - currently active
  - 2026-fiala: Deficit-based mode (adds 286B Fiala government budget deficit over the year) - for when budget is approved
  - Auto-switches at 2026-01-01 00:00:00 UTC
- Budget provisorium mode displays "ROZPOČTOVÉ PROVIZORIUM" in the counter subtitle
- Budget data architecture:
  - Aggregated CSV files (prijmy_druhove_2026.csv, vydaje_druhove_2026.csv, vydaje_odvetvove_2026.csv) for treemap/game
  - Per-chapter CSV files (fact_revenues_by_chapter.csv, fact_expenditures_by_chapter.csv) for tables
  - `buildTreeFromItems()` ensures only leaf nodes have values; parent nodes calculated by D3's `.sum()`
  - Automatic "_other" nodes for parent values not fully broken down into children
- Web Share API (Deficit Game):
  - Requires secure context (HTTPS or localhost)
  - On production (HTTPS): Shows native share dialog with image
  - On development (HTTP): Falls back to image download
  - Gracefully handles missing Clipboard API on older browsers/contexts

## Contact

| Channel | Link |
|---------|------|
| E-mail | projektsisyfos@gmail.com |
| X (Twitter) | [@ProjektSisyfos](https://x.com/ProjektSisyfos) |
| Facebook | [Projekt Sisyfos](https://www.facebook.com/profile.php?id=61585770336155) |
