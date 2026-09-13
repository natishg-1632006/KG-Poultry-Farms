# Testing & Quality Assurance Documentation

## Testing Architecture

Automated unit and integration testing is executed via **Vitest** with JSDOM environment and `@testing-library/react`.

### Running Tests

```bash
# Run all unit tests once
npm run test

# Run tests in watch mode during active development
npm run test:watch

# Generate code coverage report
npm run test:coverage
```

## Tested Functional Boundaries

1. `calculateRemainingChickens`:
   - Validates correct subtraction of mortality from previous remaining count.
   - Throws clear error on negative mortality.
   - Throws error if mortality exceeds current live bird count.

2. `deductFeedStock`:
   - Enforces deduction order: `Pre-Starter` $\rightarrow$ `Starter` $\rightarrow$ `Finisher`.
   - Prevents negative stock levels.

3. `calculateBoxSetWeights`:
   - Calculates total chicken weight (`Loaded Weight - Empty Box Weight`).
   - Calculates average chicken weight per set.

4. `validateRecordDate`:
   - Enforces date boundaries between chick arrival date and today.
   - Rejects future dates.
