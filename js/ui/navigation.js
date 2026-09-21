window.App = window.App || {};

App.Navigation = {

    switchView(viewName) {

        const validViews = [
            "hero",
            "camera",
            "voice"
        ];


        if (
            !validViews.includes(
                viewName
            )
        ) {
            return;
        }


        const previousView =
            App.State.currentActiveView;


        if (
            previousView === "camera" &&
            viewName !== "camera"
        ) {

            App.CameraOCR
                ?.cancel
                ?.();

            App.CameraEngine
                ?.stop
                ?.(
                    true
                );
        }


        if (
            previousView === "voice" &&
            viewName !== "voice"
        ) {

            App.VoiceEngine
                ?.stop
                ?.();
        }


        App.State.currentActiveView =
            viewName;


        document
            .querySelectorAll(
                ".screen-view"
            )
            .forEach(
                view => {

                    view.classList.remove(
                        "active"
                    );
                }
            );


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
            .forEach(
                button => {

                    const nav =
                        button.dataset.nav;


                    if (
                        nav === viewName
                    ) {

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
                }
            );


        if (
            viewName === "camera"
        ) {

            App.CameraRenderer
                ?.clearCard
                ?.();

            App.CameraEngine
                ?.init
                ?.();
        }


        if (
            viewName === "voice"
        ) {

            App.VoiceEngine
                ?.start
                ?.();
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


        const now =
            new Date();


        clock.textContent =
            now.toLocaleTimeString(
                [],
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );
    }
};
