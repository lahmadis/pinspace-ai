import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient, getAuthenticatedUser } from './_helpers/supabaseServer';
import { successResponse, errorResponse } from './_helpers/responseHelper';

/**
 * GET /api/boards - Returns all rows from the "boards" table as JSON
 * POST /api/boards - Creates a new board
 * 
 * UPDATED: Now supports authenticated users
 * - POST uses authenticated user as owner when session exists
 * - If no auth, still allows anonymous boards (backward compatible)
 * 
 * REFACTORED: Enhanced error handling and logging
 * - Detailed error logging for debugging
 * - Human-readable error messages
 * - Proper handling of Supabase connection errors
 */
export default async function handler(req, res) {
  // ========================================================================
  // Step 1: Validate environment variables with detailed logging
  // ========================================================================
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const method = req.method;
  const logPrefix = `[${method} /api/boards]`;
  
  console.log(`${logPrefix} Environment check:`, {
    hasSupabaseUrl: !!supabaseUrl,
    supabaseUrlLength: supabaseUrl?.length || 0,
    supabaseUrlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
    hasSupabaseAnonKey: !!supabaseAnonKey,
    anonKeyLength: supabaseAnonKey?.length || 0,
    anonKeyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    console.error(`${logPrefix} ❌ Missing environment variables:`, missingVars);
    console.error(`${logPrefix} Available env vars:`, {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    });
    
    return errorResponse(
      res,
      `Supabase configuration is missing. Missing: ${missingVars.join(', ')}. Please check your .env.local file.`,
      500,
      `Required environment variables: ${missingVars.join(', ')}. Add them to .env.local in the project root.`
    );
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (urlError) {
    console.error(`${logPrefix} ❌ Invalid Supabase URL format:`, {
      url: supabaseUrl,
      error: urlError.message,
    });
    return errorResponse(
      res,
      'Invalid Supabase URL format',
      500,
      `The NEXT_PUBLIC_SUPABASE_URL environment variable is not a valid URL: ${supabaseUrl}`
    );
  }

  try {
    // ========================================================================
    // Step 2: Create Supabase client with error handling
    // ========================================================================
    let supabase;
    try {
      const clientResult = getSupabaseClient(req);
      supabase = clientResult.supabase;
      console.log(`${logPrefix} ✅ Supabase client created successfully`);
    } catch (clientError) {
      console.error(`${logPrefix} ❌ Failed to create Supabase client:`, {
        error: clientError,
        errorMessage: clientError.message,
        errorStack: clientError.stack,
      });
      return errorResponse(
        res,
        'Failed to initialize Supabase client',
        500,
        clientError.message || 'Unable to create Supabase client. Check your environment variables.'
      );
    }
    
    // ========================================================================
    // Step 3: Get authenticated user (optional, won't fail if not authenticated)
    // ========================================================================
    let authenticatedUser = null;
    try {
      authenticatedUser = await getAuthenticatedUser(req);
      if (authenticatedUser) {
        console.log(`${logPrefix} ✅ Authenticated user:`, authenticatedUser.id);
      } else {
        console.log(`${logPrefix} ℹ️ No authenticated user (anonymous access)`);
      }
    } catch (authError) {
      // Don't fail the request if auth check fails - allow anonymous access
      console.warn(`${logPrefix} ⚠️ Error checking authentication (continuing as anonymous):`, {
        error: authError.message,
      });
      authenticatedUser = null;
    }

    // ========================================================================
    // Step 4: Handle GET request - fetch all boards
    // ========================================================================
    if (req.method === 'GET') {
      console.log(`${logPrefix} Fetching boards from Supabase...`);
      
      try {
        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // ========================================================================
          // REFACTORED: Detailed error logging for Supabase query errors
          // ========================================================================
          console.error(`${logPrefix} ❌ Supabase query error:`, {
            error: error,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            errorStringified: JSON.stringify(error, null, 2),
          });

          // Provide human-readable error messages based on error code
          let userMessage = 'Failed to fetch boards from database';
          let errorDetails = error.message;

          if (error.code === 'PGRST116') {
            userMessage = 'No boards found (table may be empty)';
            errorDetails = 'The boards table exists but contains no rows.';
          } else if (error.code === '42P01') {
            userMessage = 'Database table not found';
            errorDetails = 'The "boards" table does not exist in your Supabase database. Please create it.';
          } else if (error.code === '42501') {
            userMessage = 'Permission denied';
            errorDetails = 'Row Level Security (RLS) policy is blocking access to the boards table. Check your RLS policies.';
          } else if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
            userMessage = 'Cannot connect to Supabase';
            errorDetails = `Network error connecting to Supabase. Check your NEXT_PUBLIC_SUPABASE_URL (${supabaseUrl}). The URL may be incorrect or Supabase may be down.`;
          }

          return errorResponse(res, userMessage, 500, errorDetails);
        }

        console.log(`${logPrefix} ✅ Successfully fetched boards:`, {
          count: data?.length || 0,
          boardIds: data?.map(b => b.id) || [],
        });

        return successResponse(res, data || [], 200);
      } catch (queryError) {
        // ========================================================================
        // REFACTORED: Catch unexpected errors during query execution
        // ========================================================================
        console.error(`${logPrefix} ❌ Unexpected error during query:`, {
          error: queryError,
          errorType: typeof queryError,
          errorMessage: queryError.message,
          errorStack: queryError.stack,
          errorStringified: JSON.stringify(queryError, null, 2),
        });

        // Check if it's a network/fetch error
        if (queryError.message?.includes('fetch failed') || queryError.message?.includes('ECONNREFUSED')) {
          return errorResponse(
            res,
            'Cannot connect to Supabase database',
            500,
            `Network error: ${queryError.message}. Check that your NEXT_PUBLIC_SUPABASE_URL is correct and Supabase is accessible.`
          );
        }

        return errorResponse(
          res,
          'Unexpected error while fetching boards',
          500,
          queryError.message || 'An unknown error occurred while querying the database.'
        );
      }
    }

    // Handle POST request - insert a new board
    if (req.method === 'POST') {
      // Validate request body
      if (!req.body || typeof req.body !== 'object') {
        return errorResponse(res, 'Request body must be a valid JSON object', 400);
      }

      // NEW: Prepare board data with authenticated user as owner (if exists)
      const boardData = { ...req.body };
      
      if (authenticatedUser) {
        // User is authenticated - use their ID and email as owner
        boardData.owner_id = authenticatedUser.id;
        boardData.owner_email = authenticatedUser.email;
        
        // Extract username from email (before @) if not provided
        if (!boardData.owner_username) {
          boardData.owner_username = authenticatedUser.email?.split('@')[0] || authenticatedUser.id;
        }
        
        // Use user metadata if available
        if (authenticatedUser.user_metadata) {
          if (!boardData.owner_name && authenticatedUser.user_metadata.name) {
            boardData.owner_name = authenticatedUser.user_metadata.name;
          }
          if (!boardData.owner_school && authenticatedUser.user_metadata.school) {
            boardData.owner_school = authenticatedUser.user_metadata.school;
          }
        }
        
        console.log('[POST /api/boards] Creating board for authenticated user:', authenticatedUser.id);
      } else {
        // No authentication - allow anonymous board creation (backward compatible)
        // Use provided ownerId or generate a temporary one
        if (!boardData.owner_id && boardData.ownerId) {
          boardData.owner_id = boardData.ownerId;
        }
        
        console.log('[POST /api/boards] Creating anonymous board');
      }

      const { data, error } = await supabase
        .from('boards')
        .insert(boardData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting board:', error);
        return errorResponse(res, 'Failed to insert board', 500, error.message);
      }

      return successResponse(res, data, 201);
    }

    // Handle unsupported HTTP methods
    return errorResponse(
      res,
      `Method ${req.method} not allowed. Use GET or POST.`,
      405
    );
  } catch (error) {
    // ========================================================================
    // REFACTORED: Comprehensive error handling for all unexpected errors
    // ========================================================================
    console.error(`${logPrefix} ❌ Unexpected error in API handler:`, {
      error: error,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorStringified: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    });

    // Check for specific error types
    if (error.message?.includes('fetch failed')) {
      return errorResponse(
        res,
        'Network error connecting to Supabase',
        500,
        `Failed to connect to Supabase: ${error.message}. Check your NEXT_PUBLIC_SUPABASE_URL environment variable.`
      );
    }

    if (error.message?.includes('ECONNREFUSED')) {
      return errorResponse(
        res,
        'Cannot reach Supabase server',
        500,
        `Connection refused to Supabase. The URL may be incorrect or the service may be down. URL: ${supabaseUrl}`
      );
    }

    // Generic error response
    return errorResponse(
      res,
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'An unexpected error occurred. Check server logs for details.'
    );
  }
}
