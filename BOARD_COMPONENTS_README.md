# Board Components - Usage Guide

This document explains how to use the modular board components throughout PinSpace for building board listing pages (Explore, My Boards, Favorites, Classroom, etc.).

## Overview

The board components are organized into three main categories:

1. **UI Components** (`src/components/ui/`) - Shared, reusable UI primitives
2. **Board Components** (`src/components/boards/`) - Board-specific components
3. **Board Hooks** (`src/hooks/boards/`) - Reusable logic for filtering, sorting, etc.
4. **Types** (`src/types/boards.ts`) - TypeScript type definitions

## Quick Start

### Basic Board List

```tsx
import { BoardList } from "@/components/boards";
import { useBoards } from "@/hooks/useBoards";
import type { BoardSortOption } from "@/types/boards";

function MyBoardsPage() {
  const { boards, loading } = useBoards();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<BoardSortOption>("recent");

  return (
    <BoardList
      boards={boards}
      loading={loading}
      config={{
        filters: { search, selectedInstitution: "All" },
        sortBy,
        displayOptions: {
          showFavorite: true,
          showAuthor: true,
        },
        gridColumns: { sm: 1, md: 2, lg: 3 },
      }}
      handlers={{
        onCardClick: (board) => openModal(board),
        onSearchChange: setSearch,
        onSortChange: setSortBy,
      }}
      institutionOptions={["All", "MIT", "Harvard"]}
    />
  );
}
```

## Component Reference

### BoardList

The main component that combines search, filters, sorting, and grid display.

**Props:**
- `boards: BoardCardData[]` - Array of boards to display
- `loading?: boolean` - Loading state
- `config: BoardListConfig` - Configuration object
- `handlers: BoardListHandlers` - Event handlers
- `institutionOptions?: string[]` - Filter options
- `emptyState?: React.ReactNode` - Custom empty state
- `className?: string` - Additional CSS classes

**Example:**
```tsx
<BoardList
  boards={boards}
  loading={isLoading}
  config={{
    filters: { search: "", selectedInstitution: "All" },
    sortBy: "recent",
    displayOptions: {
      showFavorite: true,
      showAuthor: true,
      showInstitution: true,
      showTimeAgo: true,
      size: "md",
    },
    gridColumns: { sm: 1, md: 2, lg: 3, xl: 4 },
  }}
  handlers={{
    onCardClick: (board) => navigate(`/board/${board.id}`),
    onSearchChange: setSearch,
    onInstitutionFilterChange: setInstitution,
    onSortChange: setSortBy,
  }}
  institutionOptions={institutions}
/>
```

### BoardCard

Individual board card component. Can be used standalone or within BoardGrid.

**Props:**
- `board: BoardCardData` - Board data
- `displayOptions?: BoardCardDisplayOptions` - Display customization
- `onCardClick?: (board: BoardCardData) => void` - Click handler
- `onFavoriteToggle?: (boardId: string, isFavorite: boolean) => void` - Favorite toggle handler

**Example:**
```tsx
<BoardCard
  board={boardData}
  displayOptions={{
    showFavorite: true,
    showAuthor: true,
    size: "md",
  }}
  onCardClick={(board) => openModal(board)}
/>
```

### BoardGrid

Grid layout component for displaying multiple board cards.

**Props:**
- `boards: BoardCardData[]` - Boards to display
- `loading?: boolean` - Show loading skeletons
- `skeletonCount?: number` - Number of skeletons
- `displayOptions?: BoardCardDisplayOptions` - Card display options
- `onCardClick?: (board: BoardCardData) => void` - Click handler
- `gridColumns?: { sm?, md?, lg?, xl? }` - Responsive grid columns

**Example:**
```tsx
<BoardGrid
  boards={filteredBoards}
  loading={isLoading}
  displayOptions={{ showFavorite: true }}
  gridColumns={{ sm: 1, md: 2, lg: 3 }}
  onCardClick={(board) => openModal(board)}
/>
```

### BoardSearchBar

Search input component with loading indicator.

**Props:**
- `value: string` - Search value
- `onChange: (value: string) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `loading?: boolean` - Show loading spinner

**Example:**
```tsx
<BoardSearchBar
  value={search}
  onChange={setSearch}
  placeholder="Search boards..."
  loading={isFiltering}
/>
```

### BoardSortSelect

Sort dropdown component.

**Props:**
- `value: BoardSortOption` - Current sort option
- `onChange: (value: BoardSortOption) => void` - Change handler
- `options?: Array<{ value: BoardSortOption; label: string }>` - Sort options
- `loading?: boolean` - Show loading spinner

**Example:**
```tsx
<BoardSortSelect
  value={sortBy}
  onChange={setSortBy}
  options={[
    { value: "recent", label: "Most Recent" },
    { value: "popular", label: "Most Popular" },
  ]}
  loading={isFiltering}
/>
```

### BoardFilterButtons

Filter button group component.

**Props:**
- `options: string[]` - Filter options
- `selectedValue: string` - Currently selected value
- `onChange: (value: string) => void` - Change handler
- `label?: string` - ARIA label

**Example:**
```tsx
<BoardFilterButtons
  options={["All", "MIT", "Harvard"]}
  selectedValue={selectedInstitution}
  onChange={setSelectedInstitution}
  label="Filter by institution"
