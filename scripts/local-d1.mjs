// Local development/testing only. Production uses Cloudflare D1 bindings.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';

export function openLocalD1(filename = ':memory:', schema = 'all') {
  const sqlite = new DatabaseSync(filename);
  if (schema !== 'board') sqlite.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  if (schema !== 'counter') {
    const columns = sqlite.prepare('PRAGMA table_info(board_posts)').all();
    if (columns.length && !columns.some(column => column.name === 'page')) {
      sqlite.exec(fs.readFileSync(new URL('../sql/board-pages.sql', import.meta.url), 'utf8'));
    }
    if (columns.length && !columns.some(column => column.name === 'is_admin')) {
      sqlite.exec(fs.readFileSync(new URL('../sql/board-admin.sql', import.meta.url), 'utf8'));
    }
    if (columns.length && !columns.some(column => column.name === 'is_hidden')) {
      sqlite.exec(fs.readFileSync(new URL('../sql/board-hidden.sql', import.meta.url), 'utf8'));
    }
    if (columns.length && !columns.some(column => column.name === 'is_approved')) {
      sqlite.exec(fs.readFileSync(new URL('../sql/board-approval.sql', import.meta.url), 'utf8'));
    }
    sqlite.exec(fs.readFileSync(new URL('../sql/board.sql', import.meta.url), 'utf8'));
  }
  return {
    sqlite,
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = values => ({
        async first() { return statement.get(...values) || null; },
        async all() { return {results: statement.all(...values)}; },
      });
      return {...bound([]), bind: (...values) => bound(values)};
    },
    close() { sqlite.close(); },
  };
}
