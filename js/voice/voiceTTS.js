window.App = window.App || {};

App.VoiceTTS = {

    isSpeaking: false,

    currentUtterance: null,

    voiceCache: [],

    voicesReady: false,


    /*
     * ==========================================
     * INITIALIZE VOICES
     * ==========================================
     */

    init() {

        if (!("speechSynthesis" in window)) {
            return false;
        }

        this.loadVoices();

        if (
            typeof window.speechSynthesis.onvoiceschanged !==
            "undefined"
        ) {

            window.speechSynthesis.onvoiceschanged = () => {
                this.loadVoices();
            };
        }

        return true;
    },


    loadVoices() {

        if (!("speechSynthesis" in window)) {
            return;
        }

        const voices =
            window.speechSynthesis.getVoices();

        if (
            !Array.isArray(voices) ||
            voices.length === 0
        ) {
            return;
        }

        this.voiceCache =
            voices.slice();

        this.voicesReady = true;
    },


    /*
     * ==========================================
     * FIND JAPANESE VOICE
     * ==========================================
     */

    findJapaneseVoice() {

        if (
            !this.voiceCache ||
            this.voiceCache.length === 0
        ) {

            this.loadVoices();
        }

        const voices =
            this.voiceCache || [];

        if (!voices.length) {
            return null;
        }


        /*
         * Prefer Japanese voices.
         */

        const japaneseVoice =
            voices.find(voice => {

                const lang =
                    typeof voice.lang === "string"
                        ? voice.lang
                            .toLowerCase()
                            .replace("_", "-")
                        : "";

                return lang === "ja-jp";
            });


        if (japaneseVoice) {
            return japaneseVoice;
        }


        /*
         * Fallback to any Japanese locale.
         */

        const japaneseFallback =
            voices.find(voice => {

                const lang =
                    typeof voice.lang === "string"
                        ? voice.lang
                            .toLowerCase()
                            .replace("_", "-")
                        : "";

                return lang.startsWith("ja");
            });


        return japaneseFallback || null;
    },


    /*
     * ==========================================
     * SPEAK JAPANESE
     * ==========================================
     */

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

            if (
                App.Toast &&
                typeof App.Toast.show ===
                    "function"
            ) {

                App.Toast.show(
                    "Japanese speech is not supported by this browser."
                );
            }

            return false;
        }


        const cleanText =
            text.trim();


        /*
         * Stop previous speech.
         */

        try {

            window.speechSynthesis.cancel();

        } catch (error) {

            console.warn(
                "Speech cancel notice:",
                error
            );
        }


        /*
         * Stop recognition while AI is speaking.
         *
         * This is important because otherwise
         * SpeechRecognition may hear the AI's own
         * voice and create another request.
         */

        if (
            App.VoiceEngine &&
            App.State?.isContinuousListening &&
            typeof App.VoiceEngine.stop ===
                "function"
        ) {

            App.VoiceEngine.stop();
        }


        /*
         * Make sure voices are loaded.
         */

        this.loadVoices();


        const utterance =
            new SpeechSynthesisUtterance(
                cleanText
            );


        /*
         * Japanese voice.
         */

        utterance.lang =
            options.lang ||
            "ja-JP";


        const japaneseVoice =
            this.findJapaneseVoice();


        if (japaneseVoice) {

            utterance.voice =
                japaneseVoice;
        }


        /*
         * Natural Japanese speaking speed.
         */

        const rate =
            Number.isFinite(options.rate)
                ? options.rate
                : 0.92;


        utterance.rate =
            Math.min(
                1.2,
                Math.max(
                    0.6,
                    rate
                )
            );


        utterance.pitch =
            Number.isFinite(options.pitch)
                ? options.pitch
                : 1.0;


        utterance.volume =
            Number.isFinite(options.volume)
                ? options.volume
                : 1.0;


        this.currentUtterance =
            utterance;


        this.isSpeaking =
            true;


        /*
         * ==========================================
         * SPEECH START
         * ==========================================
         */

        utterance.onstart = () => {

            this.isSpeaking =
                true;

            if (
                App.VoiceRenderer &&
                typeof App.VoiceRenderer.updateMicVisuals ===
                    "function"
            ) {

                App.VoiceRenderer.updateMicVisuals(
                    false
                );
            }
        };


        /*
         * ==========================================
         * SPEECH END
         * ==========================================
         */

        utterance.onend = () => {

            this.isSpeaking =
                false;

            this.currentUtterance =
                null;


            /*
             * Restart hands-free listening after
             * AI finishes speaking.
             */

            if (
                App.State &&
                App.State.currentActiveView ===
                    "voice" &&
                App.State.isContinuousListening &&
                App.VoiceEngine &&
                typeof App.VoiceEngine.start ===
                    "function"
            ) {

                setTimeout(() => {

                    if (
                        App.State.currentActiveView ===
                            "voice" &&
                        App.State.isContinuousListening &&
                        !this.isSpeaking
                    ) {

                        App.VoiceEngine.start();
                    }

                }, 350);
            }
        };


        /*
         * ==========================================
         * SPEECH ERROR
         * ==========================================
         */

        utterance.onerror = event => {

            this.isSpeaking =
                false;

            this.currentUtterance =
                null;


            console.warn(
                "Speech synthesis error:",
                event?.error || "unknown"
            );


            /*
             * Restart listening if the assistant
             * was operating in hands-free mode.
             */

            if (
                App.State &&
                App.State.currentActiveView ===
                    "voice" &&
                App.State.isContinuousListening &&
                App.VoiceEngine &&
                typeof App.VoiceEngine.start ===
                    "function"
            ) {

                setTimeout(() => {

                    if (
                        App.State.currentActiveView ===
                            "voice" &&
                        App.State.isContinuousListening &&
                        !this.isSpeaking
                    ) {

                        App.VoiceEngine.start();
                    }

                }, 500);
            }
        };


        /*
         * ==========================================
         * START SPEECH
         * ==========================================
         */

        try {

            window.speechSynthesis.speak(
                utterance
            );

            return true;

        } catch (error) {

            this.isSpeaking =
                false;

            this.currentUtterance =
                null;

            console.error(
                "Speech synthesis start failed:",
                error
            );

            return false;
        }
    },


    /*
     * ==========================================
     * STOP SPEAKING
     * ==========================================
     */

    stop() {

        this.isSpeaking =
            false;

        this.currentUtterance =
            null;


        if (
            "speechSynthesis" in window
        ) {

            try {

                window.speechSynthesis.cancel();

            } catch (error) {

                console.warn(
                    "Speech stop notice:",
                    error
                );
            }
        }
    },


    /*
     * ==========================================
     * SPEAK CURRENT DETECTED JAPANESE
     * ==========================================
     *
     * Used by the Camera screen.
     */

    speakCurrentDetected() {

        const element =
            document.getElementById(
                "detected-japanese"
            );


        if (!element) {

            if (
                App.Toast &&
                typeof App.Toast.show ===
                    "function"
            ) {

                App.Toast.show(
                    "No detected Japanese text."
                );
            }

            return false;
        }


        const japanese =
            element.textContent?.trim() || "";


        if (
            !japanese ||
            japanese.includes("⚠️") ||
            japanese.includes("Speak when") ||
            japanese.includes("Your Japanese")
        ) {

            if (
                App.Toast &&
                typeof App.Toast.show ===
                    "function"
            ) {

                App.Toast.show(
                    "No Japanese speech result available yet."
                );
            }

            return false;
        }


        return this.speakText(
            japanese
        );
    },


    /*
     * ==========================================
     * SPEAK SUGGESTED REPLY
     * ==========================================
     */

    speakReplyOption(jp) {

        if (
            typeof jp !== "string" ||
            !jp.trim()
        ) {
            return false;
        }


        const cleanText =
            jp.trim();


        const spoken =
            this.speakText(
                cleanText
            );


        if (
            spoken &&
            App.Toast &&
            typeof App.Toast.show ===
                "function"
        ) {

            App.Toast.show(
                `Speaking: "${cleanText}"`
            );
        }


        return spoken;
    }
};


/*
 * Initialize after page load.
 */

window.addEventListener(
    "DOMContentLoaded",
    () => {

        App.VoiceTTS.init();

    }
);
