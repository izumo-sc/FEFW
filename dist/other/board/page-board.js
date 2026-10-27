(() => {
  'use strict';
  const page = document.currentScript.dataset.boardPage;
  const status = document.getElementById('page-board-status');
  const list = document.getElementById('page-board-posts');
  if (!page || !status || !list) return;
  async function load() {
    try {
      const response = await fetch('/api/board?page=' + encodeURIComponent(page) + '&limit=10',
        {credentials: 'omit', cache: 'no-store'});
      if (!response.ok) throw new Error('Unavailable');
      const result = await response.json();
      list.replaceChildren();
      for (const post of result.posts.filter(post => post.page === page).slice(0, 10)) {
        const article = document.createElement('article');
        article.className = 'page-board-post';
        const meta = document.createElement('div'); meta.className = 'page-board-meta';
        const name = document.createElement('strong'); name.textContent = post.name;
        const time = document.createElement('time');
        time.dateTime = new Date(post.created_at).toISOString();
        time.textContent = new Date(post.created_at).toLocaleString('ja-JP');
        meta.append(name, time);
        if (post.is_admin === 1) {
          const badge = document.createElement('span'); badge.className = 'board-admin-badge';
          badge.textContent = '管理者'; meta.append(badge);
        }
        const body = document.createElement('p'); body.className = 'page-board-body'; body.textContent = post.body;
        article.append(meta, body);
    if (post.reply_body && post.reply_hidden !== 1) {
      const reply = document.createElement('div'); reply.className = 'board-reply';
      const badge = document.createElement('strong'); badge.className = 'board-admin-badge'; badge.textContent = '管理者';
      const text = document.createElement('p'); text.className = 'page-board-body'; text.textContent = post.reply_body;
      reply.append(badge, text); article.append(reply);
    }
        list.append(article);
      }
      status.textContent = list.children.length ? '' : 'まだ投稿はありません。';
    } catch { status.textContent = '投稿を読み込めませんでした。'; }
  }
  load();
})();
