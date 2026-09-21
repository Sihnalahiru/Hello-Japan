window.App = window.App || {};

App.Navigation = {

    switchView(viewName) {

        const previousView =
            App.State.currentActiveView;


        if (
            previousView === viewName
        ) {

            /*
             * Avoid repeatedly starting camera/voice.
             */
            return;
        }


        App.State.currentActiveView =
            viewName;


        /*
         * STOP CAMERA
         */

        if (
            previousView === "camera" &&
            viewName !== "camera"
        ) {

            App.CameraEngine?.stop?.(false);
        }


        /*
         * STOP VOICE
         */

        if (
            previousView === "voice" &&
            viewName !== "voice"
        ) {

            App.VoiceEngine?.stop?.();
        }


        /*
         * HIDE ALL SCREENS
         */

        document
            .querySelectorAll(".screen-view")
            .forEach(view => {

                view.classList.remove(
                    "active"
                );
            });


        /*
         * SHOW TARGET
         */

        const target =
            document.getElementById(
                `view-${viewName}`
            );


        if (target) {

            target.classList.add(
                "active"
            );
        }


        /*
         * BOTTOM NAV
         */

        document
            .querySelectorAll(".nav-icon-btn")
            .forEach(button => {

                const active =
                    button.dataset.nav ===
                    viewName;


                button.classList.toggle(
                    "text-emerald-700",
                    active
                );


                button.classList.toggle(
                    "text-gray-400",
                    !active
                );
            });


        /*
         * CAMERA
         */

        if (viewName === "camera") {

            App.CameraRenderer?.clearCard?.();

            App.CameraEngine?.init?.();
        }


        /*
         * VOICE
         */

        if (viewName === "voice") {

            App.VoiceEngine?.start?.();
        }
    },


    tickClock() {

        const now =
            new Date();


        const timeStr =
            now.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                }
            );


        const clock =
            document.getElementById(
                "hero-clock"
            );


        if (clock) {

            clock.textContent =
                timeStr;
        }
    }
};
