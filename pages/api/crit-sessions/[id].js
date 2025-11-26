/**
 * Crit Session API Route (Single Session)
 * 
 * Endpoints:
 * - GET /api/crit-sessions/[id] → Fetch a single crit session by ID
 * - PATCH /api/crit-sessions/[id] → Update a crit session (e.g., end session)
 * - DELETE /api/crit-sessions/[id] → Delete a crit session
 * 
 * All operations use Supabase and respect RLS (Row Level Security) policies.
 * Responses use consistent { data, error } format.
 */

import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '../_helpers/responseHelper';

/**
 * Transform Supabase crit session to app format
 */
const transformSession = (session) => ({
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
});

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

    // Extract session ID from URL (can be UUID or session_id)
    const sessionIdentifier = req.query.id;

    if (!sessionIdentifier) {
      return errorResponse(
        res,
        'Session ID is required',
        400,
        'Please provide a session ID in the URL: /api/crit-sessions/[id]'
      );
    }

    // GET /api/crit-sessions/[id] - Fetch a single session
    if (req.method === 'GET') {
      // ========================================================================
      // REFACTORED: sessionIdentifier is now always a UUID
      // ========================================================================
      // Since all session IDs are now UUIDs, we can search by either:
      // 1. id (UUID PRIMARY KEY) - matches the session's primary key
      // 2. session_id (UUID) - matches the session's UUID identifier
      // Both are UUIDs, so we use OR to check both fields
      // ========================================================================
      // Validate that sessionIdentifier is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sessionIdentifier)) {
        return errorResponse(
          res,
          'Invalid session ID format',
          400,
          `Session ID must be a valid UUID. Got: ${sessionIdentifier}`
        );
      }
      
      // Try to find by UUID (either id or session_id, both are UUIDs now)
      let query = supabase
        .from('crit_sessions')
        .select('*')
        .or(`id.eq.${sessionIdentifier},session_id.eq.${sessionIdentifier}`)
        .limit(1);

      const { data: sessions, error } = await query;

      if (error) {
        console.error('Error fetching crit session:', error);
        return errorResponse(
          res,
          'Failed to fetch crit session',
          500,
          error.message
        );
      }

      if (!sessions || sessions.length === 0) {
        return errorResponse(
          res,
          'Crit session not found',
          404,
          `No crit session found with ID: ${sessionIdentifier}`
        );
      }

      // Transform and return session
      return successResponse(res, transformSession(sessions[0]), 200);
    }

    // PATCH /api/crit-sessions/[id] - Update a crit session
    if (req.method === 'PATCH') {
      if (!req.body || typeof req.body !== 'object') {
        return errorResponse(
          res,
          'Request body must be a valid JSON object',
          400,
          'The request body must be a JSON object.'
        );
      }

      const updateData = {};
      
      // Map camelCase fields to snake_case for database
      if (req.body.status !== undefined) {
        updateData.status = req.body.status;
      }
      if (req.body.endedAt !== undefined) {
        updateData.ended_at = req.body.endedAt;
      }
      if (req.body.title !== undefined) {
        updateData.title = req.body.title;
      }

      // ========================================================================
      // Validate sessionIdentifier is a valid UUID
      // ========================================================================
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sessionIdentifier)) {
        return errorResponse(
          res,
          'Invalid session ID format',
          400,
          `Session ID must be a valid UUID. Got: ${sessionIdentifier}`
        );
      }

      // Update session (search by UUID in either id or session_id field)
      const { data: updatedSession, error: updateError } = await supabase
        .from('crit_sessions')
        .update(updateData)
        .or(`id.eq.${sessionIdentifier},session_id.eq.${sessionIdentifier}`)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating crit session:', updateError);
        return errorResponse(
          res,
          'Failed to update crit session',
          500,
          updateError.message
        );
      }

      if (!updatedSession) {
        return errorResponse(
          res,
          'Crit session not found',
          404,
          `No crit session found with ID: ${sessionIdentifier}`
        );
      }

      return successResponse(res, transformSession(updatedSession), 200);
    }

    // DELETE /api/crit-sessions/[id] - Delete a crit session
    if (req.method === 'DELETE') {
      // ========================================================================
      // Validate sessionIdentifier is a valid UUID
      // ========================================================================
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(sessionIdentifier)) {
        return errorResponse(
          res,
          'Invalid session ID format',
          400,
          `Session ID must be a valid UUID. Got: ${sessionIdentifier}`
        );
      }

      const { data: deletedSession, error: deleteError } = await supabase
        .from('crit_sessions')
        .delete()
        .or(`id.eq.${sessionIdentifier},session_id.eq.${sessionIdentifier}`)
        .select()
        .single();

      if (deleteError) {
        console.error('Error deleting crit session:', deleteError);
        
        if (deleteError.code === '42501') {
          return errorResponse(
            res,
            'Delete forbidden',
            403,
            'You do not have permission to delete this crit session. RLS policy prevented deletion.'
          );
        }

        return errorResponse(
          res,
          'Failed to delete crit session',
          500,
          deleteError.message
        );
      }

      if (!deletedSession) {
        return errorResponse(
          res,
          'Crit session not found',
          404,
          `No crit session found with ID: ${sessionIdentifier}`
        );
      }

      return successResponse(res, transformSession(deletedSession), 200);
    }

    // Handle unsupported HTTP methods
    return errorResponse(
      res,
      `Method ${req.method} not allowed`,
      405,
      'Supported methods: GET, PATCH, DELETE'
    );
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in crit session API:', error);
    return errorResponse(
      res,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

