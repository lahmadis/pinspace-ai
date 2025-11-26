# Live Page Supabase Realtime Fix

## Issue
The `app/live/[sessionId]/page.tsx` file was importing `initRealtimeOptional` and `Realtime` type from `@/lib/realtime`, but these functions/types were removed during the Supabase Realtime refactor.

## Changes Made

### 1. Updated Imports (`app/live/[sessionId]/page.tsx`)
**Before:**
```typescript
import { initRealtimeOptional, type Realtime, type CritMessage } from "@/lib/realtime";
```

**After:**
```typescript
import { createGuestWithRetry, type CritMessage } from "@/lib/realtime";
```

### 2. Updated Type Reference
**Before:**
```typescript
const rtRef = useRef<Realtime | null>(null);
```

**After:**
```typescript
const rtRef = useRef<Awaited<ReturnType<typeof createGuestWithRetry>> | null>(null);
```

### 3. Replaced `initRealtimeOptional` with `createGuestWithRetry`
**Before:**
```typescript
useEffect(() => {
  let mounted = true;
  (async () => {
    const rt = await initRealtimeOptional(sessionId, () => {});
    if (!mounted) { rt.dispose(); return; }
    rtRef.current = rt;
    setRtReady(true);
    setIsOnline(rt.enabled);
  })();
  return () => { mounted = false; rtRef.current?.dispose(); };
}, [sessionId]);
```

**After:**
```typescript
useEffect(() => {
  let mounted = true;
  
  (async () => {
    // Wait for activeBoardId to be determined from sessionId
    if (!activeBoardId || !sessionId) {
      return;
    }

    try {
      // Create guest connection using Supabase Realtime
      const guest = await createGuestWithRetry(sessionId, activeBoardId);
      
      if (!mounted) {
        guest?.destroy();
        return;
      }

      if (!guest) {
        setRtReady(true);
        setIsOnline(false);
        return;
      }

      // Set up message handler for incoming comments
      guest.onMessage((msg: CritMessage) => {
        if (msg.type === "comment") {
          // Trigger storage event to notify other tabs
          localStorage.setItem(`pinspace_comments_ping_${activeBoardId}`, String(Date.now()));
        }
      });

      rtRef.current = guest;
      setRtReady(true);
      setIsOnline(guest.isOpen());
    } catch (error) {
      console.error("[live] ❌ Error connecting to Supabase Realtime:", error);
      setRtReady(true);
      setIsOnline(false);
    }
  })();

  return () => {
    mounted = false;
    if (rtRef.current) {
      rtRef.current.destroy();
      rtRef.current = null;
    }
  };
}, [sessionId, activeBoardId]);
```

### 4. Updated `sendRealtime` to be async
**Before:**
```typescript
const sendRealtime = useCallback((msg: CritMessage) => {
  try {
    rtRef.current?.send?.(msg);
  } catch (e) {
    console.error("[live] sendRealtime failed", e);
  }
}, []);
```

**After:**
```typescript
const sendRealtime = useCallback(async (msg: CritMessage) => {
  try {
    if (rtRef.current) {
      await rtRef.current.send(msg);
    } else {
      console.warn("[live] Realtime connection not ready, message not sent:", msg);
    }
  } catch (e) {
    console.error("[live] sendRealtime failed", e);
  }
}, []);
```

### 5. Updated comment sending to handle async
**Before:**
```typescript
sendRealtime({
  type: "comment",
  payload: { ... },
});
```

**After:**
```typescript
sendRealtime({
  type: "comment",
  payload: { ... },
}).catch((err) => {
  console.error("[live] Failed to send comment via Realtime:", err);
});
```

## Key Differences

### Old Implementation (PeerJS)
- Used `initRealtimeOptional` which created a PeerJS connection
- Had `Realtime` type with `enabled`, `send`, and `dispose` methods
- Used localStorage fallback when PeerJS failed
- Required only `sessionId` parameter

### New Implementation (Supabase Realtime)
- Uses `createGuestWithRetry` which creates a Supabase Realtime subscription
- Returns object with `send`, `onMessage`, `isOpen`, `destroy`, and `channel` methods
- Requires both `sessionId` and `boardId` parameters
- Subscribes to database changes instead of peer connections
- Comments are created via API, which triggers Realtime events

## How It Works Now

1. **Guest joins session:**
   - Page extracts `boardId` from `sessionId` (or uses fallback)
   - Calls `createGuestWithRetry(sessionId, boardId)`
   - Function verifies session exists and is active via API
   - Subscribes to Supabase Realtime channel for comment INSERT events

2. **Guest sends comment:**
   - Guest calls `sendRealtime({ type: "comment", payload: {...} })`
   - `createGuestWithRetry.send()` creates comment via `POST /api/comments`
   - Supabase inserts comment into database
   - Supabase Realtime broadcasts INSERT event to all subscribers
   - Host and all guests receive the event and update their UI

3. **Guest receives comments:**
   - Supabase Realtime subscription receives INSERT events
   - `onMessage` callback is triggered with transformed `CritMessage`
   - Page updates UI (triggers storage event for cross-tab sync)

## Files Changed

1. `app/live/[sessionId]/page.tsx` - Updated to use Supabase Realtime

## Testing Checklist

- [ ] Guest can join a live crit session
- [ ] Guest can send comments
- [ ] Guest receives comments from other participants in real-time
- [ ] Connection status indicator shows "Live" when connected
- [ ] Connection status indicator shows "Offline" when disconnected
- [ ] Cleanup works properly when leaving the page
- [ ] No console errors related to missing imports



