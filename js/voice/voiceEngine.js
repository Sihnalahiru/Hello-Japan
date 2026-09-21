window.App = window.App || {};

App.VoiceEngine = {

    speechRecognitionInstance: null,

    speechRestartTimer: null,

    isStarting: false,

    isStopping: false,

    isPausedForSpeech: false,

    shouldResumeAfterSpeech: false,


    init() {

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;


        if (!SpeechRecognition) {
            return null;
        }


        const recognition =
            new SpeechRecognition();


        recognition.continuous =
            true;

        recognition.interimResults =
            false;

        recognition.maxAlternatives =
            1;

        recognition.lang =
            App.State.activeSpeakerLang;


        recognition.onstart =
            () => {

                this.isStarting =
                    false;

                this.isStopping =
                    false;


                if (
                    this.isPausedForSpeech
                ) {

                    try {
                        recognition.stop();
                    } catch {}

                    return;
                }


                App.State.currentVoiceState =
                    App.State.VoiceState.LISTENING;


                App.VoiceRenderer
                    ?.updateMicVisuals
                    ?.(
                        true
                    );
            };


        recognition.onresult =
            async event => {

                if (
                    this.isPausedForSpeech
                ) {
                    return;
                }

                if (
                    !App.State.isContinuousListening
                ) {
                    return;
                }


                for (
                    let i =
                        event.resultIndex;

                    i <
                    event.results.length;

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
                        result?.[0]?.transcript
                            ?.trim();


                    if (!transcript) {
                        continue;
                    }


                    const now =
                        Date.now();


                    const duplicate =
                        transcript ===
                            App.State.lastTranscript &&
                        now -
                            App.State.lastTranscriptTime <
                            2500;


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

                        await App.VoiceAI
                            ?.handleSpokenVoice
                            ?.(
                                transcript
                            );

                    } catch (error) {

                        console.error(
                            "Voice processing error:",
                            error
                        );
                    }


                    if (
                        App.State.isContinuousListening &&
                        !this.isPausedForSpeech
                    ) {

                        App.State.currentVoiceState =
                            App.State.VoiceState.LISTENING;
                    }
                }
            };


        recognition.onerror =
            event => {

                const error =
                    event?.error ||
                    "unknown";


                console.warn(
                    "Speech recognition:",
                    error
                );


                if (
                    this.isPausedForSpeech
                ) {
                    return;
                }


                if (
                    error === "not-allowed" ||
                    error ===
                        "service-not-allowed"
                ) {

                    App.State.isContinuousListening =
                        false;

                    this.cancelRestart();


                    App.State.currentVoiceState =
                        App.State.VoiceState.IDLE;


                    App.VoiceRenderer
                        ?.updateMicVisuals
                        ?.(
                            false
                        );


                    App.Toast?.show?.(
                        "🎤 Microphone permission was denied."
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
                            error ===
                                "no-speech"
                                ? 400
                                : 800
                        );
                    }

                    return;
                }


                if (
                    App.State.isContinuousListening
                ) {

                    this.scheduleRestart(
                        1000
                    );
                }
            };


        recognition.onend =
            () => {

                this.isStarting =
                    false;

                this.isStopping =
                    false;


                if (
                    this.isPausedForSpeech
                ) {

                    App.State.currentVoiceState =
                        App.State.VoiceState.IDLE;

                    return;
                }


                if (
                    !App.State.isContinuousListening
                ) {

                    App.State.currentVoiceState =
                        App.State.VoiceState.IDLE;


                    App.VoiceRenderer
                        ?.updateMicVisuals
                        ?.(
                            false
                        );

                    return;
                }


                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;


                this.scheduleRestart(
                    350
                );
            };


        return recognition;
    },


    startRecognition() {

        if (
            !App.State.isContinuousListening ||
            this.isPausedForSpeech ||
            this.isStarting
        ) {
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


                App.VoiceRenderer
                    ?.updateMicVisuals
                    ?.(
                        false
                    );


                App.Toast?.show?.(
                    "Voice recognition is not supported by this browser."
                );


                return;
            }
        }


        this.speechRecognitionInstance.lang =
            App.State.activeSpeakerLang;


        this.isStarting =
            true;


        App.State.currentVoiceState =
            App.State.VoiceState.STARTING;


        try {

            this.speechRecognitionInstance.start();

        } catch (error) {

            this.isStarting =
                false;


            console.warn(
                "Recognition start:",
                error
            );


            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;


            this.scheduleRestart(
                700
            );
        }
    },


    start() {

        App.State.isContinuousListening =
            true;


        if (
            this.isPausedForSpeech
        ) {

            this.shouldResumeAfterSpeech =
                true;

            return;
        }


        this.cancelRestart();


        this.startRecognition();
    },


    pauseForSpeech() {

        if (
            !App.State.isContinuousListening
        ) {
            return;
        }


        this.isPausedForSpeech =
            true;

        this.shouldResumeAfterSpeech =
            true;


        this.cancelRestart();


        if (
            this.speechRecognitionInstance
        ) {

            try {
                this.speechRecognitionInstance.stop();
            } catch {}
        }


        this.isStarting =
            false;


        App.State.currentVoiceState =
            App.State.VoiceState.IDLE;


        App.VoiceRenderer
            ?.updateMicVisuals
            ?.(
                false
            );
    },


    resumeAfterSpeech() {

        if (
            !this.shouldResumeAfterSpeech
        ) {

            this.isPausedForSpeech =
                false;

            return;
        }


        this.isPausedForSpeech =
            false;

        this.shouldResumeAfterSpeech =
            false;


        if (
            !App.State.isContinuousListening
        ) {
            return;
        }


        if (
            App.State.currentActiveView !==
            "voice"
        ) {
            return;
        }


        setTimeout(
            () => {

                if (
                    App.State.isContinuousListening &&
                    !this.isPausedForSpeech &&
                    App.State.currentActiveView ===
                        "voice"
                ) {

                    this.start();
                }

            },
            400
        );
    },


    stop() {

        App.State.isContinuousListening =
            false;

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


        if (
            this.speechRecognitionInstance
        ) {

            try {
                this.speechRecognitionInstance.stop();
            } catch {}
        }


        App.VoiceTTS
            ?.stop
            ?.();


        App.VoiceRenderer
            ?.updateMicVisuals
            ?.(
                false
            );


        App.State.currentVoiceState =
            App.State.VoiceState.IDLE;


        this.isStopping =
            false;
    },


    toggleListening() {

        if (
            App.State.isContinuousListening
        ) {

            this.stop();

            App.Toast?.show?.(
                "Voice Listening Paused"
            );

        } else {

            this.start();

            App.Toast?.show?.(
                "🎙️ Hands-Free Listening Started"
            );
        }
    },


    scheduleRestart(
        delayMs = 400
    ) {

        this.cancelRestart();


        if (
            !App.State.isContinuousListening ||
            this.isPausedForSpeech
        ) {
            return;
        }


        this.speechRestartTimer =
            setTimeout(
                () => {

                    this.speechRestartTimer =
                        null;


                    if (
                        !App.State.isContinuousListening ||
                        this.isPausedForSpeech
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

                },
                delayMs
            );
    },


    cancelRestart() {

        if (
            this.speechRestartTimer
        ) {

            clearTimeout(
                this.speechRestartTimer
            );

            this.speechRestartTimer =
                null;
        }
    },


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


        [
            btnJp,
            btnSi,
            btnEn
        ].forEach(
            button => {

                if (button) {
                    button.className =
                        normalClass;
                }
            }
        );


        if (
            lang === "ja-JP"
        ) {

            if (btnJp) {
                btnJp.className =
                    activeClass;
            }

            if (badge) {
                badge.textContent =
                    "🎙️ YOUR JAPANESE SPEECH";
            }

        } else if (
            lang === "si-LK"
        ) {

            if (btnSi) {
                btnSi.className =
                    activeClass;
            }

            if (badge) {
                badge.textContent =
                    "🎙️ YOUR SINHALA SPEECH";
            }

        } else {

            if (btnEn) {
                btnEn.className =
                    activeClass;
            }

            if (badge) {
                badge.textContent =
                    "🎙️ YOUR ENGLISH SPEECH";
            }
        }


        if (
            this.speechRecognitionInstance
        ) {

            this.speechRecognitionInstance.lang =
                lang;
        }


        if (wasListening) {

            setTimeout(
                () => {
                    this.start();
                },
                500
            );
        }
    },


    setContext(
        key,
        element
    ) {

        if (
            typeof key !== "string"
        ) {
            return;
        }


        App.State.activeVoiceContext =
            key;


        document
            .querySelectorAll(
                ".ctx-pill"
            )
            .forEach(
                button => {

                    button.className =
                        "ctx-pill bg-white text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm";
                }
            );


        if (element) {

            element.className =
                "ctx-pill active bg-deepCard text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm";
        }


        const env =
            document.getElementById(
                "voice-env-display"
            );


        const labels = {
            daily: "Context: Daily / Friendly",
            workplace: "Context: Workplace / Keigo",
            restaurant: "Context: Restaurant",
            konbini: "Context: Store / Konbini"
        };


        if (env) {
            env.textContent =
                labels[key] ||
                `Context: ${key}`;
        }
    }
};
