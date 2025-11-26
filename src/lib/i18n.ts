/**
 * Internationalization (i18n) System
 * 
 * Simple translation system for PinSpace app.
 * 
 * Usage:
 * ```tsx
 * import { useTranslation } from "@/lib/i18n";
 * 
 * function MyComponent() {
 *   const t = useTranslation();
 *   return <h1>{t("explore.title")}</h1>;
 * }
 * ```
 * 
 * To add a new locale:
 * 1. Add translation object to `translations` below
 * 2. Export locale code
 * 3. Update `getLocale()` to detect new locale
 */

export type Locale = "en" | "es";

export interface Translations {
  [key: string]: string | Translations;
}

/**
 * English translations (default)
 */
const en: Translations = {
  explore: {
    title: "Explore Studio Work",
    description: "Browse architecture studio boards from institutions around the world",
    searchPlaceholder: "Search boards, authors, or institutions...",
    searchLabel: "Search boards, authors, or institutions",
    searchDescription: "Search will filter boards by title, author name, or institution",
    sortLabel: "Sort boards by",
    sortDescription: "Choose to sort boards by most recent, most popular, title, author, or institution",
    sortRecent: "Most Recent",
    sortPopular: "Most Popular",
    sortTitle: "Title (A-Z)",
    sortAuthor: "Author (A-Z)",
    sortInstitution: "Institution (A-Z)",
    filterLabel: "Filter by institution",
    filterDescription: "Use arrow keys to navigate between filter buttons, Enter or Space to select",
    filterAll: "All",
    resultsCount: "{count, plural, =1 {1 board found} other {{count} boards found}}",
    resultsFiltering: "Filtering...",
    emptyTitle: "No boards found",
    emptyMessage: "There are no boards available at the moment.",
    emptyFilteredMessage: "We couldn't find any boards matching your search or filters.",
    emptyClearFilters: "Clear Filters",
    emptyViewAll: "View All Boards",
    emptyTips: "Tips:",
    emptyTip1: "Try different search terms",
    emptyTip2: "Select a different institution",
    emptyTip3: "Check your spelling",
    loading: "Loading boards",
    errorTitle: "Unable to load boards",
    errorRetry: "Try Again",
    errorReload: "Reload Page",
    fallbackNote: "Note:",
    fallbackMessage: "Showing sample boards. API connection unavailable.",
    fallbackUsingSample: "Using sample data",
    fallbackDescription: "Unable to connect to server. Showing sample boards for demonstration.",
  },
  boardCard: {
    clickToView: "Click to view board details",
    author: "Author: {author}",
    institution: "Institution: {institution}",
    lastEdited: "Last edited {time}",
    addFavorite: "Add {title} to favorites",
    removeFavorite: "Remove {title} from favorites",
    noPreview: "No preview",
    description: "Board titled {title} created by {author} from {institution}. Last edited {time}. Press Enter or Space to view board details. Press Tab to access favorite button.",
  },
  boardDetails: {
    close: "Close board details",
    viewBoard: "View Board",
    closeButton: "Close",
    author: "Author",
    institution: "Institution",
    lastEdited: "Last Edited",
    contact: "Contact",
    contactUnavailable: "Contact info unavailable",
    description: "Description",
    noDescription: "No description available for this board.",
    modalDescription: "Board details for {title} by {author} from {institution}. Last edited {time}. Press Escape to close this modal.",
    noPreview: "No preview available",
  },
  common: {
    loading: "Loading...",
    error: "Error",
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    selected: "currently selected",
  },
};

/**
 * Spanish translations
 */
