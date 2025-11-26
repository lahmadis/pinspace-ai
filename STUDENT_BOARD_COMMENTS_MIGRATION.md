# Student Board Comments Migration to Supabase

## Current State

The student board (`app/student-board/[id]/page.tsx`) currently uses a local state-based comment system:
- Comments are stored as `Map<string, string[]>` (elementId -> comments array)
- Comments are persisted in localStorage via `studentBoardStorage.ts`
- Comments are synced via collaboration hooks

## Migration Plan

To migrate student board comments to the unified Supabase comments table:

1. **Update comment structure**: Convert from `Map<string, string[]>` to `Comment[]` format
2. **Use unified hook**: Replace local state with `useComments({ boardId, elementId?, source? })`
3. **Update comment creation**: Use `/api/comments` POST endpoint instead of local state
4. **Migrate existing data**: Create a migration script to convert localStorage comments to Supabase

## Implementation Notes

- Student board comments should use `source: "studentBoard"` to distinguish from other comment types
- Element IDs in student board may need UUID validation/conversion
- Consider keeping backward compatibility during migration period

## Status

⚠️ **TODO**: Student board comments migration is pending. Currently uses localStorage-based system.


