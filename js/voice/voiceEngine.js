window.App = window.App || {};

App.VoiceEngine = {
    speechRecognitionInstance: null,
    speechRestartTimer: null,

    init() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return null;

        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = App.State.activeSpeakerLang;

        rec.onstart = () => {
            App.State.currentVoiceState = App.State.VoiceState.LISTENING;
            App.VoiceRenderer.updateMicVisuals(true);
        };

        rec.onresult = async (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (!event.results[i].isFinal) continue;
                const transcript = event.results[i][0].transcript.trim();
                if (!transcript) continue;

                const now = Date.now();
                if (transcript === App.State.lastTranscript && (now - App.State.lastTranscriptTime) < 2500) {
                    continue;
                }
                App.State.lastTranscript = transcript;
                App.State.lastTranscriptTime = now;

                App.State.currentVoiceState = App.State.VoiceState.PROCESSING;
                await App.VoiceAI.handleSpokenVoice(transcript);
            }
        };

        rec.onerror = (event) => {
            console.warn("Speech error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                App.State.isContinuousListening = false;
                App.State.currentVoiceState = App.State.VoiceState.IDLE;
                App.VoiceRenderer.updateMicVisuals(false);
                App.Toast.show("Microphone permission denied");
                return;
            }
            this.scheduleRestart(1000);
        };

        rec.onend = () => {
            App.State.currentVoiceState = App.State.VoiceState.IDLE;
            if (App.State.isContinuousListening) {
                this.scheduleRestart(300);
            } else {
                App.VoiceRenderer.updateMicVisuals(false);
            }
        };

        return rec;
    },

    scheduleRestart(delayMs) {
        if (this.speechRestartTimer) clearTimeout(this.speechRestartTimer);
        if (!App.State.isContinuousListening) return;

        this.speechRestartTimer = setTimeout(() => {
            if (App.State.isContinuousListening && App.State.currentVoiceState === App.State.VoiceState.IDLE) {
                try {
                    if (!this.speechRecognitionInstance) this.speechRecognitionInstance = this.init();
                    if (this.speechRecognitionInstance) {
                        App.State.currentVoiceState = App.State.VoiceState.STARTING;
                        this.speechRecognitionInstance.lang = App.State.activeSpeakerLang;
                        this.speechRecognitionInstance.start();
                    }
                } catch (e) {
                    App.State.currentVoiceState = App.State.VoiceState.IDLE;
                }
            }
        }, delayMs);
    },

    start() {
        App.State.isContinuousListening = true;
        if (App.State.currentVoiceState !== App.State.VoiceState.IDLE) return;

        if (!this.speechRecognitionInstance) this.speechRecognitionInstance = this.init();
        if (this.speechRecognitionInstance) {
            try {
                App.State.currentVoiceState = App.State.VoiceState.STARTING;
                this.speechRecognitionInstance.lang = App.State.activeSpeakerLang;
                this.speechRecognitionInstance.start();
            } catch(e) {
                App.State.currentVoiceState = App.State.VoiceState.IDLE;
            }
        } else {
            App.Toast.show("Voice Recognition not supported");
        }
    },

    stop() {
        App.State.isContinuousListening = false;
        App.State.currentVoiceState = App.State.VoiceState.STOPPING;
        if (this.speechRestartTimer) {
            clearTimeout(this.speechRestartTimer);
            this.speechRestartTimer = null;
        }
        if (this.speechRecognitionInstance) {
            try { this.speechRecognitionInstance.stop(); } catch(e) {}
        }
        App.VoiceRenderer.updateMicVisuals(false);
        App.State.currentVoiceState = App.State.VoiceState.IDLE;
    },

    toggleListening() {
        if (App.State.isContinuousListening) {
            this.stop();
            App.Toast.show("Voice Listening Paused");
        } else {
            this.start();
            App.Toast.show("Hands-Free Listening Started...");
        }
    },

    setSpeaker(lang) {
        App.State.activeSpeakerLang = lang;
        const btnJp = document.getElementById('btn-speaker-jp');
        const btnSi = document.getElementById('btn-speaker-si');
        const btnEn = document.getElementById('btn-speaker-en');
        const badge = document.getElementById('detected-speaker-badge');

        [btnJp, btnSi, btnEn].forEach(btn => {
            if(btn) btn.className = "bg-white text-gray-700 text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";
        });

        if (lang === 'ja-JP') {
            if(btnJp) btnJp.className = "bg-deepCard text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";
            if (badge) badge.textContent = "🇯🇵 JAPANESE SPOKEN:";
            App.Toast.show("Listening to Japanese Speech");
        } else if (lang === 'si-LK') {
            if(btnSi) btnSi.className = "bg-deepCard text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";
            if (badge) badge.textContent = "🇱🇰 SINHALA SPOKEN:";
            App.Toast.show("Listening to Sinhala Speech");
        } else {
            if(btnEn) btnEn.className = "bg-deepCard text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";
            if (badge) badge.textContent = "🇬🇧 ENGLISH SPOKEN:";
            App.Toast.show("Listening to English Speech");
        }

        if (App.State.isContinuousListening && this.speechRecognitionInstance) {
            try { this.speechRecognitionInstance.stop(); } catch(e) {}
        }
    },

    setContext(key, element) {
        App.State.activeVoiceContext = key;
        document.querySelectorAll('.ctx-pill').forEach(p => p.className = "ctx-pill bg-white text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm");
        if (element) element.className = "ctx-pill active bg-deepCard text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm";
        App.Toast.show(`Situation: ${key.toUpperCase()}`);
    }
};
