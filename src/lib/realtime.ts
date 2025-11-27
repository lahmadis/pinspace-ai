// src/lib/realtime.ts
"use client";

/**
 * ============================================================================
 * Supabase Realtime Implementation for Live Crit
 * ============================================================================
 * 
 * This module provides real-time synchronization for Live Crit sessions using
 * Supabase Realtime instead of PeerJS. It handles:
 * - Creating and managing crit sessions
 * - Subscribing to real-time updates for comments and sessions
 * - Broadcasting live crit comments to all connected users
 * - Clean subscription/unsubscription lifecycle
 * 
 * Migration from PeerJS:
 * - Old: PeerJS peer-to-peer connections
 * - New: Supabase Realtime subscriptions to database tables
 * 
 * ============================================================================
 */

import { supabase } from './supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================================================
// Session ID Utilities
// ============================================================================

/**
 * Generate a UUID session ID using crypto.randomUUID()
 * 
 * REFACTORED: Changed from custom short IDs (e.g., "abc123-xyz789") to
 * standard UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000").
 * 
 * This ensures:
 * - All session IDs are valid UUIDs
 * - Consistent format across frontend and backend
 * - Better compatibility with Supabase UUID columns
 * - No collisions (UUIDs are globally unique)
 * 
 * @returns A valid UUID string
 */
