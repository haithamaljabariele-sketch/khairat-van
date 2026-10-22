/* كاش فان — keeps the app itself on the phone so it opens without signal.
   The office data and every save go to the database (/rest/v1) and are NEVER cached here.
   Change CACHE when any file changes, so phones pick up the new version. */
const CACHE = 'cashvan-web-v4';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // the database lives elsewhere: never touched
  if (url.pathname.includes('/rest/v1')) return;
  if (req.mode === 'navigate') {
    // open at once from the phone; fetch the page in the background so the next opening has any new version
    e.respondWith(caches.match('./index.html').then(r => {
      const fresh = fetch('./index.html', { cache: 'no-cache' }).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      });
      if (r) { e.waitUntil(fresh.catch(() => {})); return r; }
      return fresh.catch(() => fetch(req));
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
