const CACHE_PREFIX = "grid-generator";
const CACHE_VERSION = "v1";
const APP_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;
const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./manifest.webmanifest",
    "./assets/grid-generator-icon.svg"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key.startsWith(CACHE_PREFIX + "-") &&
                        key !== APP_CACHE && key !== RUNTIME_CACHE)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(APP_CACHE).then(cache => cache.put("./index.html", copy));
                    }
                    return response;
                })
                .catch(async () =>
                    (await caches.match(request)) ||
                    (await caches.match("./index.html")) ||
                    Response.error()
                )
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            const network = fetch(request).then(response => {
                if (response.ok && response.type === "basic") {
                    const copy = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
                }
                return response;
            });
            return cached || network;
        })
    );
});
