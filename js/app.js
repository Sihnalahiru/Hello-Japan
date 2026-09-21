window.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Hello Japan AI starting..."
        );


        /*
         * Clock
         */
        App.Navigation
            ?.tickClock
            ?.();


        setInterval(
            () => {

                App.Navigation
                    ?.tickClock
                    ?.();

            },
            1000
        );


        /*
         * Secure AI status
         */
        App.UI
            ?.updateApiStatus
            ?.();


        /*
         * Voice TTS initialization
         */
        App.VoiceTTS
            ?.init
            ?.();


        /*
         * Default speaker
         */
        App.VoiceEngine
            ?.setSpeaker
            ?.(
                "ja-JP"
            );


        /*
         * Empty voice UI
         */
        App.VoiceRenderer
            ?.clearConversation
            ?.();


        /*
         * Visibility handling
         */
        document.addEventListener(
            "visibilitychange",
            () => {

                if (
                    document.hidden
                ) {

                    App.VoiceEngine
                        ?.stop
                        ?.();

                    App.CameraOCR
                        ?.cancel
                        ?.();

                    App.CameraEngine
                        ?.stop
                        ?.(
                            true
                        );

                    return;
                }


                const view =
                    App.State.currentActiveView;


                if (
                    view === "voice"
                ) {

                    App.VoiceEngine
                        ?.start
                        ?.();
                }


                if (
                    view === "camera"
                ) {

                    App.CameraEngine
                        ?.init
                        ?.();
                }
            }
        );


        /*
         * Service Worker
         */
        if (
            "serviceWorker" in navigator
        ) {

            navigator.serviceWorker
                .register(
                    "sw.js"
                )
                .then(
                    registration => {

                        console.log(
                            "Service Worker registered:",
                            registration.scope
                        );
                    }
                )
                .catch(
                    error => {

                        console.warn(
                            "Service Worker registration failed:",
                            error
                        );
                    }
                );
        }


        /*
         * Start on Home
         */
        App.Navigation
            ?.switchView
            ?.(
                "hero"
            );


        console.log(
            "Hello Japan AI ready."
        );
    }
);
