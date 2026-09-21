window.App = window.App || {};

App.Navigation = {
    switchView(viewName) {
        const validViews = [
            "hero",
            "camera",
            "voice"
        ];

        if (
            !validViews.includes(viewName)
        ) {
            return;
        }

        const previous =
            App.State.currentActiveView;

        if (
            previous === "voice" &&
            viewName !== "voice"
        ) {
            App.VoiceEngine?.stop?.();
        }

        if (
            previous === "camera" &&
            viewName !== "camera"
        ) {
            App.CameraOCR?.cancel?.();
            App.CameraEngine?.stop?.(true);
        }

        App.State.currentActiveView =
            viewName;

        document
            .querySelectorAll(
                ".screen-view"
            )
            .forEach(view => {
                view.classList.remove(
                    "active"
                );
            });

        const target =
            document.getElementById(
                `view-${viewName}`
            );

        if (target) {
            target.classList.add(
                "active"
            );
        }

        document
            .querySelectorAll(
                ".nav-icon-btn"
            )
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

        if (viewName === "camera") {
            App.CameraRenderer
                ?.clearCard?.();

            App.CameraEngine
                ?.init?.();
        }

        if (viewName === "voice") {
            App.VoiceEngine
                ?.start?.();
        }
    },

    tickClock() {
        const clock =
            document.getElementById(
                "hero-clock"
            );

        if (!clock) return;

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
