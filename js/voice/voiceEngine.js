window.App = window.App || {};

App.VoiceEngine = {

    speechRecognitionInstance: null,

    speechRestartTimer: null,

    isStarting: false,

    isStopping: false,

    isPausedForSpeech: false,

    shouldResumeAfterSpeech: false,

    sessionId: 0,


    /*
     * =========================================================
     * CREATE RECOGNITION
     * =========================================================
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


        rec.continuous = true;

        rec.interimResults = false;

        rec.maxAlternatives = 1;

        rec.lang =
            App.State.activeSpeakerLang;


        /*
         * -----------------------------------------------------
         * START
         * -----------------------------------------------------
         */

        rec.onstart = () => {

            this.isStarting = false;

            this.isStopping = false;


            if (this.isPausedForSpeech) {

                try {
                    rec.stop();
                } catch (error) {
                    /* already stopping */
                }

                return;
            }


            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;


            if (
                App.VoiceRenderer &&
                typeof App.VoiceRenderer.updateMicVisuals ===
                    "function"
            ) {

                App.VoiceRenderer.updateMicVisuals(true);
            }
        };


        /*
         * -----------------------------------------------------
         * RESULT
         * -----------------------------------------------------
         */

        rec.onresult = async event => {

            if (this.isPausedForSpeech) {
                return;
            }

            if (!App.State.isContinuousListening) {
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

                App.State.currentVoiceTranscript =
                    transcript;


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


                    if (
                        App.State.isContinuousListening &&
                        !this.isPausedForSpeech
                    ) {

                        App.State.currentVoiceState =
                            App.State.VoiceState.LISTENING;
                    }
                }
            }
        };


        /*
         * -----------------------------------------------------
         * ERROR
         * -----------------------------------------------------
         */

        rec.onerror = event => {

            const error =
                event?.error || "unknown";


            console.warn(
                "Speech recognition error:",
                error
            );


            if (this.isPausedForSpeech) {
                return;
            }


            if (
                error === "not-allowed" ||
                error === "service-not-allowed"
            ) {

                App.State.isContinuousListening =
                    false;

                this.cancelRestart();

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;


                App.VoiceRenderer?.updateMicVisuals?.(false);

                App.Toast?.show?.(
                    "Microphone permission denied."
                );

                return;
            }


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


            if (
                App.State.isContinuousListening
            ) {

                this.scheduleRestart(1000);
            }
        };


        /*
         * -----------------------------------------------------
         * END
         * -----------------------------------------------------
         */

        rec.onend = () => {

            this.isStarting = false;

            this.isStopping = false;


            if (this.isPausedForSpeech) {

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                return;
            }


            if (!App.State.isContinuousListening) {

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                App.VoiceRenderer?.updateMicVisuals?.(false);

                return;
            }


            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;


            this.scheduleRestart(350);
        };


        return rec;
    },


    /*
     * =========================================================
     * RESTART
     * =========================================================
     */

    scheduleRestart(delayMs = 400) {

        this.cancelRestart();


        if (!App.State.isContinuousListening) {
            return;
        }


        if (this.isPausedForSpeech) {
            return;
        }


        this.speechRestartTimer =
            setTimeout(() => {

                this.speechRestartTimer = null;


                if (!App.State.isContinuousListening) {
                    return;
                }


                if (this.isPausedForSpeech) {
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
     * =========================================================
     * START RECOGNITION
     * =========================================================
     */

    startRecognition() {

        if (!App.State.isContinuousListening) {
            return;
        }


        if (this.isPausedForSpeech) {
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


            if (!this.speechRecognitionInstance) {

                App.State.isContinuousListening =
                    false;

                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                App.VoiceRenderer?.updateMicVisuals?.(false);

                App.Toast?.show?.(
                    "Voice Recognition is not supported by this browser."
                );

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

            this.isStarting = false;

            console.warn(
                "Speech recognition start failed:",
                error
            );

            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;


            if (
                App.State.isContinuousListening &&
                !this.isPausedForSpeech
            ) {

                this.scheduleRestart(700);
            }
        }
    },


    /*
     * =========================================================
     * START
     * =========================================================
     */

    start() {

        if (this.isPausedForSpeech) {

            this.shouldResumeAfterSpeech =
                true;

            App.State.isContinuousListening =
                true;

            return;
        }


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
     * =========================================================
     * PAUSE WHILE AI SPEAKS
     * =========================================================
     */

    pauseForSpeech() {

        if (!App.State.isContinuousListening) {
            return;
        }


        this.isPausedForSpeech =
            true;

        this.shouldResumeAfterSpeech =
            true;


        this.cancelRestart();


        const recognition =
            this.speechRecognitionInstance;


        if (recognition) {

            try {
                recognition.stop();
            } catch (error) {
                /* already stopped */
            }
        }


        this.isStarting = false;


        App.State.currentVoiceState =
            App.State.VoiceState.IDLE;


        App.VoiceRenderer?.updateMicVisuals?.(false);
    },


    /*
     * =========================================================
     * RESUME AFTER TTS
     * =========================================================
     */

    resumeAfterSpeech() {

        if (!this.shouldResumeAfterSpeech) {

            this.isPausedForSpeech =
                false;

            return;
        }


        this.isPausedForSpeech =
            false;

        this.shouldResumeAfterSpeech =
            false;


        if (!App.State.isContinuousListening) {
            return;
        }


        if (
            App.State.currentActiveView !==
            "voice"
        ) {

            return;
        }


        setTimeout(() => {

            if (
                App.State.isContinuousListening &&
                !this.isPausedForSpeech &&
                App.State.currentActiveView ===
                    "voice"
            ) {

                this.start();
            }

        }, 350);
    },


    /*
     * =========================================================
     * STOP COMPLETELY
     * =========================================================
     */

    stop() {

        App.State.isContinuousListening =
            false;


        App.State.voiceRequestId++;


        this.shouldResumeAfterSpeech =
            false;

        this.isPausedForSpeech =
            false;


        this.cancelRestart();


        this.isStopping =
            true;

        this.isStarting =
            false;


        App.State.currentVoiceState =
            App.State.VoiceState.STOPPING;


        const recognition =
            this.speechRecognitionInstance;


        if (recognition) {

            try {
                recognition.stop();
            } catch (error) {
                /* already stopped */
            }
        }


        if (
            App.VoiceTTS &&
            typeof App.VoiceTTS.stop === "function"
        ) {

            App.VoiceTTS.stop();
        }


        App.VoiceRenderer?.updateMicVisuals?.(false);


        App.State.currentVoiceState =
            App.State.VoiceState.IDLE;


        this.isStopping =
            false;
    },


    /*
     * =========================================================
     * USER TOGGLE
     * =========================================================
     */

    toggleListening() {

        if (App.State.isContinuousListening) {

            this.stop();

            App.Toast?.show?.(
                "Voice Listening Paused"
            );

        } else {

            this.start();

            App.Toast?.show?.(
                "Hands-Free Listening Started..."
            );
        }
    },


    /*
     * =========================================================
     * SPEAKER
     * =========================================================
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


        if (wasListening) {
            this.stop();
        }


        App.State.activeSpeakerLang =
            lang;


        const btnJp =
            document.getElementById("btn-speaker-jp");

        const btnSi =
            document.getElementById("btn-speaker-si");

        const btnEn =
            document.getElementById("btn-speaker-en");

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

            btnJp?.classList.remove(
                "bg-white",
                "text-gray-700"
            );

            btnJp?.classList.add(
                "bg-deepCard",
                "text-white"
            );

            if (badge) {
                badge.textContent =
                    "🇯🇵 JAPANESE SPOKEN:";
            }

        } else if (lang === "si-LK") {

            btnSi?.classList.remove(
                "bg-white",
                "text-gray-700"
            );

            btnSi?.classList.add(
                "bg-deepCard",
                "text-white"
            );

            if (badge) {
                badge.textContent =
                    "🇱🇰 SINHALA SPOKEN:";
            }

        } else {

            btnEn?.classList.remove(
                "bg-white",
                "text-gray-700"
            );

            btnEn?.classList.add(
                "bg-deepCard",
                "text-white"
            );

            if (badge) {
                badge.textContent =
                    "🇬🇧 ENGLISH SPOKEN:";
            }
        }


        if (this.speechRecognitionInstance) {

            this.speechRecognitionInstance.lang =
                lang;
        }


        if (wasListening) {

            setTimeout(() => {
                this.start();
            }, 500);
        }
    },


    /*
     * =========================================================
     * CONTEXT
     * =========================================================
     */

    setContext(key, element) {

        if (typeof key !== "string") {
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


        App.Toast?.show?.(
            `Situation: ${key.toUpperCase()}`
        );
    }
};
