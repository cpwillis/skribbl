/**
 * Service Worker - cache-first PWA shell.
 *
 * On install: caches all static assets plus every word list derived from
 * /words/manifest.json. After the first visit the app is fully offline.
 *
 * To force clients to re-cache, bump the CACHE version string.
 */

const CACHE = 'skribbl-solver-v2';

const STATIC_URLS = [
    '/',
    '/index.html',
    '/privacy.html',
    '/css/style.css',
    '/js/app.js',
    '/js/local_development.js',
    '/js/pwa.js',
    '/manifest.webmanifest',
    '/404.html',
    '/words/manifest.json',
];

self.addEventListener('install', event => {
    event.waitUntil(
        fetch('/words/manifest.json')
            .then(r => r.json())
            .then(entries => entries.map(e => '/' + e.path))
            .then(wordUrls => caches.open(CACHE).then(cache => Promise.all([
                // App shell must fully succeed - any failure here = broken app
                cache.addAll(STATIC_URLS),
                // Word lists cached individually so one bad file won't abort the install
                ...wordUrls.map(url => cache.add(url).catch(() => { })),
            ])))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // Only handle same-origin GET requests
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') return response;
                    const clone = response.clone();
                    caches.open(CACHE).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => {
                    // Offline fallback: serve the app shell for any navigation request
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
        })
    );
});
