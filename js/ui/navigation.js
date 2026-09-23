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

    // --------------------------------------------------------
    // Compatibility API
    //
    // app.js calls Navigation.switchView().
    // Keep goTo() as the single source of navigation logic.
    // --------------------------------------------------------
    switchView(view) {
        return this.goTo(view);
    },

    // --------------------------------------------------------
    // Main navigation handler
    // --------------------------------------------------------
    goTo(view) {

        if (!this.VALID_VIEWS.includes(view)) {
            return;
        }

        const previousView =
            State.currentActiveView;

        // ----------------------------------------------------
        // Do not repeatedly initialize the same view.
        // ----------------------------------------------------
        if (previousView === view) {
            return;
        }

        // ----------------------------------------------------
        // Leaving Voice
        //
        // Stop microphone recognition safely.
        // Do NOT clear the conversation.
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
        // Update application state
        // ----------------------------------------------------
        State.currentActiveView =
            view;

        // ----------------------------------------------------
        // Toggle screen visibility
        // ----------------------------------------------------
        document
            .querySelectorAll('.screen-view')
            .forEach(
                (screen) => {

                    screen.classList.toggle(
                        'active',
                        screen.dataset.view === view
                    );
                }
            );

        // ----------------------------------------------------
        // Update bottom navigation
        // ----------------------------------------------------
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

        // ----------------------------------------------------
        // Camera entry
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
        // Voice entry
        //
        // IMPORTANT:
        // Do NOT call clearConversation().
        //
        // Conversation history must remain available when
        // the user leaves Voice and returns later.
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
    }
};
