// ============================================================
// Hello Japan AI
// js/ui/navigation.js
// View Navigation + View Lifecycle
// ============================================================

import { State } from '../state.js';

export const Navigation = {

    // ========================================================
    // SWITCH VIEW
    // ========================================================

    switchView(viewName) {

        const validViews = [
            'hero',
            'camera',
            'voice'
        ];

        if (
            !validViews.includes(viewName)
        ) {
            return false;
        }

        const previous =
            State.currentActiveView;

        // ----------------------------------------------------
        // Same-view navigation should be idempotent.
        //
        // Do not restart camera.
        // Do not clear voice conversation.
        // Do not stop/restart active resources.
        // ----------------------------------------------------

        if (
            previous === viewName
        ) {
            this.updateNavigationUI(
                viewName
            );

            return true;
        }

        // ----------------------------------------------------
        // LEAVE VOICE
        // ----------------------------------------------------

        if (
            previous === 'voice' &&
            viewName !== 'voice'
        ) {

            if (
                window.App?.VoiceEngine?.stop
            ) {
                window.App.VoiceEngine.stop();
            }

        }

        // ----------------------------------------------------
        // LEAVE CAMERA
        // ----------------------------------------------------

        if (
            previous === 'camera' &&
            viewName !== 'camera'
        ) {

            if (
                window.App?.CameraOCR?.cancel
            ) {
                window.App.CameraOCR.cancel();
            }

            if (
                window.App?.CameraEngine?.stop
            ) {
                window.App.CameraEngine.stop(
                    true
                );
            }
        }

        // ----------------------------------------------------
        // UPDATE APPLICATION STATE
        // ----------------------------------------------------

        State.currentActiveView =
            viewName;

        // ----------------------------------------------------
        // UPDATE SCREEN
        // ----------------------------------------------------

        document
            .querySelectorAll('.screen-view')
            .forEach(
                (view) => {
                    view.classList.remove(
                        'active'
                    );
                }
            );

        const target =
            document.getElementById(
                `view-${viewName}`
            );

        if (target) {
            target.classList.add(
                'active'
            );
        }

        // ----------------------------------------------------
        // UPDATE NAVIGATION BUTTONS
        // ----------------------------------------------------

        this.updateNavigationUI(
            viewName
        );

        // ----------------------------------------------------
        // ENTER CAMERA
        // ----------------------------------------------------

        if (
            viewName === 'camera'
        ) {

            if (
                window.App?.CameraRenderer
                    ?.clearCard
            ) {
                window.App.CameraRenderer
                    .clearCard();
            }

            if (
                window.App?.CameraEngine?.init
            ) {
                window.App.CameraEngine.init();
            }
        }

        // ----------------------------------------------------
        // ENTER VOICE
        //
        // IMPORTANT:
        // Do NOT clear the conversation here.
        //
        // Navigation should not destroy user-visible
        // conversation history.
        // ----------------------------------------------------

        if (
            viewName === 'voice'
        ) {

            if (
                window.App?.VoiceRenderer
                    ?.setListeningState
            ) {

                window.App.VoiceRenderer
                    .setListeningState(
                        false,
                        'Tap Mic to Speak'
                    );
            }
        }

        return true;
    },

    // ========================================================
    // NAVIGATION UI
    // ========================================================

    updateNavigationUI(
        activeView
    ) {

        document
            .querySelectorAll(
                '.nav-icon-btn'
            )
            .forEach(
                (button) => {

                    const nav =
                        button.dataset.nav;

                    const isActive =
                        nav === activeView;

                    button.classList.toggle(
                        'text-emerald-700',
                        isActive
                    );

                    button.classList.toggle(
                        'text-gray-400',
                        !isActive
                    );

                    if (isActive) {

                        button.setAttribute(
                            'aria-current',
                            'page'
                        );

                    } else {

                        button.removeAttribute(
                            'aria-current'
                        );
                    }
                }
            );
    },

    // ========================================================
    // CLOCK
    // ========================================================

    tickClock() {

        const clock =
            document.getElementById(
                'hero-clock'
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
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }
            );
    }
};
