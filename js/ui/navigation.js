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

    // ========================================================
    // PUBLIC NAVIGATION API
    // ========================================================

    switchView(view) {
        return this.goTo(view);
    },

    goTo(view) {

        // ----------------------------------------------------
        // Validate requested view
        // ----------------------------------------------------

        if (!this.VALID_VIEWS.includes(view)) {
            console.warn(
                `[Navigation] Invalid view: ${view}`
            );

            return false;
        }

        const previousView =
            State.currentActiveView;


        // ----------------------------------------------------
        // Already on requested view
        // ----------------------------------------------------

        if (previousView === view) {
            return true;
        }


        // ====================================================
        // LEAVING VOICE
        // ====================================================

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


        // ====================================================
        // LEAVING CAMERA
        // ====================================================

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


        // ====================================================
        // UPDATE ACTIVE VIEW
        // ====================================================

        State.currentActiveView =
            view;


        // ====================================================
        // SCREEN VISIBILITY
        // ====================================================

        document
            .querySelectorAll('.screen-view')
            .forEach(
                (screen) => {

                    const isActive =
                        screen.dataset.view === view;

                    screen.classList.toggle(
                        'active',
                        isActive
                    );
                }
            );


        // ====================================================
        // NAVIGATION BUTTON STATE
        // ====================================================

        document
            .querySelectorAll('[data-route]')
            .forEach(
                (button) => {

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
                }
            );


        // ====================================================
        // CAMERA ENTRY
        // ====================================================

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


        // ====================================================
        // VOICE ENTRY
        // ====================================================
        //
        // IMPORTANT:
        //
        // Do NOT clear conversation here.
        //
        // The user may leave Voice and return later.
        // Existing conversation must remain available.
        //
        // ====================================================

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


        // ====================================================
        // SUCCESS
        // ====================================================

        return true;
    }
};
