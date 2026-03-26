// ══ SinoCongo Market — Service Worker ══
// Version: 1.0 — déposez ce fichier à la racine de votre projet (même dossier que index.html)

const CACHE_NAME = 'sinocongo-v1';

// Fichiers mis en cache au premier chargement
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
];

// ── Installation : mise en cache des assets de base ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activation : nettoyage des anciens caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie "network first, cache fallback" ──
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes non-GET ou les API externes
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('api.anthropic.com')) return;
  if (event.request.url.includes('fonts.googleapis.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse fraîche
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Réseau indisponible → utiliser le cache
        return caches.match(event.request)
          .then(cached => cached || caches.match('/'));
      })
  );
});

// ── Push Notifications ──
self.addEventListener('push', event => {
  const data = event.data
    ? event.data.json()
    : { title: 'SinoCongo Market', body: 'Nouveaux produits disponibles !' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  );
});

// ── Notification click → ouvrir le site ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
