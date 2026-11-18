// Service worker de Unidades Geológicas de Chile. Solo toca cachés con prefijo "unidades-".
const VER = 'unidades-shell-12';
const SHELL = ['./', 'index.html', 'app.js?v=12', 'app.css?v=12', 'yac.js?v=12', 'manifest.webmanifest', 'icons/icono.svg', 'icons/icono-192.png',
  'data/unidades.json', 'data/yacimientos.json', 'data/cartas.json', 'data/ics.json', 'data/hex.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
// data/pol/<id>.json (contorno detallado, hasta 1 MB c/u) NO va en la instalación: se guarda la primera vez que se pide (regla de /data/ más abajo)
const TESELAS = 'unidades-teselas';

// cache: 'reload' / 'no-cache': saltarse el caché HTTP del navegador (GitHub Pages da max-age=600). Sin esto, justo después de publicar
// la instalación o la navegación podían recibir el index.html viejo y la página seguía cargando la cáscara anterior.
self.addEventListener('install', e => e.waitUntil(caches.open(VER)
  .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
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
    const red = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' });
    e.respondWith(red.then(r => { if (r.ok) { const c = r.clone(); caches.open(VER).then(k => k.put(req, c)); } return r; })
      .catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
