// Service worker de Unidades Geológicas de Chile. Solo toca cachés con prefijo "unidades-".
const VER = 'unidades-shell-3';
const SHELL = ['./', 'index.html', 'app.js?v=3', 'app.css?v=3', 'manifest.webmanifest', 'icons/icono.svg', 'icons/icono-192.png',
  'data/unidades.json', 'data/poligonos.json', 'data/cartas.json', 'data/ics.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
const TESELAS = 'unidades-teselas';

self.addEventListener('install', e => e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks
  .filter(k => k.startsWith('unidades-shell-') && k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // teselas del mapa base: de la red, y lo visto queda para usarlo sin señal
  if (/tile\.opentopomap|arcgisonline/.test(url.host)) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(TESELAS).then(k => k.put(req, c)); return r; })
      .catch(() => caches.match(req)));
    return;
  }
  // página y datos: red primero (para ver la versión nueva), caché si no hay señal
  if (url.origin === location.origin && (req.mode === 'navigate' || url.pathname.includes('/data/'))) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VER).then(k => k.put(req, c)); return r; })
      .catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