/>
```

### BoardDetailsModal

Modal component for displaying board details.

**Props:**
- `isOpen: boolean` - Whether modal is open
- `onClose: () => void` - Close handler
- `board: BoardCardData | null` - Board data

**Example:**
```tsx
<BoardDetailsModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  board={selectedBoard}
/>
```

## Hooks

### useBoardFilters

Hook for filtering and sorting boards.

```tsx
import { useBoardFilters } from "@/hooks/boards";

const filteredBoards = useBoardFilters(boards, {
  search: "architecture",
  selectedInstitution: "MIT",
  sortBy: "recent",
});
```

### useBoardSearch

Hook for search with optional debouncing.

```tsx
import { useBoardSearch } from "@/hooks/boards";

const { search, setSearch, debouncedSearch } = useBoardSearch(300);
```

## Types

All types are exported from `@/types/boards`:

- `BoardCardData` - Board data structure
- `BoardCardDisplayOptions` - Card display customization
- `BoardFilterCriteria` - Filter criteria
- `BoardSortOption` - Sort options
- `BoardListConfig` - List configuration
- `BoardListHandlers` - Event handlers

## Design System

All components use consistent design tokens:

- **Primary Color**: `blue-600` / `blue-700` (hover)
- **Secondary Color**: `gray-100` / `gray-200` (hover)
- **Border**: `gray-200` (light) / `gray-700` (dark)
- **Text**: `gray-900` (light) / `white` (dark)
- **Spacing**: Consistent padding and margins
- **Dark Mode**: Full support via Tailwind `dark:` classes

## Examples

### My Boards Page

```tsx
import { BoardList } from "@/components/boards";
import { useBoards } from "@/hooks/useBoards";

function MyBoardsPage() {
  const { boards, loading } = useBoards();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<BoardSortOption>("recent");

  // Filter to only user's boards
  const myBoards = boards.filter(board => board.authorName === currentUser.name);

  return (
    <BoardList
      boards={myBoards}
      loading={loading}
      config={{
        filters: { search },
        sortBy,
        displayOptions: {
          showFavorite: false, // Don't show favorite on own boards
          showAuthor: false,   // Don't show author (it's you)
        },
      }}
      handlers={{
        onCardClick: (board) => router.push(`/board/${board.id}`),
        onSearchChange: setSearch,
        onSortChange: setSortBy,
      }}
    />
  );
}
```

### Favorites Page

```tsx
import { BoardList } from "@/components/boards";
import { useFavorites } from "@/hooks/useFavorites";
import { useBoards } from "@/hooks/useBoards";

function FavoritesPage() {
  const { boards } = useBoards();
  const { favorites } = useFavorites();
  const [search, setSearch] = useState("");

  // Filter to only favorited boards
  const favoriteBoards = boards.filter(board => favorites.has(board.id));

  return (
    <BoardList
      boards={favoriteBoards}
      config={{
        filters: { search },
        sortBy: "recent",
        displayOptions: {
          showFavorite: true,
        },
      }}
      handlers={{
        onCardClick: (board) => openModal(board),
        onSearchChange: setSearch,
      }}
    />
  );
}
```

## Customization

### Custom Card Layout

You can customize card appearance via `displayOptions`:

```tsx
displayOptions={{
  showFavorite: true,      // Show/hide favorite button
  showAuthor: true,        // Show/hide author name
  showInstitution: true,   // Show/hide institution
  showTimeAgo: true,       // Show/hide time ago
  showPreview: true,       // Show/hide preview image
  size: "md",              // Card size: "sm" | "md" | "lg"
  layout: "grid",         // Layout: "grid" | "list" (future)
}}
```

### Custom Empty State

```tsx
<BoardList
  boards={boards}
  emptyState={
    <div>
      <h2>No boards found</h2>
      <p>Create your first board to get started!</p>
      <Button onClick={createBoard}>Create Board</Button>
    </div>
  }
/>
```

### Custom Grid Columns

```tsx
gridColumns={{
  sm: 1,   // 1 column on small screens
  md: 2,   // 2 columns on medium screens
  lg: 3,   // 3 columns on large screens
  xl: 4,   // 4 columns on extra large screens
}}
```

## Best Practices

1. **Use BoardList for full-featured pages** - It includes search, filters, sorting, and grid
2. **Use BoardGrid for simple displays** - When you only need the grid layout
3. **Use BoardCard for custom layouts** - When you need full control over card rendering
4. **Leverage hooks for shared logic** - `useBoardFilters`, `useBoardSearch` can be used independently
5. **Customize via props** - Use `displayOptions` to show/hide features per page
6. **Follow design tokens** - Use shared UI components (`Button`, `Input`, `Card`) for consistency

## Migration Guide

If you have existing board listing code:

1. Replace custom card components with `BoardCard`
2. Replace search/filter UI with `BoardSearchBar`, `BoardSortSelect`, `BoardFilterButtons`
3. Replace grid layout with `BoardGrid` or `BoardList`
4. Use `useBoardFilters` hook instead of custom filtering logic
5. Update types to use `BoardCardData` from `@/types/boards`

## Support

For questions or issues, refer to:
- Component JSDoc comments
- Type definitions in `src/types/boards.ts`
- Example usage in `src/app/explore/page.tsx`










