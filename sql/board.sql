-- Existing page-view data is not changed by this migration.
CREATE TABLE IF NOT EXISTS board_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 30),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
  created_at INTEGER NOT NULL,
  owner_hash TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT 'general',
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_admin IN (0, 1)),
  is_approved INTEGER NOT NULL DEFAULT 0 CHECK(is_approved IN (0, 1)),
  reply_body TEXT NOT NULL DEFAULT '',
  reply_updated_at INTEGER,
  reply_hidden INTEGER NOT NULL DEFAULT 0 CHECK(reply_hidden IN (0, 1)),
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK(is_hidden IN (0, 1))
);
CREATE INDEX IF NOT EXISTS board_posts_client_time ON board_posts(client_hash, created_at);
CREATE INDEX IF NOT EXISTS board_posts_page_id ON board_posts(page, id DESC);
CREATE TABLE IF NOT EXISTS board_rate_limits (
  client_hash TEXT PRIMARY KEY,
  last_post INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS board_post_rate AFTER INSERT ON board_posts
BEGIN
  INSERT INTO board_rate_limits(client_hash, last_post) VALUES (NEW.client_hash, NEW.created_at)
    ON CONFLICT(client_hash) DO UPDATE SET last_post = excluded.last_post;
  DELETE FROM board_rate_limits WHERE last_post < NEW.created_at - 86400000;
END;
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
