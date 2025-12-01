# Testing Guide - Explore Page & Board Components

This document explains how to test the Explore page and reusable board components/hooks.

## Overview

The test suite uses:
- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers for DOM assertions

## Test Structure

```
src/
├── __tests__/
│   ├── __mocks__/          # Mock data and implementations
│   │   ├── mockData.ts      # Sample board data
│   │   ├── useBoards.ts     # Mock useBoards hook
│   │   └── useFavorites.ts # Mock useFavorites hook
│   ├── utils/
│   │   └── testUtils.tsx   # Testing utilities
│   ├── components/
│   │   └── boards/
│   │       └── BoardCard.test.tsx
│   ├── hooks/
│   │   └── boards/
│   │       └── useBoardFilters.test.ts
│   └── app/
│       └── explore/
│           └── page.test.tsx
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (re-runs on file changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run tests in watch mode with coverage
```bash
npm run test:ui
```

### Run a specific test file
```bash
npm test -- BoardCard.test.tsx
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="renders"
```

## Test Files

### BoardCard Component Tests (`BoardCard.test.tsx`)

Tests the individual board card component:

**What it tests:**
- ✅ Rendering with all board information
- ✅ Display options (show/hide author, institution, etc.)
- ✅ Click interactions (card click, favorite toggle)
- ✅ Keyboard accessibility (Enter, Space keys)
- ✅ Favorite state (favorited vs unfavorited)
- ✅ ARIA labels and accessibility attributes
- ✅ Preview image and fallback behavior

**Key test cases:**
- **Rendering**: Verifies all board data is displayed correctly
- **Display Options**: Tests conditional rendering based on `displayOptions` prop
- **Interactions**: Tests click handlers and keyboard navigation
- **Favorite State**: Tests favorite button behavior and state
- **Accessibility**: Ensures proper ARIA labels and keyboard support

**Example:**
```tsx
it("calls onCardClick when card is clicked", () => {
  const mockOnCardClick = jest.fn();
  render(<BoardCard board={board} onCardClick={mockOnCardClick} />);
  
  fireEvent.click(screen.getByRole("article"));
  expect(mockOnCardClick).toHaveBeenCalledWith(board);
});
```

### useBoardFilters Hook Tests (`useBoardFilters.test.ts`)

Tests the filtering and sorting logic:

**What it tests:**
- ✅ Text search (title, author, institution)
- ✅ Institution filtering
- ✅ Sorting (recent, title, author, institution)
- ✅ Combined filters (search + institution + sort)
- ✅ Edge cases (empty arrays, missing fields)

**Key test cases:**
- **Text Search**: Case-insensitive search across multiple fields
- **Institution Filter**: Filters boards by selected institution
- **Sorting**: Verifies correct sort order for each sort option
- **Combined Filters**: Tests that multiple filters work together
- **Edge Cases**: Handles empty arrays and missing data gracefully

**Example:**
```tsx
it("filters boards by title", () => {
  const { result } = renderHook(() =>
    useBoardFilters(boards, {
      search: "Urban",
      selectedInstitution: "All",
      sortBy: "recent",
    })
  );
  
  expect(result.current).toHaveLength(1);
  expect(result.current[0].title).toBe("Urban Housing Complex");
});
```

### Explore Page Integration Tests (`page.test.tsx`)

Tests the full Explore page with all features:

**What it tests:**
- ✅ Page rendering (header, sidebar, board list)
- ✅ Loading states (skeletons)
- ✅ Error states (error message, retry button)
- ✅ Fallback states (mock data warning)
- ✅ Empty states (no boards message)
- ✅ Search functionality
- ✅ Institution filtering
- ✅ Sorting
- ✅ Modal interactions (open, close, keyboard)
- ✅ Results count

**Key test cases:**
- **Loading State**: Shows skeletons while data loads
- **Error Handling**: Displays error message and retry option
- **Search**: Filters boards as user types
- **Filters**: Institution buttons filter correctly
- **Sorting**: Dropdown changes sort order
- **Modal**: Opens/closes correctly with keyboard support
- **Results Count**: Updates when filters change

**Example:**
```tsx
it("filters boards when search text is entered", async () => {
  render(<ExplorePage />);
  
  const searchInput = screen.getByPlaceholderText(/Search/i);
  fireEvent.change(searchInput, { target: { value: "Urban" } });
  
  await waitFor(() => {
    expect(screen.getByText("Urban Housing Complex")).toBeInTheDocument();
  });
});
```

## Mock Data

### Using Mock Data

All tests use mock data from `src/__tests__/__mocks__/mockData.ts`:

```tsx
import { mockBoards, singleBoard } from "@/__tests__/__mocks__/mockData";
```

### Mock Hooks

Hooks are mocked to avoid API calls:

```tsx
jest.mock("@/hooks/useBoards", () => ({
  useBoards: jest.fn(),
}));

