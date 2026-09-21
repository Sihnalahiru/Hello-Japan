window.App = window.App || {};

App.VoiceEngine = {
    recognition: null,
    restartTimer: null,

    isStarting: false,
    isStopping: false,
    isPausedForSpeech: false,
    shouldResumeAfterSpeech: false,

    createRecognition() {
        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            return null;
        }

        const recognition =
            new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.lang =
            App.State.activeSpeakerLang;

        recognition.onstart = () => {
            this.isStarting = false;
            this.isStopping = false;

            if (this.isPausedForSpeech) {
                try {
                    recognition.stop();
                } catch {}
                return;
            }

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;

            App.VoiceRenderer?.updateMicVisuals?.(
                true
            );
        };

        recognition.onresult = event => {
            if (this.isPausedForSpeech) return;
            if (!App.State.isContinuousListening) return;

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {
                const result =
                    event.results[i];

                if (!result?.isFinal) continue;

                const transcript =
                    result?.[0]?.transcript
                        ?.trim();

                if (!transcript) continue;

                const now = Date.now();

                if (
                    transcript ===
                        App.State.lastTranscript &&
                    now -
                        App.State.lastTranscriptTime <
                        2500
                ) {
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

                App.VoiceAI
                    ?.handleSpokenVoice?.(
                        transcript
                    );
            }
        };

        recognition.onerror = event => {
            const error =
                event?.error || "unknown";

            console.warn(
                "SpeechRecognition:",
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

                App.VoiceRenderer?.updateMicVisuals?.(
                    false
                );

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
                            ? 600
                            : 1000
                    );
                }

                return;
            }

            if (
                App.State.isContinuousListening
            ) {
                this.scheduleRestart(1200);
            }
        };

        recognition.onend = () => {
            this.isStarting = false;
            this.isStopping = false;

            if (this.isPausedForSpeech) {
                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;
                return;
            }

            if (
                !App.State.isContinuousListening
            ) {
                App.State.currentVoiceState =
                    App.State.VoiceState.IDLE;

                App.VoiceRenderer?.updateMicVisuals?.(
                    false
                );

                return;
            }

            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;

            this.scheduleRestart(500);
        };

        return recognition;
    },

    scheduleRestart(delay = 500) {
        this.cancelRestart();

        if (!App.State.isContinuousListening) {
            return;
        }

        if (this.isPausedForSpeech) {
            return;
        }

        this.restartTimer =
            setTimeout(() => {
                this.restartTimer = null;

                if (
                    !App.State.isContinuousListening ||
                    this.isPausedForSpeech
                ) {
                    return;
                }

                if (
                    App.State.currentActiveView !==
                    "voice"
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
            }, delay);
    },

    cancelRestart() {
        if (this.restartTimer) {
            clearTimeout(
                this.restartTimer
            );

            this.restartTimer = null;
        }
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
            App.State.currentActiveView !==
            "voice"
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

        if (!this.recognition) {
            this.recognition =
                this.createRecognition();
        }

        if (!this.recognition) {
            App.State.isContinuousListening =
                false;

            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;

            App.Toast?.show?.(
                "Voice Recognition is not supported by this browser."
            );

            return;
        }

        this.recognition.lang =
            App.State.activeSpeakerLang;

        this.isStarting = true;

        App.State.currentVoiceState =
            App.State.VoiceState.STARTING;

        try {
            this.recognition.start();
        } catch (error) {
            this.isStarting = false;

            console.warn(
                "Recognition start:",
                error
            );

            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;

            if (
                App.State.isContinuousListening
            ) {
                this.scheduleRestart(900);
            }
        }
    },

    start() {
        if (
            App.State.currentActiveView !==
            "voice"
        ) {
            return;
        }

        App.State.isContinuousListening =
            true;

        this.cancelRestart();

        this.startRecognition();
    },

    pauseForSpeech() {
        if (
            !App.State.isContinuousListening
        ) {
            return;
        }

        this.isPausedForSpeech = true;
        this.shouldResumeAfterSpeech = true;

        this.cancelRestart();

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch {}
        }

        this.isStarting = false;

        App.State.currentVoiceState =
            App.State.VoiceState.IDLE;

        App.VoiceRenderer?.updateMicVisuals?.(
            false
        );
    },

    resumeAfterSpeech() {
        if (
            !this.shouldResumeAfterSpeech
        ) {
            this.isPausedForSpeech = false;
            return;
        }

        this.isPausedForSpeech = false;
        this.shouldResumeAfterSpeech = false;

        if (
            !App.State.isContinuousListening ||
            App.State.currentActiveView !==
                "voice"
        ) {
            return;
        }

        this.scheduleRestart(500);
    },

    stop() {
        App.State.isContinuousListening =
            false;

        this.shouldResumeAfterSpeech = false;
        this.isPausedForSpeech = false;

        this.cancelRestart();

        App.State.voiceRequestId++;

        this.isStopping = true;
        this.isStarting = false;

        App.State.currentVoiceState =
            App.State.VoiceState.STOPPING;

        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch {
                try {
                    this.recognition.stop();
                } catch {}
            }
        }

        App.VoiceTTS?.stop?.();

        App.VoiceRenderer?.updateMicVisuals?.(
            false
        );

        App.State.currentVoiceState =
            App.State.VoiceState.IDLE;

        this.isStopping = false;
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
                "Hands-Free Listening Started"
            );
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

        const buttons = [
            document.getElementById(
                "btn-speaker-jp"
            ),
            document.getElementById(
                "btn-speaker-si"
            ),
            document.getElementById(
                "btn-speaker-en"
            )
        ];

        const normal =
            "bg-white text-gray-700 text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";

        const active =
            "bg-deepCard text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";

        buttons.forEach(button => {
            if (button) {
                button.className = normal;
            }
        });

        const badge =
            document.getElementById(
                "detected-speaker-badge"
            );

        if (lang === "ja-JP") {
            buttons[0] &&
                (buttons[0].className = active);

            if (badge) {
                badge.textContent =
                    "🇯🇵 JAPANESE SPOKEN:";
            }
        } else if (lang === "si-LK") {
            buttons[1] &&
                (buttons[1].className = active);

            if (badge) {
                badge.textContent =
                    "🇱🇰 SINHALA SPOKEN:";
            }
        } else {
            buttons[2] &&
                (buttons[2].className = active);

            if (badge) {
                badge.textContent =
                    "🇬🇧 ENGLISH SPOKEN:";
            }
        }

        if (wasListening) {
            setTimeout(
                () => this.start(),
                400
            );
        }
    },

    setContext(key, element) {
        if (
            typeof key !== "string" ||
            !key.trim()
        ) {
            return;
        }

        App.State.activeVoiceContext =
            key.trim();

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
