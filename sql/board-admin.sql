-- Apply once to an existing board database after board-pages.sql.
ALTER TABLE board_posts ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_admin IN (0, 1));
CREATE TABLE IF NOT EXISTS board_admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  password_tag TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS board_admin_attempts (
  client_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
