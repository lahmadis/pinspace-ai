export interface CritSession {
  id: string;
  board_id: string;
  started_at: string;
  ended_at: string | null;
  board_snapshot: {
    elements: any[];
    cards: any[];
  };
  critic_name: string | null;
  critic_email: string | null;
  comment_count: number;
  created_at: string;
  updated_at: string;
}



