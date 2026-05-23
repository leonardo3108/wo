const CACHE_NAME = 'treino-v1';

// Recursos pré-cacheados no install
const PRE_CACHE = [
  './treino_multiplo.html',
  './manifest.json',
  './icon.svg',
];

// Recursos externos cacheados na primeira visita
const CACHE_EXTERNAL = [
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
];

// ── Install: pré-cacheia arquivos locais ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove caches antigas ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first para recursos conhecidos, network-first para o resto ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Ignora requests do tipo chrome-extension, etc.
  if (!url.startsWith('http') && !url.startsWith('/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Cache hit → retorna imediatamente e atualiza em segundo plano
      if (cached) {
        // Stale-while-revalidate para o HTML (sempre pega versão mais nova quando online)
        if (url.endsWith('.html') || url.endsWith('/')) {
          const networkFetch = fetch(event.request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
            }
            return response;
          }).catch(() => cached);
          // Retorna cache imediatamente, mas busca atualização
          return cached;
        }
        return cached;
      }

      // Cache miss → busca na rede e cacheia
      return fetch(event.request)
        .then(response => {
          if (response.ok) {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return response;
        })
        .catch(() => {
          // Offline e sem cache: retorna página principal como fallback
          if (event.request.destination === 'document') {
            return caches.match('./treino_multiplo.html');
          }
        });
    })
  );
});
