const APP_VERSION = '1.0.38';
const CACHE = 'matbaati-' + APP_VERSION;
const SHELL = ['./', 'index.html', 'app.js', 'supabase.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.endsWith('version.json')) return;
  const key = r.mode === 'navigate' ? 'index.html' : r;
  e.respondWith(caches.open(CACHE).then(c => c.match(key, {ignoreSearch: true}).then(hit => {
    const net = fetch(r).then(res => { if (res.ok) c.put(key, res.clone()); return res; });
    if (hit) { net.catch(() => {}); return hit; }
    return net.catch(() => caches.match('index.html').then(m => (r.mode === 'navigate' && m) || Response.error()));
  })));
});
