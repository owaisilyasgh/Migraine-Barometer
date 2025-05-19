// sw.js
const CACHE_NAME = 'pressure-tracker-cache-v1.6.1'; // Updated version for UI/carousel/card changes
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
    // Fonts (base URLs, specific weights/styles might be fetched by browser directly based on CSS)
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    // Note: Caching full font files (e.g. woff2) retrieved by @font-face is more robust than caching the CSS API.
    // However, for simplicity, we cache the CSS API call. Browser may still fetch actual font files.

    // External libraries (Highcharts - main lib only, as exporting/accessibility removed)
    // 'https://code.highcharts.com/highcharts.js', // Still recommend caution caching CDNs directly
];

self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Pre-caching offline page assets. Files to cache:', FILES_TO_CACHE.length);
                // Use individual cache.add for resilience. If one fails, others might succeed.
                const cachePromises = FILES_TO_CACHE.map(fileToCache => {
                    return cache.add(fileToCache).catch(err => {
                        console.warn(`[ServiceWorker] Failed to cache ${fileToCache} during install:`, err);
                    });
                });
                return Promise.all(cachePromises);
            })
            .catch(error => {
                console.error('[ServiceWorker] Cache open failed during install:', error);
            })
            .then(() => {
                console.log('[ServiceWorker] All core files attempted to be cached.');
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
    const requestUrl = new URL(event.request.url);

    // Exclude browser extension requests
    if (requestUrl.protocol.startsWith('chrome-extension:') || requestUrl.protocol.startsWith('moz-extension:')) {
        return; // Do not intercept browser extension requests
    }

    // Open-Meteo API - Network first, no SW cache fallback for API data itself.
    // The app's dataService.js handles caching API data in localStorage.
    if (requestUrl.hostname === 'api.open-meteo.com') {
        event.respondWith(
            fetch(event.request).catch(err => {
                console.warn(`[ServiceWorker] Network fetch failed for API ${event.request.url}:`, err);
                // Optionally return a custom offline response for API calls if desired, though not typical.
                // return new Response(JSON.stringify({ error: "offline" }), { headers: { 'Content-Type': 'application/json' }});
                throw err; // Re-throw to indicate failure to the fetch caller
            })
        );
        return;
    }

    // Highcharts CDN and Google Fonts/Material Icons - Cache first, then network
    // More robust strategy for external, versioned resources.
    if (requestUrl.hostname === 'code.highcharts.com' || requestUrl.hostname.includes('fonts.googleapis.com') || requestUrl.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    // console.log('[ServiceWorker] Serving from cache:', event.request.url);
                    return cachedResponse;
                }
                // console.log('[ServiceWorker] Fetching from network (and caching):', event.request.url);
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        if (networkResponse.ok) { // Only cache valid responses
                           cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                }).catch(error => {
                    console.error('[ServiceWorker] CDN/Font fetch/cache error for:', event.request.url, error);
                    // Do not return an offline fallback for these assets, as they might be crucial
                    // or have specific fallbacks handled by the browser/CSS.
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
                if (cachedResponse) {
                    // console.log('[ServiceWorker] Serving from cache:', event.request.url);
                    return cachedResponse;
                }
                // console.log('[ServiceWorker] Fetching from network (and caching):', event.request.url);
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        // For same-origin requests, 'basic' type is expected.
                        // Other types like 'opaque' (for cross-origin no-cors) shouldn't be cached here without care.
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
                    // Generic fallback for app assets (e.g., if index.html or core JS fails)
                    // This might be too broad. Could refine to only provide fallback for document requests.
                    // if (event.request.mode === 'navigate') {
                    //     return caches.match('index.html'); // Or a dedicated offline.html page
                    // }
                    throw error;
                });
            })
    );
});
// filename: sw.js