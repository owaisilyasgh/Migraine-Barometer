const CACHE_NAME = 'migraine-barometer-cache-v1'; // Updated
const API_CACHE_NAME = 'migraine-barometer-api-v1'; // Updated
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
        console.log('Opened main cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Cache strategy for API calls: Network first, then cache
  if (requestUrl.href.startsWith(OPEN_METEO_API_URL_PREFIX)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
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
          return new Response(JSON.stringify({ error: "Offline and no cached data available for this API request." }), {
            status: 503,
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
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
