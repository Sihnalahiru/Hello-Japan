window.App = window.App || {};

App.Navigation = {

    switchView(viewName) {

        const previousView =
            App.State.currentActiveView;

        App.State.currentActiveView =
            viewName;

        /*
         * Stop previous camera immediately
         * when leaving camera view.
         */
        if (
            previousView === "camera" &&
            viewName !== "camera"
        ) {
            if (
                App.CameraEngine &&
                typeof App.CameraEngine.stop === "function"
            ) {
                App.CameraEngine.stop();
            }
        }

        /*
         * Stop previous voice session immediately
         * when leaving voice view.
         */
        if (
            previousView === "voice" &&
            viewName !== "voice"
        ) {
            if (
                App.VoiceEngine &&
                typeof App.VoiceEngine.stop === "function"
            ) {
                App.VoiceEngine.stop();
            }
        }

        /*
         * Hide all screens.
         */
        document
            .querySelectorAll(".screen-view")
            .forEach(view => {
                view.classList.remove("active");
            });

        /*
         * Activate requested screen.
         */
        const target =
            document.getElementById(
                `view-${viewName}`
            );

        if (target) {
            target.classList.add("active");
        }

        /*
         * Update bottom navigation buttons.
         */
        document
            .querySelectorAll(".nav-icon-btn")
            .forEach(button => {

                const isActive =
                    button.dataset.nav === viewName;

                if (isActive) {

                    button.classList.add(
                        "text-emerald-700"
                    );

                    button.classList.remove(
                        "text-gray-400"
                    );

                } else {

                    button.classList.remove(
                        "text-emerald-700"
                    );

                    button.classList.add(
                        "text-gray-400"
                    );
                }
            });

        /*
         * CAMERA VIEW
         */
        if (viewName === "camera") {

            /*
             * Clear previous AI result before
             * starting a fresh camera session.
             */
            if (
                App.CameraRenderer &&
                typeof App.CameraRenderer.clearCard ===
                    "function"
            ) {
                App.CameraRenderer.clearCard();
            }

            if (
                App.CameraEngine &&
                typeof App.CameraEngine.init ===
                    "function"
            ) {
                App.CameraEngine.init();
            }

        }

        /*
         * VOICE VIEW
         */
        if (viewName === "voice") {

            if (
                App.VoiceEngine &&
                typeof App.VoiceEngine.start ===
                    "function"
            ) {
                App.VoiceEngine.start();
            }

        }

        /*
         * If switching to any other screen,
         * camera and voice are already stopped
         * above when applicable.
         */
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
