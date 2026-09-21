window.App = window.App || {};

App.VoiceEngine = {

    speechRecognitionInstance: null,

    speechRestartTimer: null,

    isStarting: false,

    isStopping: false,

    sessionId: 0,


    /*
     * ==========================================
     * CREATE SPEECH RECOGNITION
     * ==========================================
     */

    init() {

        const SpeechRec =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRec) {
            return null;
        }


        const rec =
            new SpeechRec();


        /*
         * We manually restart the recognition session.
         * This is more reliable across mobile browsers
         * than depending only on continuous=true.
         */

        rec.continuous = true;

        rec.interimResults = false;

        rec.maxAlternatives = 1;

        rec.lang =
            App.State.activeSpeakerLang;


        /*
         * ======================================
         * ON START
         * ======================================
         */

        rec.onstart = () => {

            this.isStarting = false;
            this.isStopping = false;

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;

            App.VoiceRenderer.updateMicVisuals(
                true
            );
        };


        /*
         * ======================================
         * ON RESULT
         * ======================================
         */

        rec.onresult = async (event) => {

            /*
             * Ignore results if the user has already
             * stopped the voice assistant.
             */

            if (
                !App.State.isContinuousListening
            ) {
                return;
            }


            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                const result =
                    event.results[i];

                if (
                    !result ||
                    !result.isFinal
                ) {
                    continue;
                }


                const transcript =
                    result[0]?.transcript
                        ?.trim();


                if (!transcript) {
                    continue;
                }


                /*
                 * Duplicate transcript protection.
                 */

                const now =
                    Date.now();

                const duplicate =
                    transcript ===
                        App.State.lastTranscript &&
                    (
                        now -
                        App.State.lastTranscriptTime
                    ) < 2500;


                if (duplicate) {
                    continue;
                }


                App.State.lastTranscript =
                    transcript;

                App.State.lastTranscriptTime =
                    now;


                /*
                 * Save current transcript.
                 */

                App.State.currentVoiceTranscript =
                    transcript;


                /*
                 * AI is processing the spoken input.
                 */

                App.State.currentVoiceState =
                    App.State.VoiceState.PROCESSING;


                try {

                    if (
                        App.VoiceAI &&
                        typeof App.VoiceAI.handleSpokenVoice ===
                            "function"
                    ) {

                        await App.VoiceAI.handleSpokenVoice(
                            transcript
                        );

                    } else {

                        throw new Error(
                            "VOICE_AI_UNAVAILABLE"
                        );
                    }

                } catch (error) {

                    console.error(
                        "Voice AI processing error:",
                        error
                    );

                    /*
                     * Do not crash the microphone.
                     * Return to listening state.
                     */

                    if (
                        App.State.isContinuousListening
                    ) {
                        App.State.currentVoiceState =
                            App.State.VoiceState.LISTENING;
                    }
                }

            }
        };


        /*
         * ======================================
         * ON ERROR
         * ======================================
         */

        rec.onerror = (event) => {

            const error =
                event?.error || "unknown";

            console.warn(
                "Speech recognition error:",
                error
            );


            /*
             * Permission denied.
             */

            if (
                error === "not-allowed" ||
                error === "service-not-allowed"
            ) {

                App.State.isContinuousListening =
                    false;

                this.cancelRestart();

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                App.VoiceRenderer.updateMicVisuals(
                    false
                );

                if (
                    App.Toast &&
                    typeof App.Toast.show ===
                        "function"
                ) {
                    App.Toast.show(
                        "Microphone permission denied."
                    );
                }

                return;
            }


            /*
             * Browser/network temporary errors.
             *
             * Do not immediately call start()
             * while the browser is still ending
             * the current recognition session.
             */

            if (
                error === "aborted" ||
                error === "no-speech" ||
                error === "audio-capture" ||
                error === "network"
            ) {

                if (
                    App.State.isContinuousListening
                ) {
                    this.scheduleRestart(
                        error === "no-speech"
                            ? 400
                            : 800
                    );
                }

                return;
            }


            /*
             * Unknown error.
             */

            if (
                App.State.isContinuousListening
            ) {
                this.scheduleRestart(1000);
            }
        };


        /*
         * ======================================
         * ON END
         * ======================================
         */

        rec.onend = () => {

            this.isStarting = false;

            this.isStopping = false;


            /*
             * If user deliberately stopped listening,
             * do NOT restart.
             */

            if (
                !App.State.isContinuousListening
            ) {

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                App.VoiceRenderer.updateMicVisuals(
                    false
                );

                return;
            }


            /*
             * Browser ended the recognition session.
             * Restart safely after a short delay.
             */

            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;

            this.scheduleRestart(350);
        };


        return rec;
    },


    /*
     * ==========================================
     * START RESTART TIMER
     * ==========================================
     */

    scheduleRestart(delayMs = 400) {

        this.cancelRestart();


        if (
            !App.State.isContinuousListening
        ) {
            return;
        }


        this.speechRestartTimer =
            setTimeout(() => {

                this.speechRestartTimer =
                    null;


                if (
                    !App.State.isContinuousListening
                ) {
                    return;
                }


                if (
                    App.State.currentVoiceState !==
                    App.State.VoiceState.IDLE
                ) {
                    return;
                }


                this.startRecognition();

            }, delayMs);
    },


    /*
     * ==========================================
     * CANCEL RESTART
     * ==========================================
     */

    cancelRestart() {

        if (this.speechRestartTimer) {

            clearTimeout(
                this.speechRestartTimer
            );

            this.speechRestartTimer =
                null;
        }
    },


    /*
     * ==========================================
     * START RECOGNITION SESSION
     * ==========================================
     */

    startRecognition() {

        if (
            !App.State.isContinuousListening
        ) {
            return;
        }


        if (this.isStarting) {
            return;
        }


        if (
            App.State.currentVoiceState ===
                App.State.VoiceState.LISTENING ||
            App.State.currentVoiceState ===
                App.State.VoiceState.STARTING
        ) {
            return;
        }


        if (!this.speechRecognitionInstance) {

            this.speechRecognitionInstance =
                this.init();

            if (
                !this.speechRecognitionInstance
            ) {

                App.State.isContinuousListening =
                    false;

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                App.VoiceRenderer.updateMicVisuals(
                    false
                );

                if (
                    App.Toast &&
                    typeof App.Toast.show ===
                        "function"
                ) {
                    App.Toast.show(
                        "Voice Recognition is not supported by this browser."
                    );
                }

                return;
            }
        }


        const recognition =
            this.speechRecognitionInstance;


        recognition.lang =
            App.State.activeSpeakerLang;


        this.isStarting = true;

        App.State.currentVoiceState =
            App.State.VoiceState.STARTING;


        try {

            recognition.start();

        } catch (error) {

            /*
             * Browser may throw InvalidStateError
             * if the engine is still transitioning.
             */

            this.isStarting = false;

            console.warn(
                "Speech recognition start failed:",
                error
            );


            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;


            if (
                App.State.isContinuousListening
            ) {
                this.scheduleRestart(700);
            }
        }
    },


    /*
     * ==========================================
     * PUBLIC START
     * ==========================================
     */

    start() {

        App.State.isContinuousListening =
            true;


        this.cancelRestart();


        if (
            App.State.currentVoiceState ===
                App.State.VoiceState.LISTENING ||
            App.State.currentVoiceState ===
                App.State.VoiceState.STARTING
        ) {
            return;
        }


        this.startRecognition();
    },


    /*
     * ==========================================
     * PUBLIC STOP
     * ==========================================
     */

    stop() {

        /*
         * Disable future automatic restarts first.
         */

        App.State.isContinuousListening =
            false;


        this.cancelRestart();


        this.isStopping = true;

        this.isStarting = false;


        App.State.currentVoiceState =
            App.State.VoiceState.STOPPING;


        const recognition =
            this.speechRecognitionInstance;


        if (recognition) {

            try {
                recognition.stop();
            } catch (error) {

                /*
                 * Recognition may already be stopped.
                 * Safe to ignore.
                 */

            }
        }


        App.VoiceRenderer.updateMicVisuals(
            false
        );


        App.State.currentVoiceState =
            App.State.VoiceState.IDLE;


        this.isStopping = false;
    },


    /*
     * ==========================================
     * TOGGLE
     * ==========================================
     */

    toggleListening() {

        if (
            App.State.isContinuousListening
        ) {

            this.stop();

            if (
                App.Toast &&
                typeof App.Toast.show ===
                    "function"
            ) {
                App.Toast.show(
                    "Voice Listening Paused"
                );
            }

        } else {

            this.start();

            if (
                App.Toast &&
                typeof App.Toast.show ===
                    "function"
            ) {
                App.Toast.show(
                    "Hands-Free Listening Started..."
                );
            }
        }
    },


    /*
     * ==========================================
     * SPEAKER LANGUAGE
     * ==========================================
     */

    setSpeaker(lang) {

        if (
            typeof lang !== "string" ||
            !lang.trim()
        ) {
            return;
        }


        const wasListening =
            App.State.isContinuousListening;


        /*
         * Stop current recognition before
         * changing its language.
         */

        if (wasListening) {
            this.stop();
        }


        App.State.activeSpeakerLang =
            lang;


        const btnJp =
            document.getElementById(
                "btn-speaker-jp"
            );

        const btnSi =
            document.getElementById(
                "btn-speaker-si"
            );

        const btnEn =
            document.getElementById(
                "btn-speaker-en"
            );

        const badge =
            document.getElementById(
                "detected-speaker-badge"
            );


        const normalClass =
            "bg-white text-gray-700 text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";

        const activeClass =
            "bg-deepCard text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";


        [btnJp, btnSi, btnEn]
            .forEach(button => {

                if (button) {
                    button.className =
                        normalClass;
                }
            });


        if (lang === "ja-JP") {

            if (btnJp) {
                btnJp.className =
                    activeClass;
            }

            if (badge) {
                badge.textContent =
                    "🇯🇵 JAPANESE SPOKEN:";
            }

        } else if (lang === "si-LK") {

            if (btnSi) {
                btnSi.className =
                    activeClass;
            }

            if (badge) {
                badge.textContent =
                    "🇱🇰 SINHALA SPOKEN:";
            }

        } else {

            if (btnEn) {
                btnEn.className =
                    activeClass;
            }

            if (badge) {
                badge.textContent =
                    "🇬🇧 ENGLISH SPOKEN:";
            }
        }


        /*
         * Update existing recognition object.
         */

        if (
            this.speechRecognitionInstance
        ) {
            this.speechRecognitionInstance.lang =
                lang;
        }


        /*
         * Restart after language change.
         */

        if (wasListening) {

            setTimeout(() => {

                this.start();

            }, 500);
        }
    },


    /*
     * ==========================================
     * VOICE CONTEXT
     * ==========================================
     */

    setContext(key, element) {

        if (
            typeof key !== "string"
        ) {
            return;
        }


        App.State.activeVoiceContext =
            key;


        document
            .querySelectorAll(".ctx-pill")
            .forEach(button => {

                button.className =
                    "ctx-pill bg-white text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm";
            });


        if (element) {

            element.className =
                "ctx-pill active bg-deepCard text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm";
        }


        if (
            App.Toast &&
            typeof App.Toast.show ===
                "function"
        ) {

            App.Toast.show(
                `Situation: ${key.toUpperCase()}`
            );
        }
    }
};