export function makeSessionId(): string {
  // Use crypto.randomUUID() for browser environments
  // This is available in all modern browsers and Node.js 14.17.0+
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments (should not be needed in modern browsers)
  // This generates a UUID v4 compliant string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate that a string is a valid UUID format
 * 
 * @param id - String to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// Crit Message Types
// ============================================================================

/**
 * Message types for Live Crit communication
 * These are used for backward compatibility with the old PeerJS implementation
 */
export type CritMessage =
  | { type: "hello"; name: string }
  | {
      type: "comment";
      payload: {
        boardId: string;
        author: string;
        category: string;
        note: string;
        isTask?: boolean;
        target?: {
          type: "element" | "point";
          elementId?: string;
          point?: { x: number; y: number };
          viewport?: { pan: { x: number; y: number }; zoom: number };
        };
      };
    };

// ============================================================================
// Helper Functions for Crit Session Management
// ============================================================================

/**
 * Find or create a crit session in Supabase
 * 
 * REFACTORED: Now expects sessionId to be a valid UUID.
 * All session IDs are now UUIDs generated with crypto.randomUUID().
 * 
 * This function:
 * 1. Validates sessionId is a valid UUID
 * 2. Tries to find an existing session by sessionId (UUID)
 * 3. If found and active, returns it
 * 4. If found but inactive, reactivates it
 * 5. If not found, creates a new one with the provided UUID
 * 
 * @param sessionId - UUID session ID (must be valid UUID)
 * @param boardId - Board ID this session is for (must be valid UUID)
 * @returns Session data or null if creation/fetch fails
 */
async function findOrCreateCritSession(
  sessionId: string,
  boardId: string
): Promise<{ id: string; sessionId: string; boardId: string; status: string } | null> {
  // ========================================================================
  // Validate sessionId is a valid UUID
  // ========================================================================
  // REFACTORED: sessionId must now be a valid UUID, not a custom string
  // ========================================================================
  if (!isValidUUID(sessionId)) {
    console.error('[realtime] ❌ Invalid sessionId format (not a UUID):', sessionId);
    return null;
  }
  
  console.log('[realtime] 🔍 Finding or creating crit session:', { sessionId, boardId });

  try {
    // Step 1: Try to find existing session by UUID
    const getSessionResponse = await fetch(`/api/crit-sessions/${sessionId}`);
    
    if (getSessionResponse.ok) {
      // ========================================================================
      // REFACTORED: Use unique variable name for parsed GET response
      // ========================================================================
      const getSessionResponseData = await getSessionResponse.json();
      if (getSessionResponseData.data) {
        const session = getSessionResponseData.data;
        console.log('[realtime] ✅ Found existing crit session:', session.id);
        
        // If session is inactive, reactivate it
        if (session.status !== 'active') {
          console.log('[realtime] 🔄 Reactivating inactive session:', session.id);
          const patchSessionResponse = await fetch(`/api/crit-sessions/${sessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'active',
              endedAt: null,
            }),
          });
          
          if (patchSessionResponse.ok) {
            // ========================================================================
            // REFACTORED: Use unique variable name for parsed PATCH response
            // ========================================================================
            const patchSessionResponseData = await patchSessionResponse.json();
            return patchSessionResponseData.data;
          } else {
            // ========================================================================
            // REFACTORED: Use unique variable name for error parsing
            // ========================================================================
            const patchErrorData = await patchSessionResponse.json().catch(() => ({}));
            console.error('[realtime] ❌ Failed to reactivate session:', patchErrorData);
          }
        }
        
        return session;
      }
    }

    // ========================================================================
    // Step 2: Session not found, create a new one
    // ========================================================================
    // The API will:
    // 1. Generate a UUID for the session id using crypto.randomUUID()
    // 2. Validate boardId is a valid UUID
    // 3. Validate sessionId is a valid UUID (already validated above)
    // 4. Validate createdBy if provided (optional)
    // 5. Log the payload before inserting
    // 6. Insert into Supabase with all valid UUIDs
    // REFACTORED: Use sessionId directly (it's already a UUID), no sanitization needed
    // ========================================================================
    console.log('[realtime] 📝 Creating new crit session:', { sessionId, boardId });
    
    // ========================================================================
    // Validate boardId is a valid UUID before sending to API
    // ========================================================================
    // This prevents unnecessary API calls with invalid data.
    // The API will also validate, but this provides early feedback.
    // ========================================================================
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(boardId)) {
      console.error('[realtime] ❌ Invalid boardId format (not a UUID):', boardId);
      return null;
    }
    
    // ========================================================================
    // Prepare payload for session creation
    // ========================================================================
    // REFACTORED: All fields must be valid UUIDs (not empty strings or invalid formats)
    // - boardId: Validated UUID (validated above)
    // - sessionId: Validated UUID (validated above)
    // - createdBy: Optional, will be auto-generated by API if not provided
    // ========================================================================
    const createPayload = {
      boardId, // ✅ Valid UUID (validated above)
      sessionId, // ✅ Valid UUID (validated above)
      status: 'active',
      // createdBy is optional - if you have a user ID system, pass it here as a UUID
      // createdBy: currentUserId, // Example: if you have user authentication
    };

    // ========================================================================
    // Log payload before sending to API
    // ========================================================================
    console.log('[realtime] ========================================');
    console.log('[realtime] 📤 SENDING SESSION CREATION REQUEST');
    console.log('[realtime] ========================================');
    console.log('[realtime] Endpoint: POST /api/crit-sessions');
    console.log('[realtime] Payload:', JSON.stringify(createPayload, null, 2));
    console.log('[realtime] Payload validation:');
    console.log('[realtime]   boardId:', {
      value: createPayload.boardId,
      type: typeof createPayload.boardId,
      isUUID: isValidUUID(createPayload.boardId),
      isEmpty: !createPayload.boardId || createPayload.boardId.trim().length === 0,
    });
    console.log('[realtime]   sessionId:', {
      value: createPayload.sessionId,
      type: typeof createPayload.sessionId,
      isUUID: isValidUUID(createPayload.sessionId),
      isEmpty: !createPayload.sessionId || createPayload.sessionId.trim().length === 0,
    });
    console.log('[realtime] ========================================');

    const createResponse = await fetch('/api/crit-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    // ========================================================================
    // Log full response (success or error)
    // ========================================================================
    console.log('[realtime] ========================================');
    console.log('[realtime] 📥 RECEIVED RESPONSE FROM API');
    console.log('[realtime] ========================================');
    console.log('[realtime] Status:', createResponse.status, createResponse.statusText);
    console.log('[realtime] OK:', createResponse.ok);
    console.log('[realtime] Headers:', Object.fromEntries(createResponse.headers.entries()));

    if (!createResponse.ok) {
      // ========================================================================
      // Parse and log full error response
      // ========================================================================
      const errorData = await createResponse.json().catch(async (parseError) => {
        // If JSON parsing fails, try to get text response
        const errorText = await createResponse.text().catch(() => 'Unable to read error response');
        console.error('[realtime] ❌ Failed to parse error response as JSON:', parseError);
        console.error('[realtime] ❌ Raw error response:', errorText);
        return { error: errorText, parseError: parseError.message };
      });

      console.error('[realtime] ========================================');
      console.error('[realtime] ❌ API ERROR RESPONSE');
      console.error('[realtime] ========================================');
      console.error('[realtime] Full error object:', JSON.stringify(errorData, null, 2));
      console.error('[realtime] Error message:', errorData.error?.message || errorData.error || 'Unknown error');
      console.error('[realtime] Error details:', errorData.error?.details || errorData.details || 'No details');
      console.error('[realtime] HTTP Status:', createResponse.status);
      console.error('[realtime] ========================================');
      
      // If session already exists (race condition), try to fetch it again
      if (createResponse.status === 409 || (createResponse.status === 400 && (errorData.error?.message || errorData.error || '').includes('already exists'))) {
        console.log('[realtime] ⚠️ Session already exists (race condition), fetching existing session...');
        const retryGetSessionResponse = await fetch(`/api/crit-sessions/${sessionId}`);
        if (retryGetSessionResponse.ok) {
          // ========================================================================
          // REFACTORED: Use unique variable name for parsed retry GET response
          // ========================================================================
          const retryGetSessionResponseData = await retryGetSessionResponse.json();
          if (retryGetSessionResponseData.data) {
            console.log('[realtime] ✅ Found existing session after race condition:', retryGetSessionResponseData.data.id);
            return retryGetSessionResponseData.data;
          }
        } else {
          console.error('[realtime] ❌ Failed to fetch existing session after race condition');
        }
      }
      
      return null;
    }

    // ========================================================================
    // Parse and log successful response
    // ========================================================================
    // REFACTORED: Use unique variable name for parsed CREATE response
    // Removed duplicate createData declaration that was causing variable shadowing
    // ========================================================================
    const createSessionResponseData = await createResponse.json().catch(async (parseError) => {
      console.error('[realtime] ❌ Failed to parse success response as JSON:', parseError);
      const responseText = await createResponse.text().catch(() => 'Unable to read response');
      console.error('[realtime] ❌ Raw response:', responseText);
      return null;
    });

    if (!createSessionResponseData) {
      console.error('[realtime] ❌ No data in response');
      return null;
    }

    console.log('[realtime] ========================================');
    console.log('[realtime] ✅ API SUCCESS RESPONSE');
    console.log('[realtime] ========================================');
    console.log('[realtime] Full response:', JSON.stringify(createSessionResponseData, null, 2));
    console.log('[realtime] Response data:', createSessionResponseData.data ? 'Present' : 'Missing');
    if (createSessionResponseData.data) {
      console.log('[realtime] Created session:', {
        id: createSessionResponseData.data.id,
        sessionId: createSessionResponseData.data.sessionId,
        boardId: createSessionResponseData.data.boardId,
        status: createSessionResponseData.data.status,
      });
      console.log('[realtime] ✅ Created new crit session:', createSessionResponseData.data.id);
      return createSessionResponseData.data;
    }

    console.log('[realtime] ========================================');
    return null;
  } catch (error) {
    console.error('[realtime] ❌ Error in findOrCreateCritSession:', error);
    return null;
  }
}

// ============================================================================
// Supabase Realtime Host (Session Creator)
// ============================================================================

/**
 * Create a Live Crit host session using Supabase Realtime
 * 
 * REFACTORED: sessionId must now be a valid UUID (generated with crypto.randomUUID()).
 * No sanitization is needed since UUIDs are already safe and standardized.
 * 
 * This function:
 * 1. Validates sessionId is a valid UUID
 * 2. Creates a crit session in Supabase
 * 3. Subscribes to real-time comment updates for the board
 * 4. Provides a broadcast function to send messages (via comment creation)
 * 5. Handles cleanup on destroy
 * 
 * @param sessionId - UUID session ID (must be valid UUID, e.g., "550e8400-e29b-41d4-a716-446655440000")
 * @param boardId - Board ID this session is for (must be valid UUID)
 * @param onMessage - Callback when a new comment is received via Realtime
 * @returns Host object with id, broadcast, and destroy methods
 */
export async function createHost(
  sessionId: string,
  boardId: string,
  onMessage: (msg: CritMessage) => void
): Promise<{ 
  id: string; 
  broadcast: (msg: CritMessage) => Promise<void>; 
  destroy: () => void;
  channel: RealtimeChannel;
} | null> {
  // ========================================================================
  // REFACTORED: Validate sessionId is a valid UUID
  // ========================================================================
  // Since session IDs are now always UUIDs, we validate instead of sanitizing.
  // No sanitization is needed - UUIDs are already safe and standardized.
  // ========================================================================
  if (!isValidUUID(sessionId)) {
    console.error('[realtime] ❌ Invalid sessionId format (not a UUID):', sessionId);
    return null;
  }
  
  console.log('[realtime] 🚀 Creating Supabase Realtime host session:', { sessionId, boardId });

  // ========================================================================
  // Verify Supabase client is properly initialized
  // ========================================================================
  // Check that supabase client has valid URL and key (for guest subscriptions)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[realtime] ❌ Supabase not configured - missing environment variables');
    console.error('[realtime] 💡 Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
    return null;
  }

  try {
    // ========================================================================
    // Step 1: Find or create crit session in Supabase
    // ========================================================================
    // This ensures a session row exists in the database before proceeding.
    // If a session already exists (e.g., from a previous connection), we use it.
    // If it's inactive, we reactivate it. If it doesn't exist, we create it.
    // REFACTORED: Use sessionId (UUID) directly, no sanitization needed
    // ========================================================================
    const session = await findOrCreateCritSession(sessionId, boardId);
    
    if (!session) {
      console.error('[realtime] ❌ Failed to find or create crit session');
      return null;
    }

    if (session.status !== 'active') {
      console.error('[realtime] ❌ Crit session is not active:', session.status);
      return null;
    }

    console.log('[realtime] ✅ Crit session ready:', session.id);

    // ========================================================================
    // Step 2: Subscribe to real-time comment updates for this board
    // ========================================================================
    // Filter for comments with source='liveCrit' to only get crit session comments
    // REFACTORED: sessionId is now a UUID, used directly without sanitization
    // 
    // IMPORTANT FOR GUEST SUBSCRIPTIONS:
    // - Uses Supabase anon key (configured in supabaseClient.ts)
    // - Requires RLS policies to allow SELECT on comments table for anon role
    // - Requires Realtime to be enabled for 'comments' table in Supabase dashboard
    // - Filter syntax: 'column=operator.value' (PostgREST filter format)
    // ========================================================================
    
    // Validate boardId is a valid UUID before using in filter (security)
    if (!isValidUUID(boardId)) {
      console.error('[realtime] ❌ Invalid boardId format (not a UUID):', boardId);
      return null;
    }
    
    // Create unique channel name for this session
    const channelName = `crit-session-${sessionId}`;
    
    const channel = supabase
      .channel(channelName)
      .on<Comment>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          // Filter: board_id must equal the provided boardId
          // Using PostgREST filter syntax: column=operator.value
          // boardId is validated as UUID above, so safe to interpolate
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Comment>) => {
          console.log('[realtime] 📨 Received new comment via Realtime:', payload.new);
          
          // Transform Supabase comment to CritMessage format
          // REFACTORED: Cast comment to any to access database fields (board_id, author_name, etc.)
          // The payload.new type from Supabase may not include all database fields in the type definition
          const comment = payload.new as any;
          
          // Only process liveCrit comments
          if (comment.source === 'liveCrit') {
            const critMessage: CritMessage = {
              type: 'comment',
              payload: {
                boardId: comment.board_id,
                author: comment.author_name,
                category: comment.category || 'general',
                note: comment.text,
                isTask: comment.is_task || false,
                target: comment.target_element_id
                  ? {
                      type: 'element',
                      elementId: comment.target_element_id,
                    }
                  : comment.x !== null && comment.y !== null
                  ? {
                      type: 'point',
                      point: { x: Number(comment.x), y: Number(comment.y) },
                    }
                  : undefined,
              },
            };
            
            onMessage(critMessage);
          }
        }
      )
      .subscribe((status) => {
        console.log('[realtime] 📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[realtime] ✅ Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[realtime] ❌ Channel subscription error - check RLS policies and Realtime configuration');
          console.error('[realtime] 💡 Ensure:');
          console.error('[realtime]   1. Realtime is enabled for "comments" table in Supabase dashboard');
          console.error('[realtime]   2. RLS policies allow SELECT for anon role on "comments" table');
          console.error('[realtime]   3. Supabase client is initialized with correct anon key');
        } else if (status === 'TIMED_OUT') {
          console.error('[realtime] ❌ Subscription timed out - connection may be unstable');
        } else if (status === 'CLOSED') {
          console.warn('[realtime] ⚠️ Subscription closed');
        } else {
          console.log('[realtime] 📡 Subscription status:', status);
        }
      });

    // ========================================================================
    // Step 3: Return host object with broadcast and destroy methods
    // ========================================================================
    // REFACTORED: Return sessionId (UUID) directly, no sanitization needed
    // ========================================================================
    return {
      id: sessionId, // UUID session ID (validated above)
      channel,
      // Broadcast by creating a comment via API (which triggers Realtime)
      broadcast: async (msg: CritMessage) => {
        if (msg.type === 'comment') {
          // Comments are broadcast by creating them in Supabase
          // The Realtime subscription will notify all connected clients
          // This is handled by the guest/client code, not here
          console.log('[realtime] 📤 Broadcast message (comments are created via API):', msg);
        }
      },
    destroy: () => {
        console.log('[realtime] 🛑 Destroying host session:', sessionId);
        
        // ========================================================================
        // Step 1: Unsubscribe from Realtime channel
        // ========================================================================
        supabase.removeChannel(channel);
        
        // ========================================================================
        // Step 2: Mark session as ended in database
        // ========================================================================
        // This ensures the session status is updated in Supabase so guests
        // can see that the session has ended and won't try to join inactive sessions.
        // REFACTORED: Use sessionId (UUID) directly, no sanitization needed
        // ========================================================================
        fetch(`/api/crit-sessions/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'ended',
            endedAt: new Date().toISOString(),
          }),
        }).catch((err) => {
          console.error('[realtime] Failed to end session in database:', err);
        });
      },
    };
  } catch (error) {
    console.error('[realtime] ❌ Error creating host session:', error);
    return null;
  }
}

