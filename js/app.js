window.addEventListener("DOMContentLoaded", () => {

    /*
     * =========================================================
     * CLOCK
     * =========================================================
     */

    if (
        App.Navigation &&
        typeof App.Navigation.tickClock === "function"
    ) {

        App.Navigation.tickClock();

        setInterval(() => {
            App.Navigation.tickClock();
        }, 1000);
    }


    /*
     * =========================================================
     * API / WORKER STATUS
     * =========================================================
     */

    if (
        App.UI &&
        typeof App.UI.updateApiStatus === "function"
    ) {

        App.UI.updateApiStatus();
    }


    /*
     * =========================================================
     * DEFAULT SPEAKER
     * =========================================================
     */

    if (
        App.VoiceEngine &&
        typeof App.VoiceEngine.setSpeaker === "function"
    ) {

        App.VoiceEngine.setSpeaker("ja-JP");
    }


    /*
     * =========================================================
     * INITIAL VOICE STATE
     * =========================================================
     */

    if (
        App.VoiceRenderer &&
        typeof App.VoiceRenderer.clearConversation === "function"
    ) {

        App.VoiceRenderer.clearConversation();
    }


    /*
     * =========================================================
     * VISIBILITY
     *
     * Release microphone/camera while app is hidden.
     * Resume only the active feature when returning.
     * =========================================================
     */

    document.addEventListener(
        "visibilitychange",
        () => {

            if (document.hidden) {

                if (
                    App.VoiceEngine &&
                    typeof App.VoiceEngine.stop === "function"
                ) {

                    App.VoiceEngine.stop();
                }

                if (
                    App.CameraEngine &&
                    typeof App.CameraEngine.stop === "function"
                ) {

                    App.CameraEngine.stop(false);
                }

                return;
            }


            const activeView =
                App.State.currentActiveView;


            if (
                activeView === "voice" &&
                App.VoiceEngine &&
                typeof App.VoiceEngine.start === "function"
            ) {

                App.VoiceEngine.start();
            }


            if (
                activeView === "camera" &&
                App.CameraEngine &&
                typeof App.CameraEngine.init === "function"
            ) {

                App.CameraEngine.init();
            }
        }
    );


    /*
     * =========================================================
     * SERVICE WORKER
     * =========================================================
     */

    if ("serviceWorker" in navigator) {

        navigator.serviceWorker
            .register("sw.js")
            .then(registration => {

                console.log(
                    "Hello Japan service worker registered.",
                    registration.scope
                );

            })
            .catch(error => {

                console.warn(
                    "Service worker registration notice:",
                    error
                );
            });
    }


    /*
     * =========================================================
     * INITIAL VIEW
     * =========================================================
     */

    if (
        App.Navigation &&
        typeof App.Navigation.switchView === "function"
    ) {

        App.Navigation.switchView("hero");
    }

});
