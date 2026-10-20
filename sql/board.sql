-- Existing page-view data is not changed by this migration.
CREATE TABLE IF NOT EXISTS board_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 30),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
  created_at INTEGER NOT NULL,
  owner_hash TEXT NOT NULL,
  client_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS board_posts_client_time ON board_posts(client_hash, created_at);
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