// ============================================================================
// Supabase Realtime Guest (Session Participant)
// ============================================================================

/**
 * Create a Live Crit guest connection using Supabase Realtime
 * 
 * REFACTORED: sessionId must now be a valid UUID (generated with crypto.randomUUID()).
 * No sanitization is needed since UUIDs are already safe and standardized.
 * 
 * This function:
 * 1. Validates sessionId is a valid UUID
 * 2. Subscribes to real-time comment updates for the session's board
 * 3. Provides a send function to create comments (which broadcast via Realtime)
 * 4. Handles cleanup on destroy
 * 
 * @param sessionId - UUID session ID to join (must be valid UUID, e.g., "550e8400-e29b-41d4-a716-446655440000")
 * @param boardId - Board ID this session is for (must be valid UUID)
 * @returns Guest object with send, onMessage, isOpen, and destroy methods
 */
export async function createGuestWithRetry(
  sessionId: string,
  boardId: string
): Promise<{
  send: (msg: CritMessage) => Promise<void>;
  onMessage: (fn: (msg: CritMessage) => void) => void;
  isOpen: () => boolean;
  destroy: () => void;
  channel: RealtimeChannel;
} | null> {
  // ========================================================================
  // REFACTORED: Validate sessionId is a valid UUID
  // ========================================================================
  // Since session IDs are now always UUIDs, we validate instead of sanitizing.
  // No sanitization is needed - UUIDs are already safe and standardized.
  // ========================================================================
  if (!isValidUUID(sessionId)) {
    console.error('[realtime] ❌ Invalid sessionId format (not a UUID):', sessionId);
    return null;
  }

  console.log('[realtime] 👤 Creating Supabase Realtime guest connection:', { sessionId, boardId });

  // ========================================================================
  // Verify Supabase client is properly initialized (CRITICAL FOR GUESTS)
  // ========================================================================
  // Guest users rely on the anon key for subscriptions - must be configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[realtime] ❌ Supabase not configured - missing environment variables');
    console.error('[realtime] 💡 Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
    console.error('[realtime] 💡 Guest subscriptions require the anon key to be properly configured');
    return null;
  }
  
  // Verify the supabase client from supabaseClient.ts is using the anon key
  // (This is already done in supabaseClient.ts, but we log it for debugging)
  console.log('[realtime] ✅ Supabase client configured for guest access (using anon key)');

  try {
    // ========================================================================
    // Step 1: Find or create crit session in Supabase
    // ========================================================================
    // This ensures a session exists before guests try to join.
    // If the session doesn't exist, we try to create it (useful for recovery).
    // If it exists but is inactive, we return null (guests shouldn't join inactive sessions).
    // REFACTORED: Use sessionId (UUID) directly, no sanitization needed
    // ========================================================================
    const session = await findOrCreateCritSession(sessionId, boardId);
    
    if (!session) {
      console.error('[realtime] ❌ Failed to find or create crit session for guest:', sessionId);
      return null;
    }

    if (session.status !== 'active') {
      console.error('[realtime] ❌ Crit session is not active, cannot join:', {
        sessionId,
        status: session.status,
      });
      return null;
    }

    console.log('[realtime] ✅ Guest can join active session:', session.id);

    // Set up message handler
    let messageHandler: ((msg: CritMessage) => void) | null = null;
    let isConnected = false;

    // ========================================================================
    // Subscribe to real-time comment updates for this board (GUEST)
    // ========================================================================
    // IMPORTANT FOR GUEST SUBSCRIPTIONS:
    // - Uses Supabase anon key (configured in supabaseClient.ts) ✅
    // - Requires RLS policies to allow SELECT on comments table for anon role
    // - Requires Realtime to be enabled for 'comments' table in Supabase dashboard
    // - Filter syntax: 'column=operator.value' (PostgREST filter format)
    // - boardId is validated as UUID above, so safe to use in filter
    // ========================================================================
    
    // Validate boardId is a valid UUID before using in filter (security)
    if (!isValidUUID(boardId)) {
      console.error('[realtime] ❌ Invalid boardId format (not a UUID):', boardId);
      return null;
    }
    
    // Create unique channel name for this guest session
    const channelName = `crit-guest-${sessionId}`;
    
    const channel = supabase
      .channel(channelName)
      .on<Comment>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          // Filter: board_id must equal the provided boardId
          // Using PostgREST filter syntax: column=operator.value
          // boardId is validated as UUID above, so safe to interpolate
          filter: `board_id=eq.${boardId}`,
        },
        (payload: RealtimePostgresChangesPayload<Comment>) => {
          console.log('[realtime] 📨 Guest received new comment via Realtime:', payload.new);
          
          // Transform Supabase comment to CritMessage format
          // REFACTORED: Cast comment to any to access database fields (board_id, author_name, etc.)
          // The payload.new type from Supabase may not include all database fields in the type definition
          const comment = payload.new as any;
          
          // Only process liveCrit comments
          if (comment.source === 'liveCrit' && messageHandler) {
            const critMessage: CritMessage = {
              type: 'comment',
              payload: {
                boardId: comment.board_id,
                author: comment.author_name,
                category: comment.category || 'general',
                note: comment.text,
                isTask: comment.is_task || false,
                target: comment.target_element_id
                  ? {
                      type: 'element',
                      elementId: comment.target_element_id,
                    }
                  : comment.x !== null && comment.y !== null
                  ? {
                      type: 'point',
                      point: { x: Number(comment.x), y: Number(comment.y) },
                    }
                  : undefined,
              },
            };
            
            messageHandler(critMessage);
          }
        }
      )
      .subscribe((status) => {
        console.log('[realtime] 📡 Guest subscription status:', status);
        isConnected = status === 'SUBSCRIBED';
        if (status === 'SUBSCRIBED') {
          console.log('[realtime] ✅ Guest successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[realtime] ❌ Guest channel subscription error - check RLS policies and Realtime configuration');
          console.error('[realtime] 💡 Ensure:');
          console.error('[realtime]   1. Realtime is enabled for "comments" table in Supabase dashboard');
          console.error('[realtime]   2. RLS policies allow SELECT for anon role on "comments" table');
          console.error('[realtime]   3. Supabase client is initialized with correct anon key');
          console.error('[realtime]   4. Guest user has permission to read comments (check RLS policies)');
        } else if (status === 'TIMED_OUT') {
          console.error('[realtime] ❌ Guest subscription timed out - connection may be unstable');
        } else if (status === 'CLOSED') {
          console.warn('[realtime] ⚠️ Guest subscription closed');
        } else {
          console.log('[realtime] 📡 Guest subscription status:', status);
        }
      });

    return {
      channel,
      // Send message by creating a comment via API (which triggers Realtime broadcast)
      send: async (msg: CritMessage) => {
        if (msg.type === 'comment') {
          const payload = msg.payload;
          
          // Create comment via API (this will trigger Realtime for all subscribers)
          const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              boardId: payload.boardId,
              text: payload.note,
              authorName: payload.author,
              category: payload.category || 'general',
              isTask: payload.isTask || false,
              targetElementId: payload.target?.type === 'element' ? payload.target.elementId : null,
              x: payload.target?.type === 'point' ? payload.target.point?.x : null,
              y: payload.target?.type === 'point' ? payload.target.point?.y : null,
              source: 'liveCrit',
            }),
          });

          if (!response.ok) {
            // ========================================================================
            // REFACTORED: Use unique variable name for parsed comment error response
            // ========================================================================
            const commentErrorData = await response.json().catch(() => ({}));
            console.error('[realtime] ❌ Failed to send comment:', commentErrorData);
            throw new Error(commentErrorData.error || 'Failed to send comment');
          }

          console.log('[realtime] ✅ Comment sent successfully (will broadcast via Realtime)');
        }
      },
      onMessage: (fn: (msg: CritMessage) => void) => {
        messageHandler = fn;
      },
      isOpen: () => isConnected,
      destroy: () => {
        console.log('[realtime] 🛑 Destroying guest connection:', sessionId);
        isConnected = false;
        messageHandler = null;
        // Unsubscribe from Realtime channel
        // REFACTORED: Use sessionId (UUID) directly, no sanitization needed
        supabase.removeChannel(channel);
      },
    };
  } catch (error) {
    console.error('[realtime] ❌ Error creating guest connection:', error);
    return null;
  }
}

// ============================================================================
// Legacy Compatibility Exports
// ============================================================================

/**
 * Legacy export for backward compatibility
 */
export async function createGuest(sessionId: string, boardId: string) {
  return createGuestWithRetry(sessionId, boardId);
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Comment type from Supabase (matching database schema)
 */
interface Comment {
  id: string;
  board_id: string;
  text: string;
  author_name: string;
  author_id?: string | null;
  target_element_id?: string | null;
  x?: number | null;
  y?: number | null;
  category?: string | null;
  is_task?: boolean;
  source?: string | null;
  created_at: string;
  updated_at: string;
}
