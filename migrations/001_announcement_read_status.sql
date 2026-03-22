-- Migration: Announcement Read Status
-- Moves "popup seen" tracking from browser localStorage to a server-side table.
-- This ensures the read state is consistent across devices and sessions.

CREATE TABLE IF NOT EXISTS user_announcement_read_status (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  announcement_id  UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_uar_user_id
  ON user_announcement_read_status(user_id);

CREATE INDEX IF NOT EXISTS idx_uar_announcement_id
  ON user_announcement_read_status(announcement_id);

-- RLS: users may only read/insert their own rows.
ALTER TABLE user_announcement_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own read-status"
  ON user_announcement_read_status FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own read-status"
  ON user_announcement_read_status FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);
