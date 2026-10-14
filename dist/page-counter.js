(() => {
  'use strict';
  const script = document.currentScript;
  const page = script?.dataset.page;
  if (!page) return;
  const endpoint = new URL('api/page-view', script.src);
  endpoint.searchParams.set('page', page);
  fetch(endpoint.href, {
    method: 'POST',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    keepalive: true,
  }).catch(() => {});
})();
