// <!-- تسجيل Service Worker -->
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            // إنشاء Service Worker افتراضي
            const swContent = `
                const CACHE_NAME = 'rzn-nutrition-v1';
                const urlsToCache = [
                    '/',
                    '/index.html',
                    '/manifest.json'
                ];

                self.addEventListener('install', function(event) {
                    event.waitUntil(
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                return cache.addAll(urlsToCache);
                            })
                    );
                });

                self.addEventListener('fetch', function(event) {
                    event.respondWith(
                        caches.match(event.request)
                            .then(function(response) {
                                if (response) {
                                    return response;
                                }
                                return fetch(event.request);
                            }
                        )
                    );
                });
            `;
            
            // إنشاء blob من Service Worker
            const blob = new Blob([swContent], {type: 'application/javascript'});
            const swURL = URL.createObjectURL(blob);
            
            // تسجيل Service Worker
            navigator.serviceWorker.register(swURL)
                .then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(function(error) {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
