window.App = window.App || {};

App.VoiceTTS = {

    isSpeaking: false,

    currentUtterance: null,

    voiceCache: [],

    voicesReady: false,


    init() {

        if (!("speechSynthesis" in window)) {
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

        this.voicesReady =
            true;
    },


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


        const exact =
            voices.find(voice => {

                const lang =
                    String(voice.lang || "")
                        .toLowerCase()
                        .replace("_", "-");

                return lang === "ja-jp";
            });


        if (exact) {
            return exact;
        }


        return (
            voices.find(voice => {

                const lang =
                    String(voice.lang || "")
                        .toLowerCase()
                        .replace("_", "-");

                return lang.startsWith("ja");
            }) || null
        );
    },


    /*
     * =========================================================
     * SPEAK
     * =========================================================
     */

    speakText(text, options = {}) {

        if (
            typeof text !== "string" ||
            !text.trim()
        ) {

            return false;
        }


        if (!("speechSynthesis" in window)) {

            App.Toast?.show?.(
                "Japanese speech is not supported by this browser."
            );

            return false;
        }


        const cleanText =
            text.trim();


        /*
         * Cancel previous TTS.
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
         * Pause microphone BEFORE speaking.
         */

        if (
            App.VoiceEngine &&
            App.State?.isContinuousListening &&
            typeof App.VoiceEngine.pauseForSpeech ===
                "function"
        ) {

            App.VoiceEngine.pauseForSpeech();
        }


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


        utterance.onstart = () => {

            this.isSpeaking =
                true;


            App.VoiceRenderer?.updateMicVisuals?.(
                false
            );
        };


        utterance.onend = () => {

            this.isSpeaking =
                false;

            this.currentUtterance =
                null;


            /*
             * Resume microphone after AI speech.
             */

            App.VoiceEngine?.resumeAfterSpeech?.();
        };


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
             * Even after TTS error,
             * resume voice conversation.
             */

            App.VoiceEngine?.resumeAfterSpeech?.();
        };


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


            App.VoiceEngine?.resumeAfterSpeech?.();

            return false;
        }
    },


    /*
     * =========================================================
     * MANUAL STOP
     * =========================================================
     */

    stop() {

        this.isSpeaking =
            false;

        this.currentUtterance =
            null;


        if ("speechSynthesis" in window) {

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
     * =========================================================
     * SPEAK CURRENT DETECTED
     * =========================================================
     */

    speakCurrentDetected() {

        const element =
            document.getElementById(
                "detected-japanese"
            );


        if (!element) {

            App.Toast?.show?.(
                "No detected Japanese text."
            );

            return false;
        }


        const japanese =
            element.textContent?.trim() || "";


        if (
            !japanese ||
            japanese.includes("Speak when") ||
            japanese.includes("Your Japanese") ||
            japanese.includes("No Japanese")
        ) {

            App.Toast?.show?.(
                "No Japanese speech result available yet."
            );

            return false;
        }


        return this.speakText(
            japanese
        );
    },


    /*
     * =========================================================
     * SPEAK SUGGESTED REPLY
     * =========================================================
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


        if (spoken) {

            App.Toast?.show?.(
                `Speaking: "${cleanText}"`
            );
        }


        return spoken;
    }
};


window.addEventListener(
    "DOMContentLoaded",
    () => {

        App.VoiceTTS.init();
    }
);
