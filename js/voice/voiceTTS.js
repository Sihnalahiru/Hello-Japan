window.App = window.App || {};

App.VoiceTTS = {
    isSpeaking: false,
    currentUtterance: null,
    voiceCache: [],
    resumeVoiceAfterSpeech: false,

    init() {
        if (!("speechSynthesis" in window)) {
            return false;
        }

        this.loadVoices();

        window.speechSynthesis.onvoiceschanged =
            () => this.loadVoices();

        return true;
    },

    loadVoices() {
        if (!("speechSynthesis" in window)) {
            return;
        }

        const voices =
            window.speechSynthesis.getVoices();

        if (voices?.length) {
            this.voiceCache =
                voices.slice();
        }
    },

    findJapaneseVoice() {
        this.loadVoices();

        const exact =
            this.voiceCache.find(
                voice =>
                    String(voice.lang)
                        .toLowerCase()
                        .replace("_", "-") ===
                    "ja-jp"
            );

        if (exact) return exact;

        return (
            this.voiceCache.find(
                voice =>
                    String(voice.lang)
                        .toLowerCase()
                        .replace("_", "-")
                        .startsWith("ja")
            ) || null
        );
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
                "Japanese speech is not supported."
            );
            return false;
        }

        const cleanText =
            text.trim();

        const wasListening =
            App.State?.isContinuousListening === true;

        this.stop(false);

        if (wasListening) {
            this.resumeVoiceAfterSpeech = true;

            App.VoiceEngine?.pauseForSpeech?.();
        } else {
            this.resumeVoiceAfterSpeech = false;
        }

        const utterance =
            new SpeechSynthesisUtterance(
                cleanText
            );

        utterance.lang =
            options.lang || "ja-JP";

        utterance.rate =
            options.rate ?? 0.92;

        utterance.pitch =
            options.pitch ?? 1;

        utterance.volume = 1;

        const japaneseVoice =
            this.findJapaneseVoice();

        if (japaneseVoice) {
            utterance.voice =
                japaneseVoice;
        }

        this.currentUtterance =
            utterance;

        this.isSpeaking = true;

        const finish = () => {
            if (
                this.currentUtterance !==
                utterance
            ) {
                return;
            }

            this.currentUtterance = null;
            this.isSpeaking = false;

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

        utterance.onend = finish;
        utterance.onerror = finish;

        try {
            window.speechSynthesis.speak(
                utterance
            );

            return true;
        } catch (error) {
            finish();
            return false;
        }
    },

    stop(resume = false) {
        try {
            window.speechSynthesis?.cancel?.();
        } catch {}

        this.currentUtterance = null;
        this.isSpeaking = false;

        if (!resume) {
            this.resumeVoiceAfterSpeech = false;
        }
    },

    speakCurrentDetected() {
        const text =
            App.State.currentVoiceJapanese;

        if (text) {
            this.speakText(text);
        }
    },

    speakReplyOption(japanese) {
        if (
            typeof japanese !== "string" ||
            !japanese.trim()
        ) {
            return;
        }

        this.speakText(japanese);

        App.Toast?.show?.(
            `🔊 ${japanese}`
        );
    }
};
