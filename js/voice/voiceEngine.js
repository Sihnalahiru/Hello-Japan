// ============================================================
// Hello Japan AI
// js/voice/voiceEngine.js
// Speech Recognition + Voice Lifecycle Controller
// ============================================================

import { State } from '../state.js';
import { VoiceRenderer } from './voiceRenderer.js';
import { VoiceAI } from './voiceAI.js';


export const VoiceEngine = {

    // ========================================================
    // INTERNAL STATE
    // ========================================================

    recognition: null,

    isSupported: false,

    isListening: false,

    shouldListen: false,

    isProcessing: false,

    isSpeaking: false,

    requestInProgress: false,

    starting: false,

    stopping: false,

    restartTimer: null,

    activeSessionId: 0,

    speechLanguage: 'ja-JP',


    // ========================================================
    // INITIALIZE
    // ========================================================

    init() {

        if (this.recognition) {
            return this.isSupported;
        }

        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {

            this.isSupported = false;

            VoiceRenderer.setListeningState(
                false,
                'Speech recognition is not supported.'
            );

            return false;
        }

        this.isSupported = true;

        const recognition =
            new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        this.speechLanguage =
            this.normalizeLanguage(
                State.activeSpeakerLang || 'ja-JP'
            );

        recognition.lang =
            this.speechLanguage;


        // ====================================================
        // START
        // ====================================================

        recognition.onstart = () => {

            this.starting = false;
            this.stopping = false;
            this.isListening = true;

            State.currentVoiceState =
                State.VoiceState.LISTENING;

            VoiceRenderer.setListeningState(
                true,
                'Listening...'
            );
        };


        // ====================================================
        // RESULT
        // ====================================================

        recognition.onresult = async (event) => {

            const sessionId =
                this.activeSessionId;

            if (!this.shouldListen) {
                return;
            }

            if (sessionId !== this.activeSessionId) {
                return;
            }

            const lastIndex =
                event.results.length - 1;

            const transcript =
                event.results[lastIndex]?.[0]?.transcript?.trim();

            if (!transcript) {
                return;
            }


            this.isListening = false;
            this.shouldListen = false;
            this.isProcessing = true;
            this.requestInProgress = true;

            State.currentVoiceState =
                State.VoiceState.PROCESSING;

            State.currentVoiceTranscript =
                transcript;

            State.lastTranscript =
                transcript;

            State.lastTranscriptTime =
                Date.now();


            VoiceRenderer.setListeningState(
                false,
                'Processing...'
            );


            try {
                recognition.stop();
            } catch {
                // Already stopped.
            }


            try {

                await VoiceAI.handleSpokenVoice(
                    transcript
                );

            } catch (error) {

                console.error(
                    '[VoiceEngine] Voice AI failed:',
                    error
                );

                VoiceRenderer.showError(
                    'Voice AI failed. Please speak again.'
                );

            } finally {

                this.requestInProgress = false;
                this.isProcessing = false;

                if (!this.isSpeaking) {
                    State.currentVoiceState =
                        State.VoiceState.IDLE;
                }
            }
        };


        // ====================================================
        // ERROR
        // ====================================================

        recognition.onerror = (event) => {

            const error =
                String(event?.error || '');

            this.starting = false;
            this.isListening = false;

            if (
                error === 'aborted' &&
                this.stopping
            ) {
                return;
            }

            if (
                error === 'not-allowed' ||
                error === 'service-not-allowed'
            ) {

                this.shouldListen = false;

                VoiceRenderer.setListeningState(
                    false,
                    'Microphone permission required.'
                );

                return;
            }

            if (error === 'no-speech') {

                this.shouldListen = false;

                VoiceRenderer.setListeningState(
                    false,
                    'No speech detected. Tap Mic again.'
                );

                return;
            }

            if (error === 'audio-capture') {

                this.shouldListen = false;

                VoiceRenderer.setListeningState(
                    false,
                    'Microphone is unavailable.'
                );

                return;
            }

            if (
                this.isProcessing ||
                this.requestInProgress ||
                this.isSpeaking
            ) {
                return;
            }

            console.warn(
                '[VoiceEngine] Recognition error:',
                error
            );

            this.shouldListen = false;

            VoiceRenderer.setListeningState(
                false,
                'Voice recognition error. Tap Mic again.'
            );
        };


        // ====================================================
        // END
        // ====================================================

        recognition.onend = () => {

            this.isListening = false;
            this.starting = false;

            if (
                this.stopping ||
                !this.shouldListen ||
                this.isProcessing ||
                this.requestInProgress ||
                this.isSpeaking
            ) {
                this.stopping = false;
                return;
            }

            this.scheduleRestart();
        };


        this.recognition = recognition;

        return true;
    },


    // ========================================================
    // START LISTENING
    // ========================================================

    start() {

        if (
            State.currentActiveView &&
            State.currentActiveView !== 'voice'
        ) {
            return false;
        }

        if (!this.init()) {
            return false;
        }

        if (
            this.isListening ||
            this.starting ||
            this.isProcessing ||
            this.requestInProgress ||
            this.isSpeaking
        ) {
            return false;
        }

        this.clearRestartTimer();

        this.shouldListen = true;
        this.stopping = false;
        this.starting = true;

        this.activeSessionId += 1;

        State.currentVoiceState =
            State.VoiceState.STARTING;

        try {

            this.recognition.lang =
                this.speechLanguage;

            this.recognition.start();

            return true;

        } catch (error) {

            this.starting = false;
            this.shouldListen = false;

            console.warn(
                '[VoiceEngine] Start failed:',
                error
            );

            VoiceRenderer.setListeningState(
                false,
                'Tap Mic to try again.'
            );

            return false;
        }
    },


    // ========================================================
    // STOP LISTENING
    // ========================================================

    stop() {

        this.shouldListen = false;
        this.starting = false;
        this.stopping = true;

        this.activeSessionId += 1;

        this.clearRestartTimer();

        if (this.recognition) {

            try {
                this.recognition.stop();
            } catch {
                // Already stopped.
            }
        }

        this.isListening = false;

        if (this.isSpeaking) {

            const tts =
                window.App?.VoiceTTS;

            if (
                tts &&
                typeof tts.stop === 'function'
            ) {
                tts.stop();
            }

            this.isSpeaking = false;
        }

        this.isProcessing = false;
        this.requestInProgress = false;

        State.currentVoiceState =
            State.VoiceState.IDLE;

        VoiceRenderer.setListeningState(
            false,
            'Tap Mic to Speak'
        );
    },


    // ========================================================
    // TOGGLE
    // ========================================================

    toggleListening() {

        if (this.isListening || this.starting) {
            this.stop();
            return false;
        }

        if (this.isProcessing || this.requestInProgress) {
            return false;
        }

        if (this.isSpeaking) {
            return false;
        }

        return this.start();
    },


    // ========================================================
    // SPEAKER LANGUAGE
    // ========================================================

    setSpeaker(language) {

        const normalized =
            this.normalizeLanguage(language);

        this.stop();

        this.speechLanguage =
            normalized;

        State.activeSpeakerLang =
            normalized;

        this.init();

        if (this.recognition) {
            this.recognition.lang =
                normalized;
        }

        const tts =
            window.App?.VoiceTTS;

        if (
            tts &&
            typeof tts.setLanguage === 'function'
        ) {
            tts.setLanguage(normalized);
        }

        VoiceRenderer.updateSpeakerUI(
            normalized
        );
    },


    // ========================================================
    // CONTEXT
    // ========================================================

    setContext(context) {

        const validContexts = [
            'daily',
            'workplace',
            'restaurant',
            'konbini'
        ];

        const normalized =
            validContexts.includes(context)
                ? context
                : 'daily';

        State.activeVoiceContext =
            normalized;

        VoiceRenderer.updateContextUI(
            normalized
        );
    },


    // ========================================================
    // TTS PROTECTION
    // ========================================================

    pauseForSpeech() {

        this.isSpeaking = true;

        this.shouldListen = false;

        this.clearRestartTimer();

        this.activeSessionId += 1;

        if (this.recognition) {

            try {
                this.recognition.stop();
            } catch {
                // Already stopped.
            }
        }

        this.isListening = false;

        State.currentVoiceState =
            State.VoiceState.IDLE;
    },


    resumeAfterSpeech() {

        this.isSpeaking = false;

        this.shouldListen = false;

        this.isListening = false;

        this.starting = false;

        this.stopping = false;

        State.currentVoiceState =
            State.VoiceState.IDLE;

        VoiceRenderer.setListeningState(
            false,
            'Tap Mic to Speak'
        );
    },


    speakWithProtection(text, options = {}) {

        const cleanText =
            typeof text === 'string'
                ? text.trim()
                : '';

        if (!cleanText) {
            return false;
        }

        const tts =
            window.App?.VoiceTTS;

        if (
            !tts ||
            typeof tts.speakText !== 'function'
        ) {
            this.notifySpeechFinished(
                'tts-unavailable'
            );

            return false;
        }

        this.pauseForSpeech();

        const success =
            tts.speakText(
                cleanText,
                {
                    ...options,
                    lang:
                        options.lang ||
                        'ja-JP'
                }
            );

        if (!success) {
            this.notifySpeechFinished(
                'tts-failed'
            );
        }

        return success;
    },


    notifySpeechFinished(reason = 'finished') {

        if (!this.isSpeaking) {
            return;
        }

        console.log(
            `[VoiceEngine] Speech finished: ${reason}`
        );

        this.resumeAfterSpeech();
    },


    // ========================================================
    // RESTART CONTROL
    // ========================================================

    scheduleRestart() {

        this.clearRestartTimer();

        if (
            !this.shouldListen ||
            this.isProcessing ||
            this.requestInProgress ||
            this.isSpeaking ||
            this.starting ||
            this.stopping
        ) {
            return;
        }

        this.restartTimer =
            window.setTimeout(
                () => {

                    this.restartTimer = null;

                    if (
                        this.shouldListen &&
                        !this.isProcessing &&
                        !this.requestInProgress &&
                        !this.isSpeaking
                    ) {
                        this.start();
                    }
                },
                250
            );
    },


    clearRestartTimer() {

        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
    },


    // ========================================================
    // LANGUAGE NORMALIZATION
    // ========================================================

    normalizeLanguage(language) {

        const value =
            String(
                language || 'ja-JP'
            )
                .trim()
                .replace('_', '-')
                .toLowerCase();

        if (value.startsWith('ja')) {
            return 'ja-JP';
        }

        if (
            value.startsWith('si') ||
            value.startsWith('sin')
        ) {
            return 'si-LK';
        }

        if (value.startsWith('en')) {
            return 'en-US';
        }

        return 'ja-JP';
    }
};
