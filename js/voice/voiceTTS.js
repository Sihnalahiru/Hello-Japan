import { State } from '../state.js';
import { Toast } from '../ui/toast.js';

export const VoiceTTS = {
    isSpeaking: false,
    currentUtterance: null,
    voiceCache: [],

    init() {
        if (!("speechSynthesis" in window)) return false;
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        return true;
    },

    loadVoices() {
        if (!("speechSynthesis" in window)) return;
        const voices = window.speechSynthesis.getVoices();
        if (voices?.length) this.voiceCache = voices.slice();
    },

    findJapaneseVoice() {
        this.loadVoices();
        return this.voiceCache.find(v => String(v.lang).toLowerCase().replace("_", "-") === "ja-jp") ||
               this.voiceCache.find(v => String(v.lang).toLowerCase().replace("_", "-").startsWith("ja")) || null;
    },

    speakText(text, options = {}) {
        if (typeof text !== "string" || !text.trim()) return false;
        if (!("speechSynthesis" in window)) {
            Toast.show("Japanese speech is not supported.");
            return false;
        }

        this.stop();
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.lang = options.lang || "ja-JP";
        utterance.rate = options.rate ?? 0.92;
        utterance.pitch = options.pitch ?? 1;

        const jaVoice = this.findJapaneseVoice();
        if (jaVoice) utterance.voice = jaVoice;

        this.currentUtterance = utterance;
        this.isSpeaking = true;

        const finish = () => {
            this.currentUtterance = null;
            this.isSpeaking = false;
        };

        utterance.onend = finish;
        utterance.onerror = finish;

        try {
            window.speechSynthesis.speak(utterance);
            return true;
        } catch {
            finish();
            return false;
        }
    },

    stop() {
        try { window.speechSynthesis?.cancel?.(); } catch {}
        this.currentUtterance = null;
        this.isSpeaking = false;
    },

    speakCurrentDetected() {
        if (State.currentVoiceJapanese) this.speakText(State.currentVoiceJapanese);
    },

    speakReplyOption(japanese) {
        if (typeof japanese === "string" && japanese.trim()) {
            this.speakText(japanese);
            Toast.show(`🔊 ${japanese}`);
        }
    }
};
