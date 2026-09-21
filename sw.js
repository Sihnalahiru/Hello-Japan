const CACHE_NAME =
    "hello-japan-v5";

self.addEventListener(
    "install",
    event => {
        self.skipWaiting();
    }
);

self.addEventListener(
    "activate",
    event => {
        event.waitUntil(
            caches
                .keys()
                .then(keys =>
                    Promise.all(
                        keys
                            .filter(
                                key =>
                                    key.startsWith(
                                        "hello-japan-"
                                    ) &&
                                    key !==
                                        CACHE_NAME
                            )
                            .map(key =>
                                caches.delete(
                                    key
                                )
                            )
                    )
                )
                .then(() =>
                    self.clients.claim()
                )
        );
    }
);

self.addEventListener(
    "fetch",
    event => {
        if (
            event.request.method !==
            "GET"
        ) {
            return;
        }

        const url =
            new URL(
                event.request.url
            );

        if (
            url.origin !==
            self.location.origin
        ) {
            return;
        }

        event.respondWith(
            (async () => {
                try {
                    const response =
                        await fetch(
                            event.request,
                            {
                                cache: "no-store"
                            }
                        );

                    if (
                        response &&
                        response.ok
                    ) {
                        const cache =
                            await caches.open(
                                CACHE_NAME
                            );

                        await cache.put(
                            event.request,
                            response.clone()
                        );
                    }

                    return response;
                } catch {
                    const cached =
                        await caches.match(
                            event.request
                        );

                    if (cached) {
                        return cached;
                    }

                    if (
                        event.request.mode ===
                        "navigate"
                    ) {
                        const fallback =
                            await caches.match(
                                "./index.html"
                            );

                        if (fallback) {
                            return fallback;
                        }
                    }

                    return new Response(
                        "Offline",
                        {
                            status: 503,
                            headers: {
                                "Content-Type":
                                    "text/plain"
                            }
                        }
                    );
                }
            })()
        );
    }
);
