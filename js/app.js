window.addEventListener("DOMContentLoaded", () => {

    /*
     * ================================
     * CLOCK
     * ================================
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
     * ================================
     * INITIAL UI STATUS
     * ================================
     */

    if (
        App.UI &&
        typeof App.UI.updateApiStatus === "function"
    ) {
        App.UI.updateApiStatus();
    }


    /*
     * ================================
     * DEFAULT VOICE SPEAKER
     * ================================
     */

    if (
        App.VoiceEngine &&
        typeof App.VoiceEngine.setSpeaker === "function"
    ) {
        App.VoiceEngine.setSpeaker("ja-JP");
    }


    /*
     * ================================
     * CLEAN INITIAL VOICE STATE
     * ================================
     *
     * IMPORTANT:
     * Do NOT render fake conversation data here.
     *
     * The VoiceRenderer will only receive
     * actual speech / AI results.
     */

    if (App.VoiceRenderer) {

        if (
            typeof App.VoiceRenderer.clearConversation ===
            "function"
        ) {
            App.VoiceRenderer.clearConversation();
        }
    }


    /*
     * ================================
     * VISIBILITY HANDLING
     * ================================
     *
     * When the PWA goes into the background,
     * release camera + microphone.
     *
     * When returning, restart only the
     * currently active feature.
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
                    App.CameraEngine.stop();
                }

                return;
            }


            /*
             * App became visible again.
             */

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
     * ================================
     * SERVICE WORKER
     * ================================
     */

    if ("serviceWorker" in navigator) {

        navigator.serviceWorker
            .register("sw.js")
            .then(() => {
                console.log(
                    "Hello Japan PWA service worker registered."
                );
            })
            .catch(error => {
                console.log(
                    "PWA service worker notice:",
                    error
                );
            });
    }


    /*
     * ================================
     * INITIAL SCREEN
     * ================================
     */

    if (
        App.Navigation &&
        typeof App.Navigation.switchView === "function"
    ) {
        App.Navigation.switchView("hero");
    }

});
