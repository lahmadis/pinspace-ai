# Supabase Realtime Refactor Summary

## Overview
This document summarizes the refactoring of PinSpace's Live Crit feature from PeerJS peer-to-peer connections to Supabase Realtime subscriptions.

## Changes Made

### 1. Database Schema
**File:** `SUPABASE_CRIT_SESSIONS_SCHEMA.sql`

Created a new `crit_sessions` table to track Live Crit sessions:
- `id` (UUID, primary key)
- `board_id` (UUID, foreign key to boards)
- `session_id` (TEXT, unique, shareable session identifier)
- `status` (TEXT: 'active', 'ended', 'archived')
- `created_by` (TEXT, user who created the session)
- `started_at`, `ended_at` (timestamps)
- `allow_anonymous` (BOOLEAN)
- `max_participants` (INTEGER, optional)

**Realtime Enablement:**
- Enabled Realtime replication for `crit_sessions` table
- Enabled Realtime replication for `comments` table (for live comment updates)

### 2. API Routes
**Files:**
- `pages/api/crit-sessions/index.js` - List and create crit sessions
- `pages/api/crit-sessions/[id].js` - Get, update, and delete individual sessions

**Endpoints:**
- `GET /api/crit-sessions?boardId={boardId}&status={status}` - List sessions
- `POST /api/crit-sessions` - Create new session
- `GET /api/crit-sessions/[id]` - Get session by ID or session_id
- `PATCH /api/crit-sessions/[id]` - Update session (e.g., end session)
- `DELETE /api/crit-sessions/[id]` - Delete session

### 3. Realtime Library Refactor
**File:** `src/lib/realtime.ts`

**Complete rewrite** from PeerJS to Supabase Realtime:

**Old Implementation (PeerJS):**
- Used PeerJS for peer-to-peer WebRTC connections
- Required direct peer connections between host and guests
- Fallback to localStorage for cross-tab communication

**New Implementation (Supabase Realtime):**
- Uses Supabase Realtime subscriptions to database tables
- Subscribes to `comments` table changes filtered by `board_id`
- Comments are created via API, which triggers Realtime events
- All connected clients receive updates automatically

**Key Functions:**
- `createHost(sessionId, boardId, onMessage)` - Creates session and subscribes to comments
- `createGuestWithRetry(sessionId, boardId)` - Joins session and subscribes to comments
- `makeSessionId(boardId)` - Generates shareable session IDs
- `sanitizeSessionId(raw)` - Sanitizes session IDs for URLs

**Subscription Lifecycle:**
- Subscriptions are created when host/guest connects
- Subscriptions are cleaned up via `destroy()` method
- Channels are properly unsubscribed on component unmount

### 4. Board Page Updates
**File:** `app/board/[id]/page.tsx`

**Changes:**
- Updated `handleStartCrit` to use new `createHost` signature (requires `boardId`)
- Simplified message handler - comments are already in database, just need to refetch
- Updated error handling for Supabase Realtime failures
- Added annotations explaining Supabase Realtime flow

**Key Updates:**
- Host subscribes to comment INSERT events on the board
- When guests create comments via API, Realtime notifies all subscribers
- Host triggers `refetchComments()` to update UI with new comments
- Proper cleanup on session end via `hostRef.current.destroy()`

## Architecture Flow

### Starting a Live Crit Session:
1. User clicks "Start Live Crit" button
2. Generate session ID: `makeSessionId(boardId)`
3. Create session in database via `POST /api/crit-sessions`
4. Call `createHost(sessionId, boardId, onMessage)`
5. Host subscribes to Supabase Realtime channel: `crit-session-{sessionId}`
6. Subscribe to `comments` table INSERT events filtered by `board_id`
7. Show modal with shareable link

### Guest Joining a Session:
1. Guest visits `/live-crit/{sessionId}` URL
2. Verify session exists and is active via `GET /api/crit-sessions/{sessionId}`
3. Call `createGuestWithRetry(sessionId, boardId)`
4. Guest subscribes to Supabase Realtime channel: `crit-guest-{sessionId}`
5. Subscribe to `comments` table INSERT events filtered by `board_id`

### Sending Comments:
1. Guest creates comment via `POST /api/comments` with `source: 'liveCrit'`
2. Supabase inserts comment into database
3. Supabase Realtime broadcasts INSERT event to all subscribers
4. Host and all guests receive the event via their subscriptions
5. Each client updates their UI (host refetches, guests see in real-time)

### Ending a Session:
1. Host clicks "End Crit" button
2. Call `handleEndCrit()`
3. Call `hostRef.current.destroy()` to unsubscribe from Realtime
4. Update session status to 'ended' via `PATCH /api/crit-sessions/{sessionId}`
5. Create tasks from actionable comments

## Benefits of Supabase Realtime

1. **Reliability:** No dependency on peer-to-peer WebRTC connections
2. **Scalability:** Works with any number of participants
3. **Persistence:** All comments are stored in database automatically
4. **Simplicity:** No need to manage peer connections, retries, or fallbacks
5. **Cross-platform:** Works on any device/browser that supports WebSockets
6. **Security:** Uses Supabase RLS policies for access control

## Setup Instructions

### 1. Run Database Migration
Execute `SUPABASE_CRIT_SESSIONS_SCHEMA.sql` in Supabase SQL Editor:
1. Open Supabase Dashboard → SQL Editor
2. Paste the entire SQL file
3. Click "Run"

### 2. Enable Realtime Replication
In Supabase Dashboard:
1. Go to Database → Replication
2. Find `crit_sessions` table
3. Toggle on replication switch
4. Find `comments` table
5. Toggle on replication switch (if not already enabled)

### 3. Environment Variables
Ensure these are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Testing Checklist

- [ ] Start a Live Crit session
- [ ] Verify session is created in database
- [ ] Share session link with guest
- [ ] Guest joins session
- [ ] Guest creates comment
- [ ] Host receives comment via Realtime
- [ ] Multiple guests can join simultaneously
- [ ] All guests see each other's comments in real-time
- [ ] End session properly cleans up subscriptions
- [ ] Session status updates to 'ended' in database

## Files Changed

1. `SUPABASE_CRIT_SESSIONS_SCHEMA.sql` - New database schema
2. `pages/api/crit-sessions/index.js` - New API route
3. `pages/api/crit-sessions/[id].js` - New API route
4. `src/lib/realtime.ts` - Complete rewrite for Supabase Realtime
5. `app/board/[id]/page.tsx` - Updated to use new Realtime implementation

## Migration Notes

- **Backward Compatibility:** The `CritMessage` type is maintained for compatibility
- **Session IDs:** Format remains the same (`{boardIdBase}-{random}`)
- **Guest Pages:** Guest crit pages (`app/live-crit/[id]/page.tsx`) may need updates to use `createGuestWithRetry`
- **Error Handling:** Improved error messages and fallback behavior

## Next Steps

1. Update guest crit pages to use `createGuestWithRetry` from new realtime.ts
2. Add participant tracking (who's in the session)
3. Add session status indicators (live, paused, ended)
4. Consider adding presence tracking via Supabase Realtime presence







