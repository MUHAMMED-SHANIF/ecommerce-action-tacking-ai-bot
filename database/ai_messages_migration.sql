-- =============================================
-- ActionBot: ai_messages table migration
-- Run this in your Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Index for fast per-user retrieval (ordered by time)
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id_time
  ON ai_messages(user_id, created_at DESC);

-- Optional: auto-delete messages older than 30 days (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-ai-messages', '0 0 * * *',
--   $$ DELETE FROM ai_messages WHERE created_at < now() - interval '30 days' $$);

-- Note: RLS is intentionally disabled here because the backend uses
-- the service_role key to read/write messages server-side.
-- If you want RLS, uncomment the lines below:
-- ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own messages" ON ai_messages FOR SELECT USING (user_id = auth.uid()::text);
-- CREATE POLICY "Users can insert own messages" ON ai_messages FOR INSERT WITH CHECK (user_id = auth.uid()::text);
