-- Preserve existing publication decisions; new public posts explicitly set 0.
ALTER TABLE board_posts ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 1 CHECK(is_approved IN (0, 1));
