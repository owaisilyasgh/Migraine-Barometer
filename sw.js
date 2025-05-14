// sw.js
const CACHE_NAME = 'pressure-tracker-cache-v1.3'; // Increment version for updates
const FILES_TO_CACHE = [
    '/', // Alias for index.html
    'index.html',
    'style.css',
    'manifest.json',
    'mock_pressure_data.json', // Important for offline mock data mode
    'js/app.js',
    'js/chartManager.js',
    'js/pressureEventManager.js',
    'js/uiRenderer.js',
    'js/db.js',
    'js/config.js',
    'js/utils.js',
    // Add paths to your icons here if you have them locally and want to cache them.
    // e.g., 'icons/icon-192x192.png', 'icons/icon-512x512.png'
    // The Highcharts library is loaded from a CDN and is not cached by this SW by default.
];

// Install service worker and cache essential app assets
self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Pre-caching offline page assets');
                return cache.addAll(FILES_TO_CACHE);
            })
            .catch(error => {
                console.error('[ServiceWorker] Cache addAll failed:', error);
            })
    );
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
});

// Activate service worker and clean up old caches
self.addEventListener('activate', event => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim(); // Take control of all clients as soon as it activates.
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip caching for Open-Meteo API requests to always get fresh data when online.
    // Also skip Highcharts CDN to allow it to update, or if specific caching strategy is needed.
    if (event.request.url.startsWith('https://api.open-meteo.com/') || event.request.url.startsWith('https://code.highcharts.com/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Cache-first strategy for app shell and local assets
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // console.log('[ServiceWorker] Returning from cache:', event.request.url);
                    return cachedResponse;
                }

                // console.log('[ServiceWorker] Network request for:', event.request.url);
                return fetch(event.request).then(response => {
                    // If request is successful, clone it and cache it.
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response; // Don't cache opaque responses or errors
                    }

                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                }).catch(error => {
                    console.error('[ServiceWorker] Fetch failed for:', event.request.url, error);
                    // Optionally, return a generic offline page if specific asset not found
                    // For now, if a core asset is not cached, it will fail.
                    // return caches.match('/offline.html'); // You would need to create and cache an offline.html
                });
            })
    );
});
