// ============================================================
// VEHLOX — Service Worker
// Versão: 1.0.0
// ============================================================

const CACHE_NAME = 'vehlox-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/vehlox-logo.png',
];

// ============================================================
// INSTALL — Pré-cache dos assets essenciais
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE — Limpa caches antigos
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — Estratégia de cache
// ============================================================
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET ou de outros domínios
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  // Ignora APIs (sempre network-first, sem cache)
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Ignora requisições do Next.js internals (HMR, etc)
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/_next/static/chunks/webpack')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se tem no cache, retorna
      if (cachedResponse) {
        // Em background, tenta atualizar (stale-while-revalidate)
        event.waitUntil(
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse.clone());
                });
              }
            })
            .catch(() => {})
        );

        return cachedResponse;
      }

      // Se não tem, busca da rede
      return fetch(event.request)
        .then((networkResponse) => {
          // Cacheia assets estáticos dinamicamente
          if (
            networkResponse.status === 200 &&
            (url.pathname.endsWith('.css') ||
              url.pathname.endsWith('.js') ||
              url.pathname.endsWith('.woff2') ||
              url.pathname.endsWith('.woff') ||
              url.pathname.endsWith('.png') ||
              url.pathname.endsWith('.svg') ||
              url.pathname.endsWith('.ico') ||
              url.pathname.endsWith('.webp'))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback offline para páginas HTML
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
