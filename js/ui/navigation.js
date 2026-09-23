import { State } from '../state.js';
import { CameraEngine } from '../camera/cameraEngine.js';
import { CameraOCR } from '../camera/cameraOCR.js';
import { VoiceEngine } from '../voice/voiceEngine.js';

export const Navigation = {

    VALID_VIEWS: [
        'hero',
        'camera',
        'voice'
    ],

    // Compatibility API used by app.js
    switchView(view) {
        return this.goTo(view);
    },

    goTo(view) {

        if (!this.VALID_VIEWS.includes(view)) {
            console.warn(
                `[Navigation] Invalid view: ${view}`
            );

            return false;
        }

        const previousView =
            State.currentActiveView;

        if (previousView === view) {
            return true;
        }

        // ----------------------------------------------------
        // Leaving Voice
        // ----------------------------------------------------

        if (
            previousView === 'voice' &&
            view !== 'voice'
        ) {
            try {
                VoiceEngine.stop();
            } catch (error) {
                console.warn(
                    '[Navigation] Voice stop failed:',
                    error
                );
            }
        }

        // ----------------------------------------------------
        // Leaving Camera
        // ----------------------------------------------------

        if (
            previousView === 'camera' &&
            view !== 'camera'
        ) {
            try {
                CameraOCR.cancel();
            } catch (error) {
                console.warn(
                    '[Navigation] OCR cancel failed:',
                    error
                );
            }

            try {
                CameraEngine.stop(true);
            } catch (error) {
                console.warn(
                    '[Navigation] Camera stop failed:',
                    error
                );
            }
        }

        // ----------------------------------------------------
        // Update active view
        // ----------------------------------------------------

        State.currentActiveView =
            view;

        // ----------------------------------------------------
        // Screen visibility
        // ----------------------------------------------------

        document
            .querySelectorAll('.screen-view')
            .forEach((screen) => {

                screen.classList.toggle(
                    'active',
                    screen.dataset.view === view
                );
            });

        // ----------------------------------------------------
        // Navigation state
        // ----------------------------------------------------

        document
            .querySelectorAll('[data-route]')
            .forEach((button) => {

                const isActive =
                    button.dataset.route === view;

                button.classList.toggle(
                    'active',
                    isActive
                );

                button.setAttribute(
                    'aria-current',
                    isActive
                        ? 'page'
                        : 'false'
                );
            });

        // ----------------------------------------------------
        // Enter Camera
        // ----------------------------------------------------

        if (view === 'camera') {

            try {
                CameraOCR.cancel();
            } catch (error) {
                console.warn(
                    '[Navigation] OCR reset failed:',
                    error
                );
            }

            try {
                CameraEngine.init();
            } catch (error) {
                console.error(
                    '[Navigation] Camera init failed:',
                    error
                );
            }
        }

        // ----------------------------------------------------
        // Enter Voice
        //
        // IMPORTANT:
        // Conversation is intentionally preserved.
        // ----------------------------------------------------

        if (view === 'voice') {

            try {

                if (
                    typeof VoiceEngine.prepareForView ===
                    'function'
                ) {
                    VoiceEngine.prepareForView();
                }

            } catch (error) {

                console.warn(
                    '[Navigation] Voice preparation failed:',
                    error
                );
            }
        }

        return true;
    }
};
