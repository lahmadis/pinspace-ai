/**
 * ========================================================================
 * REFACTORED: Element ID Validation Utility - Supports Both UUID and String IDs
 * ========================================================================
 * 
 * This utility handles element IDs that can be either:
 * - UUID format (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * - Non-UUID string format (e.g., "pdf_page_1764169996932_0", "e_123", etc.)
 * 
 * Database schema:
 * - UUID element IDs → stored in `target_element_id` (UUID column)
 * - Non-UUID element IDs → stored in `target_element_id_text` (TEXT column)
 * 
 * This allows comments to be attached to any element type, regardless of ID format.
 * ========================================================================
 */

/**
 * Validates if a string is a valid UUID format
 * 
 * @param {string} id - String to validate
 * @returns {boolean} - true if the string is a valid UUID, false otherwise
 */
function isValidUUID(id) {
  if (!id || typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id.trim());
}

/**
 * Strips common element ID prefixes to extract the underlying ID
 * 
 * Removes prefixes like "e_", "el_", "img_", "t_", "shape_" to get the raw ID.
 * This is useful when element IDs are prefixed (e.g., "e_550e8400-e29b-41d4-a716-446655440000")
 * but the underlying ID might be a UUID or a non-UUID string.
 * 
 * @param {string|number|null|undefined} id - Element ID that may have prefix
 * @returns {string|null} - Raw ID string (with prefix removed) or null
 */
function stripElementIdPrefix(id) {
  if (id === null || id === undefined) return null;
  const idStr = String(id).trim();
  if (!idStr) return null;
  
  // Common prefixes used in PinSpace element IDs
  const prefixes = ['e_', 'el_', 'img_', 't_', 'shape_'];
  for (const prefix of prefixes) {
    if (idStr.toLowerCase().startsWith(prefix.toLowerCase())) {
      const stripped = idStr.slice(prefix.length);
      return stripped || null;
    }
  }
  
  // No prefix found, return as-is
  return idStr || null;
}

/**
 * Normalizes an element ID by stripping prefixes
 * 
 * This function:
 * 1. Strips common prefixes (e_, el_, img_, t_, shape_)
 * 2. Returns the raw ID (which may be a UUID or non-UUID string)
 * 
 * The database column is TEXT, so both UUIDs and non-UUIDs are supported.
 * 
 * @param {string|number|null|undefined} id - Element ID that may have prefix
 * @returns {string|null} - Normalized element ID (prefix stripped) or null
 */
function normalizeElementId(id) {
  return stripElementIdPrefix(id);
}

/**
 * ========================================================================
 * REFACTORED: Validates and normalizes an element ID for storage
 * ========================================================================
 * 
 * This function now supports BOTH UUID and non-UUID element IDs:
 * 1. Strips prefixes if present (e_, el_, img_, t_, shape_)
 * 2. Determines if the ID is a UUID or a string
 * 3. Returns the normalized ID with type information
 * 
 * Database storage:
 * - UUID IDs → stored in `target_element_id` (UUID column)
 * - Non-UUID IDs → stored in `target_element_id_text` (TEXT column)
 * 
 * @param {string|number|null|undefined} id - Element ID to validate and normalize
 * @returns {{valid: boolean, normalizedId: string|null, isUUID: boolean, error?: string}} - Validation result
 * ========================================================================
 */
function validateAndNormalizeElementId(id) {
  // Handle null/undefined (null is allowed - means no element attached)
  if (id === null || id === undefined) {
    return { valid: true, normalizedId: null, isUUID: false };
  }
  
  // Convert to string and trim
  const idStr = String(id).trim();
  if (!idStr) {
    return { valid: true, normalizedId: null, isUUID: false };
  }
  
  // Strip prefixes
  const normalizedId = normalizeElementId(idStr);
  if (!normalizedId) {
    return { 
      valid: false, 
      normalizedId: null, 
      isUUID: false, 
      error: 'Element ID is empty after removing prefix. Please select a valid element.' 
    };
  }
  
  // Check if it's a valid UUID
  const isUUID = isValidUUID(normalizedId);
  
  // REFACTORED: Both UUID and non-UUID IDs are now valid
  // UUID IDs will be stored in target_element_id (UUID column)
  // Non-UUID IDs will be stored in target_element_id_text (TEXT column)
  return { 
    valid: true, 
    normalizedId, 
    isUUID 
  };
}

// REFACTORED: Converted to ES6 exports to match responseHelper.js pattern
// This allows consistent ES6 import syntax in Next.js API routes
export {
  isValidUUID,
  stripElementIdPrefix,
  normalizeElementId,
  validateAndNormalizeElementId,
};

