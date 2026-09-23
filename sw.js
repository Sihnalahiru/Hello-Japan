const CACHE_NAME = "hello-japan-v6";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/app.css",

    "./js/app.js",
    "./js/config.js",
    "./js/state.js",

    "./js/ai/gemini.js",
    "./js/ai/prompts.js",
    "./js/ai/schemas.js",

    "./js/camera/cameraEngine.js",
    "./js/camera/cameraOCR.js",
    "./js/camera/cameraRenderer.js",

    "./js/voice/voiceEngine.js",
    "./js/voice/voiceAI.js",
    "./js/voice/voiceTTS.js",
    "./js/voice/voiceRenderer.js",

    "./js/ui/navigation.js",
    "./js/ui/toast.js"
];


// ============================================================
// INSTALL
// ============================================================

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(cache => {

                    return cache.addAll(
                        APP_SHELL
                    );

                })
                .catch(error => {

                    console.error(
                        "[SW] App shell cache failed:",
                        error
                    );

                    /*
                     * Do not prevent the service worker
                     * from installing if one optional shell
                     * resource fails.
                     */
                    return null;
                })

        );

        self.skipWaiting();
    }
);


// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(keys => {

                    return Promise.all(

                        keys
                            .filter(key => {

                                return (
                                    key.startsWith(
                                        "hello-japan-"
                                    ) &&
                                    key !==
                                        CACHE_NAME
                                );

                            })
                            .map(key => {

                                return caches.delete(
                                    key
                                );

                            })

                    );

                })
                .then(() => {

                    return self.clients.claim();

                })

        );
    }
);


// ============================================================
// FETCH
// ============================================================

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        // ----------------------------------------------------
        // Only GET requests belong to the static cache layer.
        // ----------------------------------------------------

        if (
            request.method !==
            "GET"
        ) {

            return;
        }


        const url =
            new URL(
                request.url
            );


        // ----------------------------------------------------
        // Never intercept cross-origin requests.
        // ----------------------------------------------------

        if (
            url.origin !==
            self.location.origin
        ) {

            return;
        }


        // ----------------------------------------------------
        // NEVER CACHE API REQUESTS
        // ----------------------------------------------------
        //
        // This protects:
        //
        // /api/gemini
        // /api/health
        // /api/*
        //
        // API responses must always use the network.
        // ----------------------------------------------------

        if (
            url.pathname === "/api" ||
            url.pathname.startsWith(
                "/api/"
            )
        ) {

            return;
        }


        event.respondWith(

            networkFirst(
                request
            )

        );
    }
);


// ============================================================
// NETWORK-FIRST STATIC STRATEGY
// ============================================================

async function networkFirst(
    request
) {

    try {

        const response =
            await fetch(
                request,
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
                request,
                response.clone()
            );
        }


        return response;

    } catch {

        const cached =
            await caches.match(
                request
            );


        if (cached) {

            return cached;
        }


        // ----------------------------------------------------
        // Navigation fallback
        // ----------------------------------------------------

        if (
            request.mode ===
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
                        "text/plain; charset=utf-8"
                }
            }
        );
    }
}
