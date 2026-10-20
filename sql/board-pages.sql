-- Run once on an existing board database before deploying page destinations.
-- Existing posts remain visible under "全体".
ALTER TABLE board_posts ADD COLUMN page TEXT NOT NULL DEFAULT 'general';
CREATE INDEX IF NOT EXISTS board_posts_page_id ON board_posts(page, id DESC);
