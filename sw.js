const CACHE_NAME =
    "hello-japan-v6";

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

    "./js/ui/apiModal.js",
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
                .open(
                    CACHE_NAME
                )
                .then(
                    cache =>
                        cache.addAll(
                            APP_SHELL
                        )
                )
                .then(
                    () =>
                        self.skipWaiting()
                )
        );
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
                .then(
                    keys =>
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
                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )
                        )
                )
                .then(
                    () =>
                        self.clients.claim()
                )
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
        // Only GET requests are cacheable.
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
        // Only same-origin resources.
        // ----------------------------------------------------

        if (
            url.origin !==
            self.location.origin
        ) {
            return;
        }


        // ----------------------------------------------------
        // NEVER intercept API requests.
        //
        // Gemini requests must always reach the Worker.
        // ----------------------------------------------------

        if (
            url.pathname ===
                "/api" ||
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
// NETWORK FIRST
// ============================================================

async function networkFirst(
    request
) {

    try {

        const response =
            await fetch(
                request,
                {
                    cache:
                        "no-store"
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
