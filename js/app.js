window.addEventListener(
    "DOMContentLoaded",
    () => {
        console.log(
            "Hello Japan AI starting..."
        );

        App.Navigation
            ?.tickClock?.();

        setInterval(
            () =>
                App.Navigation
                    ?.tickClock?.(),
            1000
        );

        App.UI
            ?.updateApiStatus?.();

        App.VoiceTTS
            ?.init?.();

        App.VoiceEngine
            ?.setSpeaker?.(
                "ja-JP"
            );

        App.VoiceRenderer
            ?.clearConversation?.();

        App.CameraRenderer
            ?.clearCard?.();

        document.addEventListener(
            "visibilitychange",
            () => {
                if (document.hidden) {
                    App.VoiceEngine
                        ?.stop?.();

                    App.CameraOCR
                        ?.cancel?.();

                    App.CameraEngine
                        ?.stop?.(true);

                    return;
                }

                const view =
                    App.State.currentActiveView;

                if (view === "voice") {
                    App.VoiceEngine
                        ?.start?.();
                }

                if (view === "camera") {
                    App.CameraEngine
                        ?.init?.();
                }
            }
        );

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
                .then(registration => {
                    registration
                        .update()
                        .catch(() => {});

                    console.log(
                        "Service Worker:",
                        registration.scope
                    );
                })
                .catch(error => {
                    console.warn(
                        "Service Worker registration:",
                        error
                    );
                });
        }

        App.Navigation
            ?.switchView?.(
                "hero"
            );

        console.log(
            "Hello Japan AI ready."
        );
    }
);
