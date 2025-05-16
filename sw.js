// sw.js
const CACHE_NAME = 'pressure-tracker-cache-v1.4'; // Increment version for CSS refactor
const FILES_TO_CACHE = [
    '/', // Alias for index.html
    'index.html',
    // Refactored CSS
    'css/m3-core.css',
    'css/layout.css',
    'css/components.css',
    'css/chart.css',
    // JavaScript modules
    'js/app.js',
    'js/chartManager.js',
    'js/config.js',
    'js/db.js',
    'js/pressureEventManager.js',
    'js/uiRenderer.js',
    'js/utils.js',
    'js/dataService.js', // New data service
    // PWA files
    'manifest.json',
    // Data
    'mock_pressure_data.json', // Important for offline mock data mode
    // Icons (ensure these paths are correct and files exist)
    'icons/icon-192x192.png',
    'icons/icon-512x512.png',
    // Fonts (if self-hosted, otherwise browser caches CDN)
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2', // Example, actual URLs vary
    // Material Theme Builder dynamic script (if one specific URL is always used)
    // e.g., 'https://cdn.jsdelivr.net/npm/@material/material-color-utilities@latest/dist/index.global.min.js'
    // It's often better to let dynamic scripts be fetched from network if they change,
    // unless they are versioned and stable.
];

// Install service worker and cache essential app assets
self.addEventListener('install', event => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[ServiceWorker] Pre-caching offline page assets. Files to cache:', FILES_TO_CACHE.length);
                // Using cache.addAll which fetches and caches.
                // For external resources like Google Fonts, addAll might fail if the response is opaque.
                // It's often better to let the browser cache these or use a more sophisticated caching strategy for third-party assets.
                // For simplicity here, we try to cache them. If it fails, check console for opaque response errors.
                const cachePromises = FILES_TO_CACHE.map(fileToCache => {
                    return cache.add(fileToCache).catch(err => {
                        // Log errors for individual file caching, but don't let one failure stop all.
                        // However, addAll is atomic, so this individual catch won't work as expected with cache.addAll directly.
                        // A more robust way is to fetch and put individually if addAll has issues with some URLs.
                        // For now, keeping it simple with addAll.
                        console.warn(`[ServiceWorker] Failed to cache ${fileToCache}:`, err);
                    });
                });
                // Promise.all(cachePromises) ensures all attempts are made.
                // But cache.addAll is atomic. If one fails, all fail.
                // Let's stick to simple addAll and accept its atomicity.
                return cache.addAll(FILES_TO_CACHE);
            })
            .catch(error => {
                console.error('[ServiceWorker] Cache addAll failed:', error);
                // This error means the SW installation might fail if critical assets aren't cached.
            })
            .then(() => {
                console.log('[ServiceWorker] All files cached successfully or addAll completed.');
                return self.skipWaiting(); // Force the waiting service worker to become the active service worker.
            })
    );
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
        }).then(() => {
            console.log('[ServiceWorker] Old caches removed.');
            return self.clients.claim(); // Take control of all clients as soon as it activates.
        })
    );
});

// Serve cached content when offline
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    // Strategy:
    // 1. For Open-Meteo API and Highcharts CDN: Network first, then nothing (no cache, always fresh or fail)
    // 2. For Google Fonts: Cache first, then network. (They are versioned and change rarely)
    // 3. For all other app assets: Cache first, then network, update cache if network successful.

    const requestUrl = new URL(event.request.url);

    if (requestUrl.protocol === 'chrome-extension:') {
        // Do not intercept requests from browser extensions
        return;
    }
    
    if (requestUrl.hostname === 'api.open-meteo.com' || requestUrl.hostname === 'code.highcharts.com') {
        // Network first for these critical, dynamic resources
        event.respondWith(
            fetch(event.request).catch(err => {
                console.warn(`[ServiceWorker] Network fetch failed for ${event.request.url}:`, err);
                // Optionally return a specific offline response or error for these if needed
                // For now, just let the network error propagate.
                throw err;
            })
        );
        return;
    }

    if (requestUrl.hostname === 'fonts.googleapis.com' || requestUrl.hostname === 'fonts.gstatic.com') {
        // Cache first for fonts
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    // console.log('[ServiceWorker] Returning font from cache:', event.request.url);
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    // Cache the new font response
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            }).catch(error => {
                console.error('[ServiceWorker] Font fetch/cache error for:', event.request.url, error);
            })
        );
        return;
    }

    // Default: Cache first, then network for app assets
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
                    if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'default') { // Skips opaque responses for now
                        // console.log('[ServiceWorker] Not caching non-basic/non-OK response:', response.type, response.status, event.request.url);
                        return response; // Don't cache opaque responses or errors from app shell perspective
                    }

                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            // console.log('[ServiceWorker] Caching new resource:', event.request.url);
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                }).catch(error => {
                    console.error('[ServiceWorker] Fetch failed for:', event.request.url, error);
                    // Optionally, return a generic offline page if specific asset not found
                    // For now, if a core asset is not cached, it will fail.
                    // return caches.match('/offline.html'); // You would need to create and cache an offline.html
                    // Propagate the error to the browser if the resource is not in cache and network fails
                    throw error;
                });
            })
    );
});
// filename: sw.js