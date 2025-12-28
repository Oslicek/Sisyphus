# Project Rules

## Software Engineering Principles

### Test-Driven Development (TDD)
1. **Red**: Write a failing test first
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green
4. **Commit**: Commit and push the code to GitHub
5. **Update PROJECT_CONTEXT**: Update PROJECT_CONTEXT file

### SOLID Principles
- **S**ingle Responsibility: Each module/function should have one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for their base types
- **I**nterface Segregation: Many specific interfaces over one general-purpose interface
- **D**ependency Inversion: Depend on abstractions, not concretions

### General Best Practices
- Keep functions small and focused (< 20 lines ideal)
- Meaningful naming over comments
- DRY (Don't Repeat Yourself) - but don't over-abstract prematurely
- YAGNI (You Aren't Gonna Need It) - implement only what's needed now
- Fail fast - validate inputs early, throw meaningful errors
- Prefer composition over inheritance
- Prefer pure functions where possible

---

## TypeScript Conventions

### Naming
- `PascalCase`: Types, interfaces, classes, enums, React components
- `camelCase`: Variables, functions, parameters, properties
- `UPPER_SNAKE_CASE`: Constants, environment variables
- `IPascalCase` or `PascalCase`: Interfaces (I prefix optional, be consistent)

### Code Style
- Use `const` by default, `let` when reassignment needed, never `var`
- Prefer `type` for unions/primitives, `interface` for object shapes
- Use explicit return types for public functions
- Prefer `unknown` over `any`, narrow types explicitly
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Prefer `readonly` for immutable properties
- Use discriminated unions for state management

### Functions
- Prefer arrow functions for callbacks and inline functions
- Use named function declarations for top-level functions
- Prefer async/await over raw Promises
- Avoid nested callbacks (callback hell)

### Error Handling
- Use specific error types or error codes
- Prefer Result types for expected failures (optional)
- Use try/catch for unexpected errors
- Always handle Promise rejections

---

## React Conventions

### Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';

// 2. Types
interface Props {
  value: number;
}

// 3. Component
export function MyComponent({ value }: Props) {
  // 4. Hooks
  const [state, setState] = useState(0);
  
  // 5. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 6. Handlers
  const handleClick = () => {
    // ...
  };
  
  // 7. Render
  return <div>{value}</div>;
}
```

### Best Practices
- One component per file
- Use function components with hooks (no class components)
- Extract custom hooks for reusable logic (`use` prefix)
- Colocate related files (component, styles, tests)
- Prefer controlled components over uncontrolled
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback` when passed to children

### State Management
- Use local state for UI-only concerns
- Lift state up when shared between siblings
- Use context sparingly (for truly global state)
- Consider Zustand for complex global state

---

## D3.js Conventions

### Integration with React
- Use refs to access DOM for D3 rendering
- Let D3 handle the visualization, React handles the container
- Use `useEffect` for D3 bindings
- Clean up D3 selections in effect cleanup

### Best Practices
- Separate data transformation from rendering
- Use D3 scales for all coordinate/color mappings
- Prefer `join()` pattern over enter/update/exit
- Keep transitions performant (< 300ms)
- Use `d3-format` for number formatting

---

## Cloudflare Workers Conventions

### Structure
```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle HTTP requests
  },
  
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Handle cron triggers
  }
};
```

### Best Practices
- Use Web APIs (fetch, Request, Response), not Node.js APIs
- Keep Workers stateless (use KV/R2/D1 for persistence)
- Handle errors gracefully, return proper HTTP status codes
- Use `ctx.waitUntil()` for fire-and-forget operations
- Type environment bindings with `Env` interface
- Keep bundle size small (avoid heavy dependencies)

### Limitations to Remember
- No filesystem access
- No Node.js built-in modules (fs, path, etc.)
- Limited CPU time (10ms free tier, 30s paid)
- Use Web Crypto API, not Node crypto

---

## Testing

### Framework
- **Vitest** for unit tests (fast, Vite-native)
- **React Testing Library** for component tests
- **Playwright** for E2E tests (if needed)

### Unit Tests
- One assertion per test (when practical)
- Use AAA pattern: Arrange, Act, Assert
- Name tests: `describe('functionName')` + `it('should do X when Y')`
- Mock external dependencies
- Test edge cases and error conditions

### Test File Structure
```
src/
├── utils/
│   ├── calculations.ts
│   └── calculations.test.ts    # Colocated
└── components/
    ├── DebtCounter/
    │   ├── DebtCounter.tsx
    │   └── DebtCounter.test.tsx
```

### What to Test (TDD Focus)
- **Business logic**: Data transformations, calculations
- **Data imports**: Parsing, validation
- **Utility functions**: Formatting, filtering
- **Custom hooks**: State logic
- **Critical paths**: User-facing features

### What NOT to Test
- Framework code (React, D3)
- Third-party libraries
- Pure UI styling
- Implementation details

---

## Project Structure

```
sisyphus/
├── src/                    # React application
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions (pure, testable)
│   ├── types/              # TypeScript type definitions
│   └── data/               # Static data files (local dev)
├── public/
│   └── data/               # Production data files
├── worker/                 # Cloudflare Worker
│   ├── src/
│   │   └── index.ts
│   └── wrangler.toml
├── package.json
├── vite.config.ts
├── tsconfig.json
├── PROJECT_RULES.md
└── PROJECT_CONTEXT.md
```

---

## Git Workflow

- Write meaningful commit messages
- Commit small, focused changes
- Keep `main` branch stable
- Use feature branches for new work
- Squash commits before merging when appropriate
- Update PROJECT_CONTEXT.md after significant changes

---

## Code Review Checklist
- [ ] Tests included and passing (TDD)
- [ ] No hardcoded values (use constants/config)
- [ ] Error handling appropriate
- [ ] No unused code or imports
- [ ] Naming is clear and consistent
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] TypeScript strict mode satisfied

