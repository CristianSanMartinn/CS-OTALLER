ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  PRIMARY KEY (user_id, session_id)
);
CREATE INDEX IF NOT EXISTS user_presence_workshop_seen_idx
  ON user_presence(workshop_id, user_id, last_seen_at DESC);
