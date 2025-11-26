/**
 * Crit Sessions API Route
 * 
 * Endpoints:
 * - GET /api/crit-sessions?boardId={boardId} → List active crit sessions for a board
 * - POST /api/crit-sessions → Create a new crit session
 * 
 * All operations use Supabase and respect RLS (Row Level Security) policies.
 * Responses use consistent { data, error } format.
 */

import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '../_helpers/responseHelper';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse(
        res,
        'Supabase configuration is missing. Please check your environment variables.',
        500
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // GET /api/crit-sessions?boardId={boardId} - List crit sessions
    if (req.method === 'GET') {
      const { boardId, status } = req.query;

      // Build query - filter by boardId and/or status
      let query = supabase.from('crit_sessions').select('*');

      if (boardId) {
        query = query.eq('board_id', boardId);
      }

      if (status) {
        query = query.eq('status', status);
      } else {
        // Default to active sessions only
        query = query.eq('status', 'active');
      }

      // Order by started_at descending (newest first)
      query = query.order('started_at', { ascending: false });

      const { data: sessions, error } = await query;

      if (error) {
        console.error('Error fetching crit sessions:', error);
        return errorResponse(
          res,
          'Failed to fetch crit sessions',
          500,
          error.message
        );
      }

      // Transform Supabase sessions to app format
      const transformedSessions = (sessions || []).map((session) => ({
        id: session.id,
        boardId: session.board_id,
        sessionId: session.session_id,
        title: session.title || null,
        status: session.status,
        createdBy: session.created_by || null,
        startedAt: session.started_at,
        endedAt: session.ended_at || null,
        allowAnonymous: session.allow_anonymous ?? true,
        maxParticipants: session.max_participants || null,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      }));

      return successResponse(res, transformedSessions, 200);
    }

    // POST /api/crit-sessions - Create a new crit session
    if (req.method === 'POST') {
      // ========================================================================
      // Step 1: Validate request body
      // ========================================================================
      if (!req.body || typeof req.body !== 'object') {
        return errorResponse(
          res,
          'Request body must be a valid JSON object',
          400,
          'The request body must be a JSON object. Make sure Content-Type is application/json.'
        );
      }

      // ========================================================================
      // Step 2: Extract and validate required fields
      // ========================================================================
      const {
        boardId,
        sessionId,
        title,
        createdBy,
        allowAnonymous = true,
        maxParticipants,
      } = req.body;

      // ========================================================================
      // Step 3: Validate boardId (required, must be valid UUID)
      // ========================================================================
      if (!boardId) {
        return errorResponse(
          res,
          'boardId is required',
          400,
          'Please provide a boardId field in the request body. boardId must be a valid UUID.'
        );
      }

      if (typeof boardId !== 'string' || boardId.trim().length === 0) {
        return errorResponse(
          res,
          'boardId must be a non-empty string',
          400,
          'boardId must be a valid UUID string.'
        );
      }

      // Validate UUID format for boardId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const normalizedBoardId = boardId.trim();
      if (!uuidRegex.test(normalizedBoardId)) {
        return errorResponse(
          res,
          'boardId must be a valid UUID',
          400,
          `boardId "${normalizedBoardId}" is not a valid UUID format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
        );
      }

      // ========================================================================
      // Step 4: Validate sessionId (required, must be valid UUID)
      // ========================================================================
      // REFACTORED: sessionId must now be a valid UUID, not a custom short string
      // All session IDs are generated using crypto.randomUUID() in the frontend
      // ========================================================================
      if (!sessionId) {
        return errorResponse(
          res,
          'sessionId is required',
          400,
          'Please provide a sessionId field in the request body. sessionId must be a valid UUID.'
        );
      }

      if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        return errorResponse(
          res,
          'sessionId must be a non-empty string',
          400,
          'sessionId must be a valid UUID string.'
        );
      }

      // Validate UUID format for sessionId
      const normalizedSessionId = sessionId.trim();
      if (!uuidRegex.test(normalizedSessionId)) {
        return errorResponse(
          res,
          'sessionId must be a valid UUID',
          400,
          `sessionId "${normalizedSessionId}" is not a valid UUID format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
        );
      }

      // ========================================================================
      // Step 5: Validate and generate createdBy (always provide valid UUID)
      // ========================================================================
      // IMPORTANT: Even though created_by is TEXT in the schema, we want to
      // always provide a valid UUID for consistency and future-proofing.
      // If createdBy is not provided, we generate a UUID for it.
      // This ensures the field is never missing and always has a valid UUID.
      // ========================================================================
      let normalizedCreatedBy;
      if (createdBy) {
        if (typeof createdBy !== 'string' || createdBy.trim().length === 0) {
          return errorResponse(
            res,
            'createdBy must be a valid UUID string if provided',
            400,
            'If provided, createdBy must be a non-empty UUID string.'
          );
        }
        
        const trimmedCreatedBy = createdBy.trim();
        if (!uuidRegex.test(trimmedCreatedBy)) {
          return errorResponse(
            res,
            'createdBy must be a valid UUID',
            400,
            `createdBy "${trimmedCreatedBy}" is not a valid UUID format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
          );
        }
        
        normalizedCreatedBy = trimmedCreatedBy;
      } else {
        // Generate a UUID if not provided
        // This ensures created_by is never null and always has a valid UUID
        normalizedCreatedBy = randomUUID();
        console.log('[POST /api/crit-sessions] ⚠️ createdBy not provided, generated UUID:', normalizedCreatedBy);
      }

      // ========================================================================
      // Step 6: Generate UUID for session id
      // ========================================================================
      // The id field in crit_sessions is a UUID PRIMARY KEY.
      // We generate it explicitly using randomUUID() to ensure
      // we have a valid UUID before inserting into Supabase.
      // This gives us control over the UUID generation and ensures
      // we can log it before the insert.
      // ========================================================================
      const sessionUuid = randomUUID();

      // ========================================================================
      // Step 7: Prepare session data for Supabase
      // ========================================================================
      // IMPORTANT: All UUID fields are guaranteed to be valid UUIDs:
      // - id: Generated with randomUUID() (always valid)
      // - board_id: Validated UUID from request (validated above)
      // - created_by: Validated UUID from request OR generated UUID (always valid, never null)
      // 
      // All required fields are present and validated:
      // - id: ✅ Generated UUID
      // - board_id: ✅ Validated UUID (required, validated above)
      // - session_id: ✅ Validated string (required, validated above)
      // - status: ✅ Always 'active'
      // - created_by: ✅ Always valid UUID (generated if not provided)
      // - started_at: ✅ Generated timestamp
      // ========================================================================
      const sessionData = {
        id: sessionUuid, // ✅ Always valid UUID (generated with randomUUID())
        board_id: normalizedBoardId, // ✅ Always valid UUID (validated above)
        session_id: normalizedSessionId, // ✅ UUID session ID (validated above, must be valid UUID)
        title: title?.trim() || null, // Optional
        status: 'active', // ✅ Always 'active' for new sessions
        created_by: normalizedCreatedBy, // ✅ Always valid UUID (validated or generated, never null)
        started_at: new Date().toISOString(), // ✅ ISO timestamp
        allow_anonymous: allowAnonymous ?? true, // Optional, defaults to true
        max_participants: maxParticipants || null, // Optional
      };

      // ========================================================================
      // Final validation: Ensure all required UUID fields are present and valid
      // ========================================================================
      // This is a safety check to catch any issues before inserting.
      // ========================================================================
      if (!sessionData.id || !uuidRegex.test(sessionData.id)) {
        console.error('[POST /api/crit-sessions] ❌ CRITICAL: id is missing or invalid:', sessionData.id);
        return errorResponse(
          res,
          'Internal error: Session ID generation failed',
          500,
          'Failed to generate a valid UUID for the session id field.'
        );
      }

      if (!sessionData.board_id || !uuidRegex.test(sessionData.board_id)) {
        console.error('[POST /api/crit-sessions] ❌ CRITICAL: board_id is missing or invalid:', sessionData.board_id);
        return errorResponse(
          res,
          'Internal error: Board ID validation failed',
          500,
          'The board_id field is missing or has an invalid UUID format.'
        );
      }

      if (!sessionData.created_by || !uuidRegex.test(sessionData.created_by)) {
        console.error('[POST /api/crit-sessions] ❌ CRITICAL: created_by is missing or invalid:', sessionData.created_by);
        return errorResponse(
          res,
          'Internal error: Created by ID validation failed',
          500,
          'The created_by field is missing or has an invalid UUID format.'
        );
      }

      // ========================================================================
      // Validate session_id is a valid UUID (not empty string or invalid format)
      // ========================================================================
      // REFACTORED: session_id is now a UUID column in Supabase, must be valid UUID
      // ========================================================================
      if (!sessionData.session_id || sessionData.session_id.trim().length === 0) {
        console.error('[POST /api/crit-sessions] ❌ CRITICAL: session_id is missing or empty:', sessionData.session_id);
        return errorResponse(
          res,
          'Internal error: Session ID validation failed',
          500,
          'The session_id field is missing or empty. session_id must be a valid UUID.'
        );
      }

      // Validate session_id is a valid UUID format
      if (!uuidRegex.test(sessionData.session_id)) {
        console.error('[POST /api/crit-sessions] ❌ CRITICAL: session_id is not a valid UUID:', {
          value: sessionData.session_id,
          type: typeof sessionData.session_id,
          length: sessionData.session_id?.length,
        });
        return errorResponse(
          res,
          'Internal error: Session ID format validation failed',
          500,
          `The session_id field "${sessionData.session_id}" is not a valid UUID format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
        );
      }

      // ========================================================================
      // Step 8: Log payload with all values and types before inserting into Supabase
      // ========================================================================
      // This comprehensive logging shows:
      // 1. Full payload as JSON
      // 2. Each field with its value and type
      // 3. Validation status for UUID fields
      // This helps debug any issues with data types or missing values.
      // ========================================================================
      console.log('[POST /api/crit-sessions] ========================================');
      console.log('[POST /api/crit-sessions] 📤 PAYLOAD BEING SENT TO SUPABASE');
      console.log('[POST /api/crit-sessions] ========================================');
      console.log('[POST /api/crit-sessions] Full payload (JSON):', JSON.stringify(sessionData, null, 2));
      console.log('[POST /api/crit-sessions] ---');
      console.log('[POST /api/crit-sessions] Field-by-field breakdown:');
      console.log('[POST /api/crit-sessions]   id:', {
        value: sessionData.id,
        type: typeof sessionData.id,
        isUUID: uuidRegex.test(sessionData.id),
        length: sessionData.id?.length,
      });
      console.log('[POST /api/crit-sessions]   board_id:', {
        value: sessionData.board_id,
        type: typeof sessionData.board_id,
        isUUID: uuidRegex.test(sessionData.board_id),
        length: sessionData.board_id?.length,
      });
      console.log('[POST /api/crit-sessions]   session_id:', {
        value: sessionData.session_id,
        type: typeof sessionData.session_id,
        isUUID: uuidRegex.test(sessionData.session_id),
        length: sessionData.session_id?.length,
      });
      console.log('[POST /api/crit-sessions]   title:', {
        value: sessionData.title,
        type: typeof sessionData.title,
        isNull: sessionData.title === null,
      });
      console.log('[POST /api/crit-sessions]   status:', {
        value: sessionData.status,
        type: typeof sessionData.status,
      });
      console.log('[POST /api/crit-sessions]   created_by:', {
        value: sessionData.created_by,
        type: typeof sessionData.created_by,
        isNull: sessionData.created_by === null,
        isUUID: sessionData.created_by ? uuidRegex.test(sessionData.created_by) : null,
        length: sessionData.created_by?.length,
      });
      console.log('[POST /api/crit-sessions]   started_at:', {
        value: sessionData.started_at,
        type: typeof sessionData.started_at,
        isISOString: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sessionData.started_at),
      });
      console.log('[POST /api/crit-sessions]   allow_anonymous:', {
        value: sessionData.allow_anonymous,
        type: typeof sessionData.allow_anonymous,
      });
      console.log('[POST /api/crit-sessions]   max_participants:', {
        value: sessionData.max_participants,
        type: typeof sessionData.max_participants,
        isNull: sessionData.max_participants === null,
      });
      console.log('[POST /api/crit-sessions] ========================================');

      // ========================================================================
      // Step 9: Insert session into Supabase
      // ========================================================================
      // All validation is complete. The payload has been logged above with
      // all values and types. Now we insert the validated data into Supabase.
      // ========================================================================
      console.log('[POST /api/crit-sessions] 🔄 Inserting into Supabase...');
      const { data: insertedSession, error: insertError } = await supabase
        .from('crit_sessions')
        .insert(sessionData)
        .select()
        .single();

      // ========================================================================
      // Step 10: Handle Supabase errors with full error response logging
      // ========================================================================
      // Log the complete error response including:
      // - Error object structure
      // - Error code, message, details, hint
      // - Full error object for debugging
      // ========================================================================
      if (insertError) {
        console.error('[POST /api/crit-sessions] ========================================');
        console.error('[POST /api/crit-sessions] ❌ SUPABASE ERROR RESPONSE');
        console.error('[POST /api/crit-sessions] ========================================');
        console.error('[POST /api/crit-sessions] Full error object:', JSON.stringify(insertError, null, 2));
        console.error('[POST /api/crit-sessions] ---');
        console.error('[POST /api/crit-sessions] Error code:', insertError.code || '(no code)');
        console.error('[POST /api/crit-sessions] Error message:', insertError.message || '(no message)');
        console.error('[POST /api/crit-sessions] Error details:', insertError.details || '(no details)');
        console.error('[POST /api/crit-sessions] Error hint:', insertError.hint || '(no hint)');
        console.error('[POST /api/crit-sessions] Error type:', typeof insertError);
        console.error('[POST /api/crit-sessions] Error keys:', Object.keys(insertError));
        console.error('[POST /api/crit-sessions] ========================================');
        
        // ========================================================================
        // Map error codes to user-friendly messages
        // ========================================================================
        let errorMessage = 'Failed to create crit session';
        let errorDetails = insertError.message || 'Unknown database error';
        let httpStatus = 500;
        
        // ========================================================================
        // Map Supabase error codes to user-friendly messages with actionable suggestions
        // ========================================================================
        if (insertError.code === '23505') {
          // Unique constraint violation - sessionId already exists
          errorMessage = 'Session ID already exists';
          errorDetails = `A crit session with sessionId "${normalizedSessionId}" already exists. ` +
            `This usually means the session was already created. ` +
            `Action: Try fetching the existing session instead of creating a new one, or use a different session ID.`;
          httpStatus = 409; // Conflict
        } else if (insertError.code === '23503') {
          // Foreign key constraint violation - board_id doesn't exist
          errorMessage = 'Board not found';
          errorDetails = `The board with ID "${normalizedBoardId}" does not exist in the database. ` +
            `Action: Verify the boardId is correct and the board exists in the boards table. ` +
            `Check that the board was created successfully before starting a crit session.`;
          httpStatus = 404; // Not Found
        } else if (insertError.code === '23502') {
          // Not null constraint violation - required field is missing
          errorMessage = 'Required field is missing';
          errorDetails = `A required field is missing or null. ` +
            `Required fields: id (UUID), board_id (UUID), session_id (UUID), status (text). ` +
            `Action: Check the payload logging above to see which field is missing. ` +
            `Error: ${insertError.message}`;
          httpStatus = 400; // Bad Request
        } else if (insertError.code === '22P02') {
          // Invalid UUID format
          errorMessage = 'Invalid UUID format';
          errorDetails = `One or more UUID fields have an invalid format. ` +
            `All UUIDs must match: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx. ` +
            `Action: Ensure all UUID fields (id, board_id, session_id, created_by) are valid UUIDs. ` +
            `Check the payload logging above to identify which field has an invalid format. ` +
            `Error: ${insertError.message}`;
          httpStatus = 400; // Bad Request
        } else if (insertError.code === '42501') {
          // Insufficient privilege (RLS policy violation)
          errorMessage = 'Permission denied';
          errorDetails = `You do not have permission to create crit sessions. ` +
            `Action: Check your Row Level Security (RLS) policies in Supabase. ` +
            `Ensure the RLS policy for INSERT on crit_sessions table allows the current operation. ` +
            `You may need to update the policy or use a service role key for this operation.`;
          httpStatus = 403; // Forbidden
        } else if (insertError.code === 'PGRST116') {
          // PostgREST error - usually means table doesn't exist or RLS is blocking
          errorMessage = 'Database configuration error';
          errorDetails = `PostgREST error: ${insertError.message}. ` +
            `Action: Check that the crit_sessions table exists in Supabase and RLS policies are configured correctly. ` +
            `Verify the table schema matches the expected structure (see SUPABASE_CRIT_SESSIONS_SCHEMA.sql).`;
          httpStatus = 500;
        } else {
          // Unknown error code - provide generic but helpful message
          errorMessage = 'Database error';
          errorDetails = `An unexpected database error occurred. ` +
            `Error code: ${insertError.code || 'unknown'}. ` +
            `Action: Check the full error response logged above for details. ` +
            `Verify your Supabase connection and table configuration. ` +
            `Error: ${insertError.message || 'Unknown error'}`;
          httpStatus = 500;
        }

        // Add additional context to error details
        if (insertError.details) {
          errorDetails += ` Details: ${insertError.details}`;
        }
        if (insertError.hint) {
          errorDetails += ` Hint: ${insertError.hint}`;
        }

        return errorResponse(
          res,
          errorMessage,
          httpStatus,
          errorDetails
        );
      }

      // ========================================================================
      // Step 11: Verify insertion succeeded and log response
      // ========================================================================
      if (!insertedSession) {
        console.error('[POST /api/crit-sessions] ========================================');
        console.error('[POST /api/crit-sessions] ❌ INSERT RETURNED NO DATA');
        console.error('[POST /api/crit-sessions] ========================================');
        console.error('[POST /api/crit-sessions] insertError:', insertError);
        console.error('[POST /api/crit-sessions] insertedSession:', insertedSession);
        console.error('[POST /api/crit-sessions] This should not happen if insertError is null');
        console.error('[POST /api/crit-sessions] ========================================');
        return errorResponse(
          res,
          'Failed to create crit session',
          500,
          'Crit session was not created. No data returned from database. This may indicate a database configuration issue.'
        );
      }

      // ========================================================================
      // Log successful insert response
      // ========================================================================
      console.log('[POST /api/crit-sessions] ========================================');
      console.log('[POST /api/crit-sessions] ✅ INSERT SUCCESSFUL');
      console.log('[POST /api/crit-sessions] ========================================');
      console.log('[POST /api/crit-sessions] Full response from Supabase:', JSON.stringify(insertedSession, null, 2));
      console.log('[POST /api/crit-sessions] ---');
      console.log('[POST /api/crit-sessions] Response fields:');
      console.log('[POST /api/crit-sessions]   id:', {
        value: insertedSession.id,
        type: typeof insertedSession.id,
        isUUID: uuidRegex.test(insertedSession.id),
      });
      console.log('[POST /api/crit-sessions]   board_id:', {
        value: insertedSession.board_id,
        type: typeof insertedSession.board_id,
        isUUID: uuidRegex.test(insertedSession.board_id),
      });
      console.log('[POST /api/crit-sessions]   session_id:', {
        value: insertedSession.session_id,
        type: typeof insertedSession.session_id,
        isUUID: uuidRegex.test(insertedSession.session_id),
      });
      console.log('[POST /api/crit-sessions]   created_by:', {
        value: insertedSession.created_by,
        type: typeof insertedSession.created_by,
        isNull: insertedSession.created_by === null,
        isUUID: insertedSession.created_by ? uuidRegex.test(insertedSession.created_by) : null,
      });
      console.log('[POST /api/crit-sessions] ========================================');

      // ========================================================================
      // Step 12: Transform the inserted session to app format
      // ========================================================================
      // Verify all UUID fields are present and valid
      // ========================================================================
      const transformedSession = {
        id: insertedSession.id, // UUID (generated with crypto.randomUUID())
        boardId: insertedSession.board_id, // UUID (validated before insert)
        sessionId: insertedSession.session_id, // TEXT (short shareable ID)
        title: insertedSession.title || null,
        status: insertedSession.status,
        createdBy: insertedSession.created_by || null, // UUID as TEXT (validated if provided)
        startedAt: insertedSession.started_at,
        endedAt: insertedSession.ended_at || null,
        allowAnonymous: insertedSession.allow_anonymous ?? true,
        maxParticipants: insertedSession.max_participants || null,
        createdAt: insertedSession.created_at,
        updatedAt: insertedSession.updated_at,
      };

      // ========================================================================
      // Step 13: Log successful creation
      // ========================================================================
      console.log('[POST /api/crit-sessions] ✅ Crit session created successfully');
      console.log('[POST /api/crit-sessions] ✅ Created session:', {
        id: transformedSession.id,
        boardId: transformedSession.boardId,
        sessionId: transformedSession.sessionId,
        status: transformedSession.status,
        createdBy: transformedSession.createdBy || '(null)',
      });

      return successResponse(res, transformedSession, 201);
    }

    // Handle unsupported HTTP methods
    return errorResponse(
      res,
      `Method ${req.method} not allowed`,
      405,
      'Supported methods: GET, POST'
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in crit-sessions API:', error);
    return errorResponse(
      res,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

