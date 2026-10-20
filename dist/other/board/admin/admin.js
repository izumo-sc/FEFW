(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let started = false;
  function showLogin(message = '') {
    $('admin-panel').hidden = true;
    $('admin-login').hidden = false;
    $('auth-status').textContent = message;
    $('posts').replaceChildren();
  }
  window.boardAdminExpired = () => showLogin('ログインの有効期限が切れました。もう一度ログインしてください。');
  function showPanel() {
    $('admin-panel').hidden = false;
    $('admin-login').hidden = true;
    $('auth-status').textContent = '';
    if (!started) { started = true; window.startAdminBoard(); }
    else $('refresh-posts').click();
  }
  async function auth(action, data) {
    const response = await fetch('/api/board-admin?action=' + action, {
      method: data ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      ...(data ? {headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)} : {}),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || 'ログイン状態を確認できません。');
      error.status = response.status; throw error;
    }
    return result;
  }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!$('login-form').reportValidity()) return;
    $('login-button').disabled = true;
    $('auth-status').textContent = 'ログイン中…';
    const password = $('admin-password').value;
    $('admin-password').value = '';
    try { await auth('login', {password}); showPanel(); }
    catch (error) { showLogin(error.message); }
    finally { $('login-button').disabled = false; }
  });
  $('logout-button').onclick = async () => {
    $('logout-button').disabled = true;
    try {
      await auth('logout', {});
      $('post-body').value = ''; $('body-count').textContent = '0 / 2000';
      showLogin('ログアウトしました。');
    } catch (error) { $('auth-status').textContent = error.message; }
    finally { $('logout-button').disabled = false; }
  };
  // Do not allow login to race with the initial cookie check.
  $('login-button').disabled = true;
  auth('session').then(showPanel).catch(error => {
    showLogin(error.status === 401 ? '' : error.message);
  }).finally(() => { $('login-button').disabled = false; });
})();