// In test:
(useBoards as jest.Mock).mockReturnValue({
  boards: mockBoards,
  loading: false,
  error: null,
});
```

## Tricky Test Cases

### 1. Loading States

**Challenge**: Components show different UI while loading (skeletons vs actual content).

**Solution**: Mock the hook to return `loading: true` and check for skeleton elements:

```tsx
it("shows loading skeletons when loading", () => {
  (useBoards as jest.Mock).mockReturnValue({
    boards: [],
    loading: true,
  });
  
  render(<ExplorePage />);
  const skeletons = document.querySelectorAll(".animate-pulse");
  expect(skeletons.length).toBeGreaterThan(0);
});
```

### 2. Error Fallback

**Challenge**: Testing error states and fallback to mock data.

**Solution**: Mock different hook return values:

```tsx
// Error state
(useBoards as jest.Mock).mockReturnValue({
  boards: [],
  loading: false,
  error: "Network error",
  usingFallback: false,
});

// Fallback state
(useBoards as jest.Mock).mockReturnValue({
  boards: mockBoards,
  loading: false,
  error: null,
  usingFallback: true,
});
```

### 3. Keyboard Accessibility

**Challenge**: Testing keyboard interactions (Enter, Space, Escape).

**Solution**: Use `fireEvent.keyDown` with proper key values:

```tsx
it("calls onCardClick when Enter key is pressed", () => {
  const mockOnCardClick = jest.fn();
  render(<BoardCard board={board} onCardClick={mockOnCardClick} />);
  
  const card = screen.getByRole("article");
  fireEvent.keyDown(card, { key: "Enter" });
  
  expect(mockOnCardClick).toHaveBeenCalled();
});
```

### 4. Async State Updates

**Challenge**: Components update asynchronously (filters, search).

**Solution**: Use `waitFor` to wait for state updates:

```tsx
it("filters boards when search text is entered", async () => {
  render(<ExplorePage />);
  
  fireEvent.change(searchInput, { target: { value: "Urban" } });
  
  await waitFor(() => {
    expect(screen.getByText("Urban Housing Complex")).toBeInTheDocument();
  });
});
```

### 5. Event Propagation

**Challenge**: Favorite button click shouldn't trigger card click.

**Solution**: Test that `stopPropagation` is called:

```tsx
it("does not call onCardClick when favorite button is clicked", () => {
  const mockOnCardClick = jest.fn();
  render(<BoardCard board={board} onCardClick={mockOnCardClick} />);
  
  const favoriteButton = screen.getByRole("button", { name: /favorite/i });
  fireEvent.click(favoriteButton);
  
  expect(mockOnCardClick).not.toHaveBeenCalled();
});
```

## Writing New Tests

### Component Test Template

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import MyComponent from "@/components/MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("handles user interaction", () => {
    const mockHandler = jest.fn();
    render(<MyComponent onClick={mockHandler} />);
    
    fireEvent.click(screen.getByRole("button"));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### Hook Test Template

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

## Best Practices

1. **Use descriptive test names**: `"renders board card with all information"` not `"renders"`

2. **Test user behavior, not implementation**: Test what users see and do, not internal state

3. **Use accessibility queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`

4. **Clean up between tests**: Use `beforeEach` to reset mocks and state

5. **Test edge cases**: Empty states, error states, loading states

6. **Use async utilities**: `waitFor` for async updates, `findBy*` for async elements

7. **Mock external dependencies**: Mock API calls, hooks, and Next.js router

## Coverage Goals

Aim for:
- **Components**: 80%+ coverage
- **Hooks**: 90%+ coverage
- **Pages**: 70%+ coverage (focus on critical paths)

View coverage report:
```bash
npm run test:coverage
```

Open `coverage/lcov-report/index.html` in browser for detailed coverage.

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure all imports use `@/` alias (configured in `jest.config.js`)

### Tests fail with "localStorage is not defined"
- `jest.setup.js` includes localStorage mock

### Tests fail with "matchMedia is not defined"
- `jest.setup.js` includes matchMedia mock

### Components not rendering
- Check that all required props are provided
- Verify mocks are set up correctly
- Check console for errors

## Extending Tests

### Adding a New Component Test

1. Create test file: `src/__tests__/components/MyComponent.test.tsx`
2. Import component and testing utilities
3. Write tests for rendering, interactions, edge cases
4. Run: `npm test -- MyComponent.test.tsx`

### Adding a New Hook Test

1. Create test file: `src/__tests__/hooks/useMyHook.test.ts`
2. Use `renderHook` from `@testing-library/react`
3. Test return values, side effects, edge cases
4. Run: `npm test -- useMyHook.test.ts`

### Adding Mock Data

1. Add to `src/__tests__/__mocks__/mockData.ts`
2. Export for use in tests
3. Follow existing `BoardCardData` interface

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

## Questions?

Refer to:
- Component JSDoc comments
- Existing test files for examples
- Testing Library documentation











