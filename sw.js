const CACHE_NAME =
    "hello-japan-v4";


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
                .then(
                    keys => {

                        return Promise.all(

                            keys
                                .filter(
                                    key =>
                                        key.startsWith(
                                            "hello-japan-"
                                        ) &&
                                        key !==
                                            CACHE_NAME
                                )
                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )
                        );
                    }
                )
                .then(
                    () =>
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


        /*
         * Only cache our own application.
         */
        if (
            url.origin !==
            self.location.origin
        ) {
            return;
        }


        event.respondWith(

            (async () => {

                try {

                    /*
                     * NETWORK FIRST
                     *
                     * This prevents old JS from
                     * remaining active after deployment.
                     */
                    const response =
                        await fetch(
                            event.request
                        );


                    if (
                        response &&
                        response.ok
                    ) {

                        const cache =
                            await caches.open(
                                CACHE_NAME
                            );


                        cache.put(
                            event.request,
                            response.clone()
                        );
                    }


                    return response;

                } catch (error) {

                    /*
                     * Offline fallback.
                     */
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

                        const index =
                            await caches.match(
                                "./index.html"
                            );


                        if (index) {
                            return index;
                        }
                    }


                    throw error;
                }

            })()
        );
    }
);
