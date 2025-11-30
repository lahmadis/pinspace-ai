# useBoards Hook - API Integration Guide

## Current Implementation

The `useBoards` hook now fetches from the live API endpoint: `GET /api/boards?public=true`

## API Response Format

**Endpoint:** `/api/boards?public=true`

**Expected Response:**
```json
{
  "boards": [
    {
      "id": "board-123",
      "title": "Board Title",
      "owner": "username",
      "ownerId": "user-id",
      "visibility": "public",
      "isPublic": true,
      "lastEdited": "2024-01-15T10:30:00Z",
      "collaborators": "2",
      "collaboratorIds": ["user-1", "user-2"]
    }
  ]
}
```

## Current Limitations

The API currently doesn't return:
- `authorName` (display name) - currently uses `owner` (username)
- `institution` (school) - currently shows "Unknown Institution"
- `previewImage` (cover image) - currently undefined
- `coverColor` (fallback color) - currently undefined

## How to Add More Fields

### Option 1: Extend API Response

If your backend can include additional fields in the Board response:

1. Update the API endpoint to return:
   ```json
   {
     "id": "board-123",
     "title": "Board Title",
     "owner": "username",
     "authorName": "Display Name",  // NEW
     "school": "MIT",                // NEW
     "coverImage": "https://...",   // NEW
     "coverColor": "#DBEAFE",        // NEW
     ...
   }
   ```

2. Update `transformApiBoardToCardData` in `useBoards.ts`:
   ```typescript
   const authorName = board.authorName || board.owner || "Unknown Author";
   const institution = board.school || "Unknown Institution";
   const previewImage = board.coverImage;
   const coverColor = board.coverColor;
   ```

### Option 2: Fetch Profile Data Separately

If you need to fetch author names and institutions from a profiles API:

1. Add profile fetching in `useBoards.ts`:
   ```typescript
   // Fetch profiles for all board owners
   const ownerIds = [...new Set(publicBoards.map(b => b.ownerId))];
   const profiles = await Promise.all(
     ownerIds.map(id => fetch(`/api/profiles/${id}`).then(r => r.json()))
   );
   const profilesMap = new Map(profiles.map(p => [p.userId, p]));
   ```

2. Use profiles in transformation:
   ```typescript
   const profile = profilesMap.get(board.ownerId);
   const authorName = profile?.displayName || board.owner;
   const institution = profile?.school || "Unknown Institution";
   ```

## Error Handling

The hook handles:
- **Network errors**: Shows error message, falls back to mock data if enabled
- **Empty results**: Falls back to mock data with helpful message
- **Invalid response**: Validates structure, shows error if malformed
- **Retry functionality**: `retry()` function to attempt fetch again

## Fallback Behavior

Set `ENABLE_MOCK_FALLBACK` in `useBoards.ts`:
- `true`: Falls back to mock data on error (default)
- `false`: Shows error state, no fallback

## Testing

To test API integration:
1. Ensure your API endpoint is running
2. Check browser console for API calls and errors
3. Test error scenarios by stopping the API server
4. Verify fallback behavior works correctly










