window.App = window.App || {};

App.VoiceTTS = {

    isSpeaking: false,

    currentUtterance: null,

    voiceCache: [],

    voicesReady: false,

    resumeVoiceAfterSpeech: false,


    init() {

        if (
            !("speechSynthesis" in window)
        ) {
            return false;
        }

        this.loadVoices();

        window.speechSynthesis.onvoiceschanged =
            () => {
                this.loadVoices();
            };

        return true;
    },


    loadVoices() {

        if (
            !("speechSynthesis" in window)
        ) {
            return;
        }

        const voices =
            window.speechSynthesis.getVoices();

        if (
            !Array.isArray(voices) ||
            !voices.length
        ) {
            return;
        }

        this.voiceCache =
            voices.slice();

        this.voicesReady = true;
    },


    findJapaneseVoice() {

        if (!this.voiceCache.length) {
            this.loadVoices();
        }

        const exact =
            this.voiceCache.find(
                voice => {

                    const lang =
                        String(voice.lang || "")
                            .toLowerCase()
                            .replace("_", "-");

                    return lang === "ja-jp";
                }
            );

        if (exact) {
            return exact;
        }

        return this.voiceCache.find(
            voice => {

                const lang =
                    String(voice.lang || "")
                        .toLowerCase()
                        .replace("_", "-");

                return lang.startsWith("ja");
            }
        ) || null;
    },


    speakText(text, options = {}) {

        if (
            typeof text !== "string" ||
            !text.trim()
        ) {
            return false;
        }

        if (
            !("speechSynthesis" in window)
        ) {

            App.Toast?.show?.(
                "Japanese speech is not supported by this browser."
            );

            return false;
        }


        const cleanText =
            text.trim();


        /*
         * Pause recognition.
         * DO NOT stop the entire voice assistant.
         */
        if (
            App.VoiceEngine &&
            App.State?.isContinuousListening &&
            typeof App.VoiceEngine.pauseForSpeech ===
                "function"
        ) {

            this.resumeVoiceAfterSpeech = true;

            App.VoiceEngine.pauseForSpeech();
        }


        try {
            window.speechSynthesis.cancel();
        } catch {}


        this.loadVoices();


        const utterance =
            new SpeechSynthesisUtterance(
                cleanText
            );


        utterance.lang =
            options.lang || "ja-JP";


        const japaneseVoice =
            this.findJapaneseVoice();

        if (japaneseVoice) {
            utterance.voice =
                japaneseVoice;
        }


        utterance.rate =
            Number.isFinite(options.rate)
                ? Math.min(
                    1.2,
                    Math.max(0.6, options.rate)
                )
                : 0.9;


        utterance.pitch =
            Number.isFinite(options.pitch)
                ? options.pitch
                : 1;


        utterance.volume =
            Number.isFinite(options.volume)
                ? options.volume
                : 1;


        this.currentUtterance =
            utterance;

        this.isSpeaking =
            true;


        utterance.onstart =
            () => {

                this.isSpeaking =
                    true;

                App.VoiceRenderer
                    ?.updateMicVisuals
                    ?.(
                        false
                    );
            };


        utterance.onend =
            () => {

                this.isSpeaking =
                    false;

                this.currentUtterance =
                    null;


                if (
                    this.resumeVoiceAfterSpeech
                ) {

                    this.resumeVoiceAfterSpeech =
                        false;

                    App.VoiceEngine
                        ?.resumeAfterSpeech
                        ?.();
                }
            };


        utterance.onerror =
            event => {

                console.warn(
                    "TTS error:",
                    event?.error
                );

                this.isSpeaking =
                    false;

                this.currentUtterance =
                    null;


                if (
                    this.resumeVoiceAfterSpeech
                ) {

                    this.resumeVoiceAfterSpeech =
                        false;

                    App.VoiceEngine
                        ?.resumeAfterSpeech
                        ?.();
                }
            };


        try {

            window.speechSynthesis.speak(
                utterance
            );

            return true;

        } catch (error) {

            console.error(
                "TTS start error:",
                error
            );

            this.isSpeaking =
                false;

            this.currentUtterance =
                null;

            return false;
        }
    },


    speakCurrentDetected() {

        const text =
            App.State.currentVoiceJapanese ||
            App.State.currentVoiceTranscript;

        if (!text) {
            return;
        }

        this.speakText(
            text
        );
    },


    speakReplyOption(japaneseText) {

        if (
            typeof japaneseText !== "string" ||
            !japaneseText.trim()
        ) {
            return;
        }

        this.speakText(
            japaneseText
        );
    },


    stop() {

        this.isSpeaking =
            false;

        this.currentUtterance =
            null;

        this.resumeVoiceAfterSpeech =
            false;


        if (
            "speechSynthesis" in window
        ) {

            try {
                window.speechSynthesis.cancel();
            } catch {}
        }
    }
};
