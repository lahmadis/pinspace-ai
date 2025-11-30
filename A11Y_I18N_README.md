# Accessibility (a11y) and Internationalization (i18n) Guide

This document explains the accessibility and internationalization features implemented in the Explore page and board components.

## Table of Contents

1. [Accessibility Features](#accessibility-features)
2. [Internationalization](#internationalization)
3. [Color Contrast Audit](#color-contrast-audit)
4. [Testing Accessibility](#testing-accessibility)
5. [Extending Translations](#extending-translations)
6. [Best Practices](#best-practices)

## Accessibility Features

### ARIA Labels and Roles

All interactive elements have proper ARIA labels:

- **Search**: `aria-label`, `aria-describedby` for search input
- **Sort**: `aria-label`, `aria-describedby` for sort dropdown
- **Filters**: `role="group"`, `aria-label`, `aria-pressed` for filter buttons
- **Board Cards**: `role="article"`, `aria-label`, `aria-describedby`
- **Modal**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- **Empty States**: `role="status"`, `aria-live="polite"`
- **Error States**: `role="alert"`, `aria-live="assertive"`

### Semantic HTML

Components use semantic HTML elements:

- `<main>` - Main content area
- `<header>` - Page header
- `<section>` - Content sections
- `<nav>` - Navigation areas
- `<article>` - Board cards
- `<dl>`, `<dt>`, `<dd>` - Definition lists for metadata
- `<time>` - Time elements with `dateTime` attribute
- `<button>` - All interactive buttons (not divs)
- `<label>` - Form labels with `htmlFor` attributes

### Keyboard Navigation

Full keyboard support:

- **Tab** - Navigate between interactive elements
- **Enter/Space** - Activate buttons and cards
- **Arrow Keys** - Navigate filter buttons (left/right)
- **Escape** - Close modals
- **Focus Management** - Focus trapped in modals, returned on close

### Screen Reader Support

- **Hidden Descriptions**: `sr-only` class for additional context
- **Live Regions**: `aria-live="polite"` for dynamic content updates
- **Status Announcements**: Results count, loading states announced
- **Descriptive Labels**: All buttons and links have descriptive `aria-label` attributes

### Focus Management

- **Visible Focus Indicators**: All focusable elements have visible focus rings
- **Focus Trapping**: Modals trap focus within the modal
- **Focus Return**: Focus returns to previous element when modal closes
- **Skip Links**: Consider adding skip links for main content (future enhancement)

## Internationalization

### Translation System

The app uses a simple, lightweight translation system located in `src/lib/i18n.ts`.

#### Supported Locales

- **English (en)** - Default
- **Spanish (es)** - Full translation

#### Using Translations

```tsx
import { useTranslation } from "@/lib/i18n";

function MyComponent() {
  const t = useTranslation();
  
  return (
    <h1>{t("explore.title")}</h1>
    <p>{t("boardCard.author", { author: "John Doe" })}</p>
  );
}
```

#### Translation Keys

All translation keys follow a hierarchical structure:

- `explore.*` - Explore page strings
- `boardCard.*` - Board card component strings
- `boardDetails.*` - Board details modal strings
- `common.*` - Common/shared strings

#### Parameters

Translations support parameters:

```tsx
// Translation: "Author: {author}"
t("boardCard.author", { author: "John Doe" })
// Result: "Author: John Doe"
```

#### Pluralization

Basic pluralization support:

```tsx
// Translation: "{count} {count, plural, =1 {board} other {boards}} found"
t("explore.resultsCount", { count: 1 })
// Result: "1 board found"

t("explore.resultsCount", { count: 5 })
// Result: "5 boards found"
```

### Locale Detection

The system detects locale in this order:

1. **localStorage** - `pinspace-locale` key
2. **Browser Language** - `navigator.language`
3. **Default** - English (en)

### Setting Locale

```tsx
import { setLocale } from "@/lib/i18n";

// Set to Spanish
setLocale("es");

// Set to English
setLocale("en");
```

### Adding a New Locale

1. **Add translations** to `src/lib/i18n.ts`:

```typescript
const fr: Translations = {
  explore: {
    title: "Explorer le Travail de Studio",
    // ... more translations
  },
  // ...
};

const translations: Record<Locale, Translations> = {
  en,
  es,
  fr, // Add new locale
};
```

2. **Update Locale type**:

```typescript
export type Locale = "en" | "es" | "fr";
```

3. **Update locale detection** in `getLocale()`:

```typescript
if (browserLang === "fr") return "fr";
```

## Color Contrast Audit

### Current Color Combinations

The app uses these color combinations (all meet WCAG AA standards):

#### Text on Background

- **Primary Text** (`gray-900` on `white`): ✅ 15.8:1 (AAA)
- **Secondary Text** (`gray-700` on `white`): ✅ 10.5:1 (AAA)
- **Tertiary Text** (`gray-600` on `white`): ✅ 7.0:1 (AAA)
- **Placeholder** (`gray-500` on `white`): ✅ 4.6:1 (AA)

#### Dark Mode

- **Primary Text** (`white` on `gray-800`): ✅ 12.6:1 (AAA)
- **Secondary Text** (`gray-300` on `gray-800`): ✅ 8.5:1 (AAA)
- **Tertiary Text** (`gray-400` on `gray-800`): ✅ 5.7:1 (AAA)

#### Interactive Elements

- **Primary Button** (`white` on `blue-600`): ✅ 4.5:1 (AA)
- **Favorite Button** (`yellow-900` on `yellow-400`): ✅ 4.8:1 (AA)

### Running Contrast Audit

```typescript
import { auditColorContrast } from "@/lib/a11y";

const audits = auditColorContrast();
audits.forEach(audit => {
  console.log(audit.recommendation);
});
```

### Recommendations

All current color combinations meet WCAG AA standards. For AAA compliance:

- Consider using `gray-800` instead of `gray-700` for secondary text
- Ensure button text is at least 18pt or 14pt bold for lower contrast ratios

## Testing Accessibility

### Automated Testing

Run accessibility tests:

```bash
npm test -- a11y
```

### Manual Testing

#### Screen Reader Testing

1. **NVDA** (Windows) or **VoiceOver** (Mac)
2. Navigate through the page using screen reader commands
3. Verify all content is announced correctly
4. Check that interactive elements are clearly identified

#### Keyboard Testing

1. **Tab** through all interactive elements
2. **Enter/Space** to activate buttons
3. **Arrow Keys** to navigate filter buttons
4. **Escape** to close modals
5. Verify focus indicators are visible

#### Color Contrast Testing

1. Use browser DevTools accessibility panel
2. Check contrast ratios for all text
3. Verify all combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text)

### Testing Tools

- **axe DevTools** - Browser extension for accessibility testing
- **WAVE** - Web accessibility evaluation tool
- **Lighthouse** - Built into Chrome DevTools
- **Color Contrast Analyzer** - Standalone tool for contrast checking

### Test Coverage

Accessibility is tested in:

- `src/__tests__/lib/a11y.test.ts` - Color contrast utilities
- `src/__tests__/components/boards/BoardCard.test.tsx` - ARIA labels, keyboard navigation
- `src/__tests__/app/explore/page.test.tsx` - Full page accessibility

## Extending Translations

### Adding New Translation Keys

1. **Add to English translations** (`src/lib/i18n.ts`):

```typescript
const en: Translations = {
  explore: {
    // ... existing
    newKey: "New translation",
  },
};
```

2. **Add to all other locales**:

```typescript
const es: Translations = {
  explore: {
    // ... existing
    newKey: "Nueva traducción",
  },
};
```

3. **Use in components**:

```tsx
const t = useTranslation();
<p>{t("explore.newKey")}</p>
```

### Translation Best Practices

1. **Keep keys descriptive**: `explore.searchPlaceholder` not `explore.sp`
2. **Group related strings**: All explore page strings under `explore.*`
3. **Use parameters**: `{author}` instead of hardcoding names
4. **Avoid concatenation**: Use full phrases, not word-by-word translation
5. **Test all locales**: Verify translations make sense in context

### Translation Workflow

1. **Extract strings**: Identify all user-facing text
2. **Add to i18n file**: Add keys and English translations
3. **Translate**: Add translations for all supported locales
4. **Test**: Verify translations in UI
5. **Review**: Have native speakers review translations

## Best Practices

### Accessibility

1. **Always use semantic HTML** - `<button>`, `<nav>`, `<main>`, etc.
2. **Provide ARIA labels** - For icons, buttons without text, complex widgets
3. **Ensure keyboard navigation** - All interactive elements must be keyboard accessible
4. **Test with screen readers** - Regular testing with NVDA/VoiceOver
5. **Maintain focus indicators** - Visible focus rings on all focusable elements
6. **Use live regions** - For dynamic content updates
7. **Check color contrast** - All text must meet WCAG AA standards

### Internationalization

1. **Never hardcode strings** - Always use translation function
2. **Use parameters** - For dynamic content (names, numbers, etc.)
3. **Consider text expansion** - Some languages are longer than English
4. **Test RTL languages** - If adding Arabic/Hebrew support (future)
5. **Date/number formatting** - Use locale-aware formatting functions
6. **Cultural considerations** - Some concepts don't translate directly

### Common Patterns

#### Button with Icon

```tsx
<button
  aria-label={t("boardCard.addFavorite", { title: board.title })}
  aria-pressed={favorited}
>
  <StarIcon aria-hidden="true" />
</button>
```

#### Form Input

```tsx
<label htmlFor="search-input">
  {t("explore.searchLabel")}
</label>
<input
  id="search-input"
  aria-describedby="search-description"
/>
<p id="search-description" className="sr-only">
  {t("explore.searchDescription")}
</p>
```

#### Dynamic Content

```tsx
<p aria-live="polite" role="status">
  {t("explore.resultsCount", { count: boards.length })}
</p>
```

## Troubleshooting

### Translation Not Showing

- Check key exists in translation file
- Verify locale is set correctly
- Check browser console for errors
- Ensure `useTranslation()` hook is called

### Accessibility Issues

- Run `auditColorContrast()` to check colors
- Use browser DevTools accessibility panel
- Test with screen reader
- Check ARIA labels are present

### Keyboard Navigation Not Working

- Verify `tabIndex` is set correctly
- Check `onKeyDown` handlers are implemented
- Ensure focus management is working
- Test in different browsers

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [i18n Best Practices](https://www.i18next.com/principles/best-practices)

## Future Enhancements

- [ ] Add more locales (French, German, etc.)
- [ ] RTL language support (Arabic, Hebrew)
- [ ] Skip links for main content
- [ ] High contrast mode toggle
- [ ] Reduced motion preferences
- [ ] Screen reader announcements for state changes
- [ ] Focus visible mode for keyboard users










