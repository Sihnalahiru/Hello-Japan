window.App = window.App || {};

App.VoiceEngine = {

    recognition: null,

    isSupported: false,
    isListening: false,
    isStarting: false,
    isStopping: false,

    shouldListen: false,
    restartTimer: null,

    init() {

        if (this.recognition) {
            return this.isSupported;
        }

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {

            this.isSupported = false;

            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;

            App.VoiceRenderer?.setListeningState(
                false,
                "Speech recognition is not supported on this browser."
            );

            return false;
        }

        this.isSupported = true;

        const recognition =
            new SpeechRecognition();

        /*
         * IMPORTANT
         *
         * continuous=true is useful on
         * desktop/Android but iOS Safari
         * may terminate it frequently.
         *
         * We handle onend and restart
         * ourselves.
         */
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.lang =
            App.State.activeSpeakerLang ||
            "ja-JP";

        recognition.onstart = () => {

            this.isStarting = false;
            this.isStopping = false;
            this.isListening = true;

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;

            App.VoiceRenderer?.setListeningState(
                true,
                "Listening..."
            );
        };

        recognition.onresult = async (event) => {

            if (!this.shouldListen) {
                return;
            }

            const lastIndex =
                event.results.length - 1;

            const result =
                event.results[lastIndex];

            if (!result) {
                return;
            }

            const transcript =
                result[0]?.transcript
                    ?.trim();

            if (!transcript) {
                return;
            }

            /*
             * Ignore duplicate iOS results.
             */
            const now = Date.now();

            if (
                transcript ===
                    App.State.lastTranscript &&
                now -
                    App.State.lastTranscriptTime <
                    1200
            ) {
                return;
            }

            App.State.lastTranscript =
                transcript;

            App.State.lastTranscriptTime =
                now;

            App.State.currentVoiceTranscript =
                transcript;

            App.State.currentVoiceState =
                App.State.VoiceState.PROCESSING;

            App.VoiceRenderer?.setListeningState(
                false,
                "Processing..."
            );

            try {

                await App.VoiceAI
                    ?.handleSpokenVoice(
                        transcript
                    );

            } catch (error) {

                console.error(
                    "Voice processing error:",
                    error
                );

                App.VoiceRenderer?.showError(
                    "AI processing failed."
                );

            } finally {

                if (
                    this.shouldListen &&
                    App.State.currentActiveView ===
                        "voice"
                ) {

                    App.State.currentVoiceState =
                        App.State.VoiceState.LISTENING;

                    /*
                     * Recognition may have stopped
                     * while Gemini was processing.
                     *
                     * Restart safely.
                     */
                    this.safeRestart();
                }
            }
        };

        recognition.onerror = (event) => {

            console.warn(
                "Speech recognition error:",
                event.error
            );

            this.isStarting = false;
            this.isListening = false;

            /*
             * Permission problems must stop.
             */
            if (
                event.error ===
                    "not-allowed" ||
                event.error ===
                    "service-not-allowed"
            ) {

                this.shouldListen = false;

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                App.VoiceRenderer?.setListeningState(
                    false,
                    "Microphone permission required."
                );

                return;
            }

            /*
             * These are recoverable.
             */
            if (
                event.error ===
                    "no-speech" ||
                event.error ===
                    "aborted" ||
                event.error ===
                    "network" ||
                event.error ===
                    "audio-capture"
            ) {

                if (
                    this.shouldListen
                ) {
                    this.scheduleRestart();
                }

                return;
            }

            if (
                this.shouldListen
            ) {
                this.scheduleRestart();
            }
        };

        recognition.onend = () => {

            this.isListening = false;
            this.isStarting = false;

            if (
                !this.shouldListen
            ) {

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                App.VoiceRenderer?.setListeningState(
                    false,
                    "Tap microphone to speak."
                );

                return;
            }

            /*
             * iOS Safari frequently ends
             * recognition automatically.
             *
             * Restart it safely.
             */
            this.scheduleRestart();
        };

        this.recognition =
            recognition;

        return true;
    },

    async start() {

        if (!this.init()) {
            return false;
        }

        if (this.isListening) {
            return true;
        }

        if (this.isStarting) {
            return true;
        }

        this.shouldListen = true;

        App.State.isContinuousListening =
            true;

        App.State.currentVoiceState =
            App.State.VoiceState.STARTING;

        App.VoiceRenderer?.setListeningState(
            false,
            "Starting microphone..."
        );

        return this.safeStart();
    },

    safeStart() {

        if (
            !this.recognition ||
            !this.shouldListen
        ) {
            return false;
        }

        if (
            this.isListening ||
            this.isStarting
        ) {
            return true;
        }

        this.isStarting = true;

        try {

            this.recognition.start();

            return true;

        } catch (error) {

            this.isStarting = false;

            /*
             * InvalidStateError normally means
             * recognition is already starting/
             * running even though browser state
             * has not updated yet.
             */
            if (
                error?.name ===
                "InvalidStateError"
            ) {

                this.scheduleRestart(
                    500
                );

                return true;
            }

            console.error(
                "SpeechRecognition.start failed:",
                error
            );

            this.shouldListen = false;

            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;

            App.VoiceRenderer?.setListeningState(
                false,
                "Could not start microphone."
            );

            return false;
        }
    },

    scheduleRestart(
        delay = 350
    ) {

        if (
            !this.shouldListen
        ) {
            return;
        }

        if (
            this.restartTimer
        ) {
            return;
        }

        this.restartTimer =
            setTimeout(() => {

                this.restartTimer =
                    null;

                if (
                    !this.shouldListen ||
                    this.isListening ||
                    this.isStarting
                ) {
                    return;
                }

                this.safeStart();

            }, delay);
    },

    safeRestart() {

        if (
            !this.shouldListen
        ) {
            return;
        }

        if (
            this.isListening ||
            this.isStarting
        ) {
            return;
        }

        this.scheduleRestart(
            300
        );
    },

    pauseForSpeech() {

        if (
            !this.recognition
        ) {
            return;
        }

        /*
         * We temporarily stop recognition
         * while TTS is speaking.
         *
         * shouldListen remains TRUE so
         * resumeAfterSpeech() can restart it.
         */
        if (
            this.isListening ||
            this.isStarting
        ) {

            try {

                this.recognition.stop();

            } catch (error) {

                console.warn(
                    "Recognition stop during TTS:",
                    error
                );
            }
        }
    },

    resumeAfterSpeech() {

        if (
            !this.shouldListen
        ) {
            return;
        }

        if (
            App.State.currentActiveView !==
            "voice"
        ) {
            return;
        }

        this.scheduleRestart(
            450
        );
    },

    stop() {

        this.shouldListen = false;

        App.State.isContinuousListening =
            false;

        if (
            this.restartTimer
        ) {

            clearTimeout(
                this.restartTimer
            );

            this.restartTimer =
                null;
        }

        this.isStopping = true;
        this.isStarting = false;

        if (
            this.recognition
        ) {

            try {

                this.recognition.stop();

            } catch (error) {

                console.warn(
                    "Recognition stop:",
                    error
                );
            }
        }

        this.isListening = false;

        App.State.currentVoiceState =
            App.State.VoiceState.IDLE;

        App.VoiceRenderer?.setListeningState(
            false,
            "Tap microphone to speak."
        );

        this.isStopping = false;
    },

    toggleListening() {

        if (
            this.shouldListen ||
            this.isListening ||
            this.isStarting
        ) {

            this.stop();

            return false;
        }

        return this.start();
    },

    setSpeaker(
        lang
    ) {

        const wasListening =
            this.shouldListen;

        /*
         * Stop first so the browser does not
         * keep the old language session.
         */
        this.stop();

        App.State.activeSpeakerLang =
            lang;

        if (
            this.recognition
        ) {

            this.recognition.lang =
                lang;
        }

        App.VoiceRenderer?.updateSpeakerUI?.(
            lang
        );

        /*
         * Restart only if the user was
         * already listening.
         */
        if (
            wasListening
        ) {

            setTimeout(
                () => {
                    this.start();
                },
                250
            );
        }
    },

    setContext(
        context
    ) {

        if (
            !context
        ) {
            return;
        }

        App.State.activeVoiceContext =
            context;

        App.VoiceRenderer?.updateContextUI?.(
            context
        );
    }
};
