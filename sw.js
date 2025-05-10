const CACHE_NAME = 'pressurewise-v1';
const API_CACHE_NAME = 'pressurewise-api-v1';
const OPEN_METEO_API_URL_PREFIX = 'https://api.open-meteo.com/v1/forecast'; // Used to identify API requests

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/api.js',
  '/ui.js',
  '/symptomLogger.js',
  '/learning.js',
  '/manifest.json'
  // Add paths to icon-192.png and icon-512.png if you want to cache them
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Cache strategy for API calls: Network first, then cache, with 12-hour refresh
  if (requestUrl.href.startsWith(OPEN_METEO_API_URL_PREFIX)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request);
          // Check if response is valid before caching
          if (networkResponse && networkResponse.ok) {
             // Don't cache if explicit 'no-cache' or specific header from API says not to
            if (event.request.cache !== 'no-store' && event.request.headers.get('Cache-Control') !== 'no-store') {
                cache.put(event.request, networkResponse.clone());
            }
          }
          return networkResponse;
        } catch (error) {
          console.log('Network request failed, trying cache for API:', error);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache and network failed, provide a generic error response
          return new Response(JSON.stringify({ error: "Offline and no cached data available for this API request." }), {
            status: 503, // Service Unavailable
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
  } else {
    // Cache strategy for app shell: Cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request).then(networkResponse => {
            // Optionally cache new static assets if not already cached (e.g., if URLS_TO_CACHE is incomplete)
            // Be careful with this to not cache unintended resources
            return networkResponse;
          });
        })
    );
  }
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
