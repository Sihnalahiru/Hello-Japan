window.App = window.App || {};

App.Navigation = {

    switchView(viewName) {

        const validViews = [
            "hero",
            "camera",
            "voice"
        ];

        if (!validViews.includes(viewName)) {
            return;
        }

        const previous =
            App.State.currentActiveView;

        /*
         * Stop previous voice session
         */
        if (
            previous === "voice" &&
            viewName !== "voice"
        ) {
            App.VoiceEngine?.stop?.();
        }

        /*
         * Stop previous camera session
         */
        if (
            previous === "camera" &&
            viewName !== "camera"
        ) {
            App.CameraOCR?.cancel?.();
            App.CameraEngine?.stop?.(true);
        }

        App.State.currentActiveView =
            viewName;

        /*
         * Change visible screen
         */
        document
            .querySelectorAll(".screen-view")
            .forEach(view => {
                view.classList.remove("active");
            });

        const target =
            document.getElementById(
                `view-${viewName}`
            );

        if (target) {
            target.classList.add("active");
        }

        /*
         * Update bottom navigation
         */
        document
            .querySelectorAll(".nav-icon-btn")
            .forEach(button => {

                const nav =
                    button.dataset.nav;

                button.classList.toggle(
                    "text-emerald-700",
                    nav === viewName
                );

                button.classList.toggle(
                    "text-gray-400",
                    nav !== viewName
                );
            });

        /*
         * CAMERA
         *
         * Camera starts only when the
         * camera screen is selected.
         */
        if (viewName === "camera") {

            App.CameraRenderer
                ?.clearCard?.();

            App.CameraEngine
                ?.init?.();
        }

        /*
         * VOICE
         *
         * IMPORTANT:
         * Do NOT automatically start speech
         * recognition here.
         *
         * User must press the microphone.
         * This is safer for iOS Safari.
         */
        if (viewName === "voice") {

            App.VoiceRenderer
                ?.clearConversation?.();

            App.VoiceRenderer
                ?.setListeningState?.(
                    false,
                    "Tap microphone to start."
                );
        }
    },

    tickClock() {

        const clock =
            document.getElementById(
                "hero-clock"
            );

        if (!clock) {
            return;
        }

        const now = new Date();

        clock.textContent =
            now.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                }
            );
    }
};
