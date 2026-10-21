(() => {
  'use strict';
  function startBoard(admin = false) {
  const $ = id => document.getElementById(id);
  const form = $('post-form'), status = $('board-status'), list = $('posts');
  const more = $('more-posts'), refresh = $('refresh-posts'), submit = $('submit-post');
  const postPage = $('post-page'), filterPage = $('filter-page');
  const destinations = new Map(window.BOARD_PAGES.map(page => [page.id, page]));
  for (const page of destinations.values()) {
    for (const select of [postPage, filterPage]) {
      const option = document.createElement('option');
      option.value = page.id; option.textContent = page.name; select.append(option);
    }
  }
  const initialPage = new URLSearchParams(window.location.search).get('page');
  postPage.value = destinations.has(initialPage) ? initialPage : 'general';
  filterPage.value = destinations.has(initialPage) ? initialPage : '';
  const storageKey = 'fefw-board-owner-v1';
  let cursor = null, busy = false, owner = null;
  function message(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  function token() {
    if (owner) return owner;
    const saved = localStorage.getItem(storageKey);
    owner = /^[a-f0-9]{64}$/.test(saved || '') ? saved :
      Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(storageKey, owner);
    return owner;
  }
  async function api(method = 'GET', data, before) {
    const params = new URLSearchParams();
    if (method === 'GET') {
      if (before) params.set('before', before);
      if (filterPage.value) params.set('page', filterPage.value);
    }
    const response = await fetch((admin ? '/api/board-admin' : '/api/board') + (params.size ? '?' + params : ''), {
      method, credentials: admin ? 'same-origin' : 'omit', cache: 'no-store',
      ...(data ? {headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)} : {}),
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('掲示板に接続できません。'); }
    if (admin && response.status === 401) window.boardAdminExpired?.();
    if (!response.ok) throw new Error(result.error || '操作に失敗しました。');
    return result;
  }
  function render(post) {
    const article = document.createElement('article');
    article.className = 'board-post';
    const meta = document.createElement('div'); meta.className = 'post-meta';
    const number = document.createElement('span'); number.className = 'post-number'; number.textContent = '#' + post.id;
    const name = document.createElement('strong'); name.textContent = post.name;
    const time = document.createElement('time');
    time.dateTime = new Date(post.created_at).toISOString();
    time.textContent = new Date(post.created_at).toLocaleString('ja-JP');
    meta.append(number, name, time);
    if (post.is_admin === 1) {
      const badge = document.createElement('span'); badge.className = 'board-admin-badge';
      badge.textContent = '管理者'; meta.append(badge);
    }
    const destination = destinations.get(post.page);
    if (destination) {
      const label = document.createElement(destination.url ? 'a' : 'span');
      label.className = 'post-destination'; label.textContent = destination.name;
      if (destination.url) label.href = destination.url;
      meta.append(label);
    }
    const body = document.createElement('p'); body.className = 'post-body'; body.textContent = post.body;
    article.append(meta, body);
    if (admin) {
      const hidden = post.is_hidden === 1;
      const badge = document.createElement('span');
      badge.textContent = hidden ? '非表示中' : '公開中'; meta.append(badge);
      const button = document.createElement('button');
      const label = hidden ? '再表示' : '非表示';
      button.type = 'button'; button.className = 'post-delete'; button.textContent = label;
      button.setAttribute('aria-label', '投稿 #' + post.id + ' を' + label);
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.textContent = 'キャンセル'; cancel.hidden = true;
      let confirming = false;
      cancel.onclick = () => {
        confirming = false; cancel.hidden = true; button.textContent = label;
      };
      button.onclick = async () => {
        if (busy) return;
        if (!confirming) {
          confirming = true; cancel.hidden = false; button.textContent = label + 'を確定';
          return;
        }
        busy = true; button.disabled = cancel.disabled = true;
        try {
          await api('PATCH', {id: post.id, hidden: !hidden});
          busy = false;
          await load();
          if (status.dataset.error !== 'true') message(label + 'にしました。');
        } catch (error) { message(error.message, true); }
        finally { busy = false; button.disabled = cancel.disabled = false; }
      };
      article.append(button, cancel);
    }
    list.append(article);
  }
  async function load(append = false) {
    if (busy) return;
    busy = true; more.disabled = refresh.disabled = submit.disabled = filterPage.disabled = true;
    message('読み込み中…');
    try {
      const result = await api('GET', undefined, append ? cursor : null);
      if (!append) list.replaceChildren();
      result.posts.forEach(render);
      cursor = result.next; more.hidden = !cursor;
      message(list.children.length ? '' : 'まだ投稿はありません。');
    } catch (error) { message(error.message, true); }
    finally { busy = false; more.disabled = refresh.disabled = submit.disabled = filterPage.disabled = false; }
  }
  $('post-body').addEventListener('input', () => { $('body-count').textContent = $('post-body').value.length + ' / 2000'; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    let ownerToken;
    try { if (!admin) ownerToken = token(); } catch { message('投稿には、このブラウザの保存機能を有効にしてください。', true); return; }
    busy = true; submit.disabled = postPage.disabled = filterPage.disabled = true;
    const targetPage = postPage.value;
    try {
      await api('POST', {name: $('post-name').value, body: $('post-body').value, page: targetPage, token: ownerToken});
      $('post-body').value = ''; $('body-count').textContent = '0 / 2000';
      filterPage.value = targetPage;
      busy = false;
      await load();
      if (status.dataset.error !== 'true') message('投稿しました。');
    } catch (error) { message(error.message, true); }
    finally { busy = false; submit.disabled = postPage.disabled = filterPage.disabled = false; }
  });
  refresh.onclick = () => load();
  more.onclick = () => load(true);
  filterPage.addEventListener('change', () => load());
  load();
  }
  if (document.currentScript?.dataset.boardAdmin === 'true') window.startAdminBoard = () => startBoard(true);
  else startBoard();
})();
