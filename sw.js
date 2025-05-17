// filename: sw.js
// sw.js
const CACHE_NAME = 'pressure-tracker-cache-v1.6'; // Updated version for UI/chart changes
const FILES_TO_CACHE = [
    '/',
    'index.html',
    // CSS
    'css/m3-core.css',
    'css/layout.css',
    'css/components.css',
    'css/chart.css',
    // JavaScript modules
    'js/app.js',
    'js/chartManager.js',
    'js/config.js',
    'js/dataService.js',
    'js/db.js',
    'js/pressureEventManager.js',
    'js/uiRenderer.js',
    'js/utils.js',
    // PWA files
    'manifest.json',
    // Icons
    'icons/icon-192x192.png',
    'icons/icon-512x512.png',
    // External libraries (Highcharts - main lib only, as exporting/accessibility removed)
    // 'https://code.highcharts.com/highcharts.js', // Still recommend caution caching CDNs directly
];

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Pre-caching offline page assets. Files to cache:', FILES_TO_CACHE.length);
                return cache.addAll(FILES_TO_CACHE);
            })
            .catch(error => {
                console.error('[ServiceWorker] Cache addAll failed during install:', error);
            })
            .then(() => {
                console.log('[ServiceWorker] All core files cached or addAll completed.');
                return self.skipWaiting();
            })
    );
});

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
        }).then(() => {
            console.log('[ServiceWorker] Old caches removed.');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return;
    }
    const requestUrl = new URL(event.request.url);

    if (requestUrl.protocol === 'chrome-extension:' || requestUrl.protocol === 'moz-extension:') {
        return; // Do not intercept browser extension requests
    }

    // Open-Meteo API - Network first, no SW cache fallback for API data itself.
    if (requestUrl.hostname === 'api.open-meteo.com') {
        event.respondWith(
            fetch(event.request).catch(err => {
                console.warn(`[ServiceWorker] Network fetch failed for API ${event.request.url}:`, err);
                throw err;
            })
        );
        return;
    }

    // Highcharts CDN and Google Fonts/Material Icons - Cache first, then network
    if (requestUrl.hostname === 'code.highcharts.com' ||
        requestUrl.hostname === 'fonts.googleapis.com' ||
        requestUrl.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        if (networkResponse && networkResponse.status === 200) {
                           cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                }).catch(error => {
                    console.error('[ServiceWorker] CDN/Font fetch/cache error for:', event.request.url, error);
                    throw error;
                });
            })
        );
        return;
    }

    // Default: Cache first, then network for app assets
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'default')) {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                }).catch(error => {
                    console.error('[ServiceWorker] App asset fetch failed for:', event.request.url, error);
                    throw error;
                });
            })
    );
});
// filename: sw.js