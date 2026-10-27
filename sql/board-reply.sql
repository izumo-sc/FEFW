ALTER TABLE board_posts ADD COLUMN reply_body TEXT NOT NULL DEFAULT '';
ALTER TABLE board_posts ADD COLUMN reply_updated_at INTEGER;
ALTER TABLE board_posts ADD COLUMN reply_hidden INTEGER NOT NULL DEFAULT 0 CHECK(reply_hidden IN (0, 1));