const es: Translations = {
  explore: {
    title: "Explorar Trabajos de Estudio",
    description: "Explora tableros de estudio de arquitectura de instituciones de todo el mundo",
    searchPlaceholder: "Buscar tableros, autores o instituciones...",
    searchLabel: "Buscar tableros, autores o instituciones",
    searchDescription: "La búsqueda filtrará los tableros por título, nombre del autor o institución",
    sortLabel: "Ordenar tableros por",
    sortDescription: "Elige ordenar los tableros por más recientes, más populares, título, autor o institución",
    sortRecent: "Más Recientes",
    sortPopular: "Más Populares",
    sortTitle: "Título (A-Z)",
    sortAuthor: "Autor (A-Z)",
    sortInstitution: "Institución (A-Z)",
    filterLabel: "Filtrar por institución",
    filterDescription: "Usa las teclas de flecha para navegar entre los botones de filtro, Enter o Espacio para seleccionar",
    filterAll: "Todos",
    resultsCount: "{count, plural, =1 {1 tablero encontrado} other {{count} tableros encontrados}}",
    resultsFiltering: "Filtrando...",
    emptyTitle: "No se encontraron tableros",
    emptyMessage: "No hay tableros disponibles en este momento.",
    emptyFilteredMessage: "No pudimos encontrar ningún tablero que coincida con tu búsqueda o filtros.",
    emptyClearFilters: "Limpiar Filtros",
    emptyViewAll: "Ver Todos los Tableros",
    emptyTips: "Consejos:",
    emptyTip1: "Prueba diferentes términos de búsqueda",
    emptyTip2: "Selecciona una institución diferente",
    emptyTip3: "Verifica tu ortografía",
    loading: "Cargando tableros",
    errorTitle: "No se pudieron cargar los tableros",
    errorRetry: "Intentar de Nuevo",
    errorReload: "Recargar Página",
    fallbackNote: "Nota:",
    fallbackMessage: "Mostrando tableros de muestra. Conexión a la API no disponible.",
    fallbackUsingSample: "Usando datos de muestra",
    fallbackDescription: "No se pudo conectar al servidor. Mostrando tableros de muestra para demostración.",
  },
  boardCard: {
    clickToView: "Haz clic para ver los detalles del tablero",
    author: "Autor: {author}",
    institution: "Institución: {institution}",
    lastEdited: "Última edición {time}",
    addFavorite: "Agregar {title} a favoritos",
    removeFavorite: "Quitar {title} de favoritos",
    noPreview: "Sin vista previa",
    description: "Tablero titulado {title} creado por {author} de {institution}. Última edición {time}. Presiona Enter o Espacio para ver los detalles del tablero. Presiona Tab para acceder al botón de favoritos.",
  },
  boardDetails: {
    close: "Cerrar detalles del tablero",
    viewBoard: "Ver Tablero",
    closeButton: "Cerrar",
    author: "Autor",
    institution: "Institución",
    lastEdited: "Última Edición",
    contact: "Contacto",
    contactUnavailable: "Información de contacto no disponible",
    description: "Descripción",
    noDescription: "No hay descripción disponible para este tablero.",
    modalDescription: "Detalles del tablero {title} por {author} de {institution}. Última edición {time}. Presiona Escape para cerrar este modal.",
    noPreview: "Vista previa no disponible",
  },
  common: {
    loading: "Cargando...",
    error: "Error",
    retry: "Reintentar",
    cancel: "Cancelar",
    save: "Guardar",
    delete: "Eliminar",
    edit: "Editar",
    close: "Cerrar",
    selected: "actualmente seleccionado",
  },
};

/**
 * All translations by locale
 */
const translations: Record<Locale, Translations> = {
  en,
  es,
};

/**
 * Get current locale from browser or default to English
 */
export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  
  // Check localStorage first
  const stored = localStorage.getItem("pinspace-locale") as Locale | null;
  if (stored && (stored === "en" || stored === "es")) {
    return stored;
  }
  
  // Check browser language
  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "es") return "es";
  
  return "en";
}

/**
 * Set locale and save to localStorage
 */
export function setLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("pinspace-locale", locale);
}

/**
 * Get translation by key path (e.g., "explore.title")
 */
export function getTranslation(
  key: string,
  locale: Locale = getLocale(),
  params?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let value: any = translations[locale];
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === "object" && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }
  
  if (typeof value !== "string") {
    return key;
  }
  
  // Replace parameters
  if (params) {
    // First handle pluralization
    let result = value.replace(/\{(\w+), plural, =1 \{([^}]+)\} other \{([^}]+)\}\}/g, (match, paramKey, singular, plural) => {
      const paramValue = params[paramKey];
      if (paramValue === undefined) return match;
      const count = Number(paramValue);
      return count === 1 ? singular : plural;
    });
    
    // Then replace remaining parameters
    result = result.replace(/\{(\w+)\}/g, (match, paramKey) => {
      const paramValue = params[paramKey];
      if (paramValue === undefined) return match;
      return String(paramValue);
    });
    
    return result;
  }
  
  return value;
}

/**
 * React hook for translations
 * 
 * @example
 * ```tsx
 * const t = useTranslation();
 * <h1>{t("explore.title")}</h1>
 * <p>{t("boardCard.author", { author: "John Doe" })}</p>
 * ```
 */
export function useTranslation() {
  const locale = getLocale();
  
  return (key: string, params?: Record<string, string | number>): string => {
    return getTranslation(key, locale, params);
  };
}

/**
 * Format number according to locale
 */
export function formatNumber(value: number, locale: Locale = getLocale()): string {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US").format(value);
}

/**
 * Format date according to locale
 */
export function formatDate(
  date: Date | string,
  locale: Locale = getLocale()
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

