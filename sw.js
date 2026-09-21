const CACHE_NAME =
    "hello-japan-v2";


const CORE_ASSETS = [

    "./",

    "./index.html",

    "./manifest.json",

    "./css/app.css",

    "./js/config.js",

    "./js/state.js",

    "./js/security/safeRender.js",

    "./js/ai/schemas.js",

    "./js/ai/prompts.js",

    "./js/ai/gemini.js",

    "./js/ui/toast.js",

    "./js/ui/apiModal.js",

    "./js/ui/navigation.js",

    "./js/voice/voiceTTS.js",

    "./js/voice/voiceRenderer.js",

    "./js/voice/voiceAI.js",

    "./js/voice/voiceEngine.js",

    "./js/camera/cameraEngine.js",

    "./js/camera/cameraRenderer.js",

    "./js/camera/cameraOCR.js",

    "./js/app.js"
];


self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(cache =>
                    cache.addAll(
                        CORE_ASSETS
                    )
                )
        );


        self.skipWaiting();
    }
);


self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(keys => {

                    return Promise.all(

                        keys
                            .filter(
                                key =>
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
                })
                .then(() =>
                    self.clients.claim()
                )
        );
    }
);


self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


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


        /*
         * Never cache API/Worker requests.
         */

        if (
            url.origin ===
            self.location.origin &&
            (
                url.pathname === "/" ||
                url.pathname.endsWith(".html") ||
                url.pathname.endsWith(".js") ||
                url.pathname.endsWith(".css")
            )
        ) {

            /*
             * Network first for app files.
             *
             * This prevents old broken JS from
             * surviving deployments.
             */

            event.respondWith(

                fetch(request)
                    .then(response => {

                        if (
                            response &&
                            response.ok
                        ) {

                            const clone =
                                response.clone();


                            caches
                                .open(
                                    CACHE_NAME
                                )
                                .then(cache =>
                                    cache.put(
                                        request,
                                        clone
                                    )
                                );
                        }


                        return response;

                    })
                    .catch(() =>
                        caches.match(
                            request
                        )
                    )
            );


            return;
        }


        /*
         * Other static resources:
         * cache first.
         */

        event.respondWith(

            caches
                .match(request)
                .then(cached => {

                    return (
                        cached ||
                        fetch(request)
                    );
                })
        );
    }
);
