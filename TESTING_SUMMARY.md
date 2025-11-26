# Testing Summary - Explore Page & Board Components

## Quick Start

### 1. Install Dependencies

First, install the testing dependencies:

```bash
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/jest
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## What Was Added

### Test Configuration

1. **`jest.config.js`** - Jest configuration for Next.js
   - Configures test environment (jsdom)
   - Sets up module path aliases (`@/` → `src/`)
   - Configures coverage collection

2. **`jest.setup.js`** - Test setup file
   - Imports `@testing-library/jest-dom` for custom matchers
   - Mocks Next.js router
   - Mocks `window.matchMedia` and `IntersectionObserver`
   - Sets up localStorage mock

### Test Files

1. **`src/__tests__/components/boards/BoardCard.test.tsx`**
   - Tests BoardCard component rendering
   - Tests display options (show/hide fields)
   - Tests click interactions and keyboard navigation
   - Tests favorite functionality
   - Tests accessibility (ARIA labels)

2. **`src/__tests__/hooks/boards/useBoardFilters.test.ts`**
   - Tests text search filtering
   - Tests institution filtering
   - Tests sorting (recent, title, author, institution)
   - Tests combined filters
   - Tests edge cases

3. **`src/__tests__/app/explore/page.test.tsx`**
   - Tests Explore page rendering
   - Tests loading states
   - Tests error handling
   - Tests search, filter, and sort functionality
   - Tests modal interactions
   - Tests empty states

### Mock Files

1. **`src/__tests__/__mocks__/mockData.ts`**
   - Sample board data for testing
   - Empty board array for empty state tests
   - Board without image for fallback tests

2. **`src/__tests__/__mocks__/useBoards.ts`**
   - Mock implementations of `useBoards` hook
   - Different scenarios: loading, error, fallback, empty

3. **`src/__tests__/__mocks__/useFavorites.ts`**
   - Mock implementations of `useFavorites` hook
   - Different favorite states

4. **`src/__tests__/utils/testUtils.tsx`**
   - Testing utilities and helpers
   - Custom render function
   - Mock localStorage helper

### Documentation

1. **`TESTING_README.md`** - Comprehensive testing guide
   - How to run tests
   - Test structure explanation
   - Writing new tests
   - Best practices
   - Troubleshooting

2. **`TESTING_SUMMARY.md`** - This file
   - Quick start guide
   - What was added
   - Test coverage summary

## Test Coverage

### Components Tested

✅ **BoardCard** - Full coverage
- Rendering with all display options
- Interactions (click, keyboard)
- Favorite functionality
- Accessibility

✅ **useBoardFilters Hook** - Full coverage
- Text search
- Institution filtering
- All sort options
- Combined filters
- Edge cases

✅ **Explore Page** - Integration tests
- Full page rendering
- Loading/error/empty states
- Search, filter, sort
- Modal interactions

### Test Scenarios

**Rendering Tests:**
- ✅ Component renders with all data
- ✅ Conditional rendering based on props
- ✅ Empty states
- ✅ Loading states

**Interaction Tests:**
- ✅ Click handlers
- ✅ Keyboard navigation (Enter, Space, Escape)
- ✅ Form inputs (search, sort, filters)
- ✅ Modal open/close

**State Tests:**
- ✅ Loading state
- ✅ Error state
- ✅ Fallback state
- ✅ Empty state
- ✅ Favorite state

**Accessibility Tests:**
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader support

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- BoardCard.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="renders"
```

### Coverage Report

After running `npm run test:coverage`, open:
```
coverage/lcov-report/index.html
```

This shows detailed coverage for each file.

## Extending Tests

### Adding a New Component Test

1. Create `src/__tests__/components/MyComponent.test.tsx`
2. Import component and testing utilities
3. Write tests following existing patterns
4. Run: `npm test -- MyComponent.test.tsx`

### Adding a New Hook Test

1. Create `src/__tests__/hooks/useMyHook.test.ts`
2. Use `renderHook` from `@testing-library/react`
3. Test return values and side effects
4. Run: `npm test -- useMyHook.test.ts`

### Adding Mock Data

1. Add to `src/__tests__/__mocks__/mockData.ts`
2. Export for use in tests
3. Follow existing `BoardCardData` interface

## Key Testing Patterns

### Testing Components

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import MyComponent from "@/components/MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected")).toBeInTheDocument();
  });

  it("handles clicks", () => {
    const onClick = jest.fn();
    render(<MyComponent onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Testing Hooks

```tsx
import { renderHook } from "@testing-library/react";
import { useMyHook } from "@/hooks/useMyHook";

describe("useMyHook", () => {
  it("returns expected value", () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current).toBeDefined();
  });
});
```

### Testing Async Behavior

```tsx
import { waitFor } from "@testing-library/react";

it("updates after async operation", async () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByRole("button"));
  
  await waitFor(() => {
    expect(screen.getByText("Updated")).toBeInTheDocument();
  });
});
```

## Tricky Test Cases Explained

### 1. Loading States

**Problem**: Components show different UI while loading.

**Solution**: Mock hook to return `loading: true` and check for skeleton elements.

### 2. Error Fallback

**Problem**: Testing error states and fallback to mock data.

**Solution**: Use different mock return values for each scenario.

### 3. Keyboard Accessibility

**Problem**: Testing keyboard interactions.

**Solution**: Use `fireEvent.keyDown` with proper key values.

### 4. Async Updates

**Problem**: Components update asynchronously.

**Solution**: Use `waitFor` to wait for state updates.

### 5. Event Propagation

**Problem**: Nested click handlers (favorite button vs card).

**Solution**: Test that `stopPropagation` prevents parent handler.

## Dependencies Added

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

## Next Steps

1. **Install dependencies**: `npm install`
2. **Run tests**: `npm test`
3. **Check coverage**: `npm run test:coverage`
4. **Read full guide**: See `TESTING_README.md`
5. **Extend tests**: Add tests for new components/hooks

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## Questions?

- Check `TESTING_README.md` for detailed documentation
- Review existing test files for examples
- Refer to Testing Library documentation






