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
            ?.tickClock?.();

        setInterval(
            () => {
                App.Navigation
                    ?.tickClock?.();
            },
            1000
        );

        /*
         * UI
         */
        App.UI
            ?.updateApiStatus?.();

        /*
         * TTS
         */
        App.VoiceTTS
            ?.init?.();

        /*
         * Set default language.
         *
         * IMPORTANT:
         * Do not start recognition here.
         */
        App.State.activeSpeakerLang =
            "ja-JP";

        if (
            App.VoiceEngine?.recognition
        ) {
            App.VoiceEngine
                .recognition.lang =
                "ja-JP";
        }

        /*
         * Clear initial UI
         */
        App.VoiceRenderer
            ?.clearConversation?.();

        App.CameraRenderer
            ?.clearCard?.();

        /*
         * Service Worker
         */
        if (
            "serviceWorker" in navigator
        ) {

            navigator.serviceWorker
                .register(
                    "./sw.js",
                    {
                        updateViaCache:
                            "none"
                    }
                )
                .then(
                    registration => {

                        registration
                            .update()
                            .catch(
                                () => {}
                            );

                        console.log(
                            "Service Worker:",
                            registration.scope
                        );
                    }
                )
                .catch(
                    error => {

                        console.warn(
                            "Service Worker registration:",
                            error
                        );
                    }
                );
        }

        /*
         * Start on HOME.
         */
        App.Navigation
            ?.switchView?.(
                "hero"
            );

        console.log(
            "Hello Japan AI ready."
        );
    }
);
