const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'GET') {
    const { sessionId, boardId } = req.query;
    let query = supabase.from('crit_sessions').select('*');

    if (sessionId) query = query.eq('session_id', sessionId);
    if (boardId) query = query.eq('board_id', boardId);
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const sessions = (data || []).map(session => ({
      ...session,
      boardId: session.board_id,
      sessionId: session.session_id,
      endedAt: session.ended_at
    }));
    return res.status(200).json({ sessions });
  }

  if (req.method === 'POST') {
    const { boardId, sessionId, status = 'active' } = req.body;
    if (!boardId || !sessionId) {
      return res.status(400).json({ error: 'boardId and sessionId required' });
    }

    const { data, error } = await supabase
      .from('crit_sessions')
      .insert({ board_id: boardId, session_id: sessionId, status, started_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ 
      session: {
        ...data,
        boardId: data.board_id,
        sessionId: data.session_id,
        endedAt: data.ended_at
      }
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

