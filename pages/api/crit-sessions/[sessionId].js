const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  const { sessionId } = req.query;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'GET') {
    // Try matching by id first, then by session_id for backward compatibility
    let query = supabase.from('crit_sessions').select('*');
    
    // First try by id (primary key)
    const { data: dataById, error: errorById } = await query.eq('id', sessionId).maybeSingle();
    
    if (!errorById && dataById) {
      return res.status(200).json({ 
        session: {
          ...dataById,
          boardId: dataById.board_id,
          sessionId: dataById.session_id,
          endedAt: dataById.ended_at
        }
      });
    }
    
    // Fallback to session_id
    const { data, error } = await supabase
      .from('crit_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ 
      session: {
        ...data,
        boardId: data.board_id,
        sessionId: data.session_id,
        endedAt: data.ended_at
      }
    });
  }

  if (req.method === 'PATCH') {
    const updateData = {};
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.endedAt) updateData.ended_at = req.body.endedAt;
    if (req.body.analysis) updateData.analysis = req.body.analysis;

    // Try matching by id first, then by session_id for backward compatibility
    let query = supabase.from('crit_sessions').update(updateData);
    
    // First try by id (primary key)
    const { data: dataById, error: errorById } = await query.eq('id', sessionId).select().single();
    
    if (!errorById && dataById) {
      return res.status(200).json({
        ...dataById,
        boardId: dataById.board_id,
        sessionId: dataById.session_id,
        endedAt: dataById.ended_at
      });
    }
    
    // Fallback to session_id
    const { data, error } = await supabase
      .from('crit_sessions')
      .update(updateData)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      ...data,
      boardId: data.board_id,
      sessionId: data.session_id,
      endedAt: data.ended_at
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

