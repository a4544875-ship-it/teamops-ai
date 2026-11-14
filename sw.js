// Only public application files are cached; private records stay in browser storage.
const CACHE_NAME = 'teamops-v2-preview-static';
const APP_FILES = ['./', './index.html', './styles.css', './icons.js', './core.js', './app.js', './cloud-v2.js', './icon.svg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('teamops-static-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(response => {
    if (response.ok && (e.request.destination === 'document' || ['script','style','manifest','image'].includes(e.request.destination))) {
      const copy=response.clone(); e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(e.request,copy)));
    }
    return response;
  }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
