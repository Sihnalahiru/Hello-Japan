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
        // RECOGNITION START
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
        // RECOGNITION RESULT
        // ====================================================

        recognition.onresult = async (event) => {

            const sessionId =
                this.activeSessionId;

            // Ignore results after cancellation.
            if (!this.shouldListen) {
                return;
            }

            // Ignore results belonging to an old session.
            if (
                sessionId !==
                this.activeSessionId
            ) {
                return;
            }

            const lastIndex =
                event.results.length - 1;

            const transcript =
                event.results[lastIndex]?.[0]?.transcript?.trim();

            if (!transcript) {
                return;
            }

            // Recognition has produced a usable transcript.
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

            // Stop recognition immediately.
            try {
                recognition.stop();
            } catch {
                // Recognition may already have stopped.
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

                // Only display the error if this request
                // has not been invalidated.
                if (
                    sessionId ===
                    this.activeSessionId
                ) {

                    VoiceRenderer.showError(
                        'Voice AI failed. Please speak again.'
                    );
                }

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
        // RECOGNITION ERROR
        // ====================================================

        recognition.onerror = (event) => {

            const error =
                String(event?.error || '');

            this.starting = false;
            this.isListening = false;

            // Expected error while manually stopping.
            if (
                error === 'aborted' &&
                this.stopping
            ) {
                return;
            }

            // Permission problem.
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

            // No speech.
            if (error === 'no-speech') {

                this.shouldListen = false;

                VoiceRenderer.setListeningState(
                    false,
                    'No speech detected. Tap Mic again.'
                );

                return;
            }

            // Microphone unavailable.
            if (error === 'audio-capture') {

                this.shouldListen = false;

                VoiceRenderer.setListeningState(
                    false,
                    'Microphone is unavailable.'
                );

                return;
            }

            // Do not interfere with active AI/TTS lifecycle.
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
        // RECOGNITION END
        // ====================================================

        recognition.onend = () => {

            this.isListening = false;
            this.starting = false;

            // If the engine is intentionally stopping,
            // do not restart recognition.
            if (this.stopping) {

                this.stopping = false;

                return;
            }

            // Never restart while processing, speaking,
            // or when the user has cancelled listening.
            if (
                !this.shouldListen ||
                this.isProcessing ||
                this.requestInProgress ||
                this.isSpeaking
            ) {
                return;
            }

            this.scheduleRestart();
        };

        this.recognition =
            recognition;

        return true;
    },

    // ========================================================
    // START LISTENING
    // ========================================================

    start() {

        // Voice recognition is only valid on the voice view.
        if (
            State.currentActiveView &&
            State.currentActiveView !== 'voice'
        ) {
            return false;
        }

        if (!this.init()) {
            return false;
        }

        // Prevent duplicate starts.
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

        // New recognition session.
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

            State.currentVoiceState =
                State.VoiceState.IDLE;

            return false;
        }
    },

    // ========================================================
    // STOP LISTENING / CANCEL CURRENT VOICE LIFECYCLE
    // ========================================================

    stop() {

        // ----------------------------------------------------
        // IMPORTANT:
        //
        // Invalidate BOTH:
        // 1. recognition session
        // 2. pending VoiceAI request
        //
        // This prevents an old Gemini response from starting
        // TTS after the user has already stopped.
        // ----------------------------------------------------

        this.shouldListen = false;

        this.starting = false;
        this.stopping = true;

        this.activeSessionId += 1;

        if (
            typeof State.voiceRequestId === 'number'
        ) {
            State.voiceRequestId += 1;
        }

        this.clearRestartTimer();

        // Stop speech recognition.
        if (this.recognition) {

            try {
                this.recognition.stop();
            } catch {
                // Recognition may already be stopped.
            }
        }

        this.isListening = false;

        // Stop TTS if active.
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

        // Cancel processing flags.
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
    // TOGGLE LISTENING
    // ========================================================

    toggleListening() {

        if (
            this.isListening ||
            this.starting
        ) {

            this.stop();

            return false;
        }

        // Do not allow another recognition session
        // while AI is processing.
        if (
            this.isProcessing ||
            this.requestInProgress
        ) {
            return false;
        }

        // Do not interrupt protected TTS through the mic.
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
            this.normalizeLanguage(
                language
            );

        // Stop current recognition/AI/TTS lifecycle.
        this.stop();

        this.speechLanguage =
            normalized;

        State.activeSpeakerLang =
            normalized;

        // Recognition object is reusable.
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

            tts.setLanguage(
                normalized
            );
        }

        VoiceRenderer.updateSpeakerUI(
            normalized
        );
    },

    // ========================================================
    // VOICE CONTEXT
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

        // Invalidate current recognition session.
        this.activeSessionId += 1;

        if (this.recognition) {

            try {
                this.recognition.stop();
            } catch {
                // Recognition may already be stopped.
            }
        }

        this.isListening = false;
        this.starting = false;

        State.currentVoiceState =
            State.VoiceState.IDLE;
    },

    // ========================================================
    // RESUME AFTER TTS
    // ========================================================

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

    // ========================================================
    // PROTECTED TTS ENTRY POINT
    // ========================================================

    speakWithProtection(
        text,
        options = {}
    ) {

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

        // Pause recognition before speech.
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

    // ========================================================
    // TTS FINISHED CALLBACK
    // ========================================================

    notifySpeechFinished(
        reason = 'finished'
    ) {

        if (!this.isSpeaking) {
            return;
        }

        console.log(
            `[VoiceEngine] Speech finished: ${reason}`
        );

        this.resumeAfterSpeech();
    },

    // ========================================================
    // AUTOMATIC RESTART
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
                        !this.isSpeaking &&
                        !this.starting &&
                        !this.stopping
                    ) {
                        this.start();
                    }

                },
                250
            );
    },

    // ========================================================
    // CLEAR RESTART TIMER
    // ========================================================

    clearRestartTimer() {

        if (this.restartTimer) {

            clearTimeout(
                this.restartTimer
            );

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

        if (
            value.startsWith('ja')
        ) {
            return 'ja-JP';
        }

        if (
            value.startsWith('si') ||
            value.startsWith('sin')
        ) {
            return 'si-LK';
        }

        if (
            value.startsWith('en')
        ) {
            return 'en-US';
        }

        return 'ja-JP';
    }
};
