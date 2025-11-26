/**
 * Comments Hooks Index
 * 
 * Centralized export for all comment-related hooks.
 * These hooks provide a clean API for comment CRUD operations
 * backed by Supabase via Next.js API routes.
 * 
 * All hooks follow a consistent pattern:
 * - Fetch data from /api/comments endpoints
 * - Handle loading and error states
 * - Return standardized { data, error } format
 * - Include proper TypeScript types
 */

// Export useComments from the comments folder
export { useComments } from './useComments';

// Export other comment hooks from parent hooks directory
// These will be moved to this folder in a future refactor
export { useCreateComment } from '../useCreateComment';
export { useUpdateComment } from '../useUpdateComment';
export { useDeleteComment } from '../useDeleteComment';
