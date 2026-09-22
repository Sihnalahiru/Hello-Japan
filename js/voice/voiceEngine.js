import { State } from '../state.js';
import { VoiceRenderer } from './voiceRenderer.js';
import { VoiceAI } from './voiceAI.js';

export const VoiceEngine = {
    recognition: null,
    isSupported: false,
    isListening: false,
    shouldListen: false,

    init() {
        if (this.recognition) return this.isSupported;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.isSupported = false;
            VoiceRenderer.setListeningState(false, "Speech recognition not supported.");
            return false;
        }

        this.isSupported = true;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = State.activeSpeakerLang || "ja-JP";

        recognition.onstart = () => {
            this.isListening = true;
            VoiceRenderer.setListeningState(true, "Listening...");
        };

        recognition.onresult = async (event) => {
            if (!this.shouldListen) return;
            const lastIndex = event.results.length - 1;
            const transcript = event.results[lastIndex]?.[0]?.transcript?.trim();
            if (!transcript) return;

            VoiceRenderer.setListeningState(false, "Processing...");
            await VoiceAI.handleSpokenVoice(transcript);
        };

        recognition.onerror = () => {
            this.isListening = false;
            VoiceRenderer.setListeningState(false, "Mic error.");
        };

        recognition.onend = () => {
            this.isListening = false;
            if (this.shouldListen) {
                try { recognition.start(); } catch {}
            } else {
                VoiceRenderer.setListeningState(false, "Tap microphone to speak.");
            }
        };

        this.recognition = recognition;
        return true;
    },

    start() {
        if (!this.init()) return false;
        this.shouldListen = true;
        try {
            this.recognition.start();
            return true;
        } catch {
            return false;
        }
    },

    stop() {
        this.shouldListen = false;
        if (this.recognition) {
            try { this.recognition.stop(); } catch {}
        }
        this.isListening = false;
        VoiceRenderer.setListeningState(false, "Tap microphone to speak.");
    },

    toggleListening() {
        if (this.isListening || this.shouldListen) {
            this.stop();
            return false;
        }
        return this.start();
    },

    setSpeaker(lang) {
        this.stop();
        State.activeSpeakerLang = lang;
        if (this.recognition) this.recognition.lang = lang;
        VoiceRenderer.updateSpeakerUI(lang);
    },

    setContext(context) {
        if (!context) return;
        State.activeVoiceContext = context;
        VoiceRenderer.updateContextUI(context);
    }
};
