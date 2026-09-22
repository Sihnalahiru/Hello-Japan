// ============================================================
// Hello Japan AI
// js/voice/voiceEngine.js
// Speech Recognition Engine
// ============================================================

import { State } from '../state.js';
import { VoiceRenderer } from './voiceRenderer.js';
import { VoiceAI } from './voiceAI.js';


export const VoiceEngine = {

    // ========================================================
    // STATE
    // ========================================================

    recognition: null,

    isSupported: false,

    isListening: false,

    shouldListen: false,

    isProcessing: false,

    isSpeaking: false,

    restartTimer: null,

    requestInProgress: false,

    starting: false,

    stopping: false,

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


        // ----------------------------------------------------
        // Configuration
        // ----------------------------------------------------

        // We deliberately use non-continuous recognition.
        //
        // One user utterance -> one AI request.
        //
        // This dramatically reduces:
        // - duplicate results
        // - restart races
        // - TTS feedback loops
        // - browser recognition crashes

        recognition.continuous = false;

        recognition.interimResults = false;

        recognition.maxAlternatives = 1;


        this.speechLanguage =
            this.normalizeLanguage(
                State.activeSpeakerLang ||
                'ja-JP'
            );


        recognition.lang =
            this.speechLanguage;


        // ----------------------------------------------------
        // START
        // ----------------------------------------------------

        recognition.onstart = () => {

            this.starting = false;

            this.stopping = false;

            this.isListening = true;


            VoiceRenderer.setListeningState(
                true,
                'Listening...'
            );
        };


        // ----------------------------------------------------
        // RESULT
        // ----------------------------------------------------

        recognition.onresult = async (event) => {

            // Ignore stale sessions.
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
                event.results[
                    lastIndex
                ]?.[0]?.transcript?.trim();


            if (!transcript) {
                return;
            }


            // ------------------------------------------------
            // Stop listening immediately.
            // ------------------------------------------------

            this.isListening = false;

            this.isProcessing = true;


            // Prevent onend from restarting recognition
            // while Gemini is processing this request.
            this.shouldListen = false;


            VoiceRenderer.setListeningState(
                false,
                'Processing...'
            );


            // Make sure browser recognition is actually stopped.
            try {
                recognition.stop();
            } catch {
                // Already stopped.
            }


            // ------------------------------------------------
            // AI request
            // ------------------------------------------------

            try {

                this.requestInProgress = true;

                await VoiceAI.handleSpokenVoice(
                    transcript
                );

            } finally {

                this.requestInProgress = false;

                this.isProcessing = false;
            }
        };


        // ----------------------------------------------------
        // ERROR
        // ----------------------------------------------------

        recognition.onerror = (event) => {

            this.starting = false;

            this.isListening = false;

            this.stopping = false;


            const error =
                event?.error || 'unknown';


            console.warn(
                '[VoiceEngine] Recognition error:',
                error
            );


            // ----------------------------------------------
            // Normal browser conditions
            // ----------------------------------------------

            if (
                error === 'aborted'
            ) {
                return;
            }


            if (
                error === 'no-speech'
            ) {

                VoiceRenderer.setListeningState(
                    false,
                    'No speech detected.'
                );

                return;
            }


            if (
                error === 'audio-capture'
            ) {

                VoiceRenderer.setListeningState(
                    false,
                    'Microphone unavailable.'
                );

                return;
            }


            if (
                error === 'not-allowed' ||
                error === 'service-not-allowed'
            ) {

                this.shouldListen = false;


                VoiceRenderer.setListeningState(
                    false,
                    'Microphone permission denied.'
                );

                return;
            }


            // ----------------------------------------------
            // Unknown error
            // ----------------------------------------------

            VoiceRenderer.setListeningState(
                false,
                'Mic error. Please try again.'
            );
        };


        // ----------------------------------------------------
        // END
        // ----------------------------------------------------

        recognition.onend = () => {

            this.starting = false;

            this.isListening = false;

            this.stopping = false;


            // ----------------------------------------------
            // NEVER restart while:
            // - AI is processing
            // - TTS is speaking
            // - user intentionally stopped
            // ----------------------------------------------

            if (
                this.isProcessing ||
                this.requestInProgress ||
                this.isSpeaking ||
                !this.shouldListen
            ) {

                if (!this.isProcessing) {

                    VoiceRenderer.setListeningState(
                        false,
                        'Tap microphone to speak.'
                    );
                }

                return;
            }


            // Normally this branch should rarely be needed
            // because recognition is non-continuous.
            this.scheduleRestart();
        };


        // ----------------------------------------------------
        // Save recognition
        // ----------------------------------------------------

        this.recognition =
            recognition;


        return true;
    },


    // ========================================================
    // START
    // ========================================================

    start() {

        if (!this.init()) {
            return false;
        }


        // Do not start while:
        // AI is processing or TTS is speaking.
        if (
            this.isProcessing ||
            this.requestInProgress ||
            this.isSpeaking
        ) {

            return false;
        }


        // Already listening.
        if (
            this.isListening ||
            this.starting
        ) {

            return true;
        }


        this.clearRestartTimer();


        this.shouldListen = true;

        this.stopping = false;

        this.activeSessionId++;


        this.recognition.lang =
            this.speechLanguage;


        try {

            this.starting = true;

            this.recognition.start();

            return true;

        } catch (error) {

            this.starting = false;


            // Browser throws InvalidStateError if
            // recognition is already starting/running.
            console.warn(
                '[VoiceEngine] Start failed:',
                error
            );


            return false;
        }
    },


    // ========================================================
    // STOP
    // ========================================================

    stop() {

        this.shouldListen = false;

        this.starting = false;

        this.stopping = true;

        this.activeSessionId++;


        this.clearRestartTimer();


        if (this.recognition) {

            try {
                this.recognition.stop();
            } catch {
                // Already stopped.
            }
        }


        this.isListening = false;


        VoiceRenderer.setListeningState(
            false,
            'Tap microphone to speak.'
        );
    },


    // ========================================================
    // TOGGLE
    // ========================================================

    toggleListening() {

        if (
            this.isListening ||
            this.starting ||
            this.shouldListen
        ) {

            this.stop();

            return false;
        }


        return this.start();
    },


    // ========================================================
    // SET SPEAKER / RECOGNITION LANGUAGE
    // ========================================================

    setSpeaker(lang) {

        const normalized =
            this.normalizeLanguage(
                lang
            );


        // Stop any active recognition first.
        this.stop();


        this.speechLanguage =
            normalized;


        State.activeSpeakerLang =
            normalized;


        if (this.recognition) {

            this.recognition.lang =
                normalized;
        }


        // Keep TTS language synchronized.
        if (
            window.App?.VoiceTTS &&
            typeof window.App.VoiceTTS.setLanguage ===
                'function'
        ) {

            window.App.VoiceTTS.setLanguage(
                normalized
            );
        }


        VoiceRenderer.updateSpeakerUI(
            normalized
        );
    },


    // ========================================================
    // CONTEXT
    // ========================================================

    setContext(context) {

        if (!context) {
            return;
        }


        State.activeVoiceContext =
            context;


        VoiceRenderer.updateContextUI(
            context
        );
    },


    // ========================================================
    // TTS PROTECTION
    // ========================================================

    pauseForSpeech() {

        // User's microphone must not remain active while
        // AI voice is speaking.

        this.isSpeaking = true;

        this.shouldListen = false;

        this.clearRestartTimer();


        if (this.recognition) {

            try {
                this.recognition.stop();
            } catch {
                // Already stopped.
            }
        }


        this.isListening = false;
    },


    // ========================================================
    // RESUME AFTER TTS
    // ========================================================

    resumeAfterSpeech() {

        this.isSpeaking = false;


        // IMPORTANT:
        //
        // We do NOT automatically restart the microphone.
        //
        // User must explicitly tap the microphone again.
        //
        // This avoids:
        //
        // AI speaks
        // ↓
        // microphone starts
        // ↓
        // microphone hears AI
        // ↓
        // Gemini receives AI voice
        // ↓
        // AI speaks again
        // ↓
        // infinite loop

        this.shouldListen = false;


        VoiceRenderer.setListeningState(
            false,
            'Tap microphone to speak.'
        );
    },


    // ========================================================
    // RUN TTS SAFELY
    // ========================================================

    async speakWithProtection(
        text,
        options = {}
    ) {

        if (
            !text ||
            typeof text !== 'string'
        ) {
            return false;
        }


        const tts =
            window.App?.VoiceTTS;


        if (
            !tts ||
            typeof tts.speakText !== 'function'
        ) {

            return false;
        }


        this.pauseForSpeech();


        try {

            const result =
                tts.speakText(
                    text,
                    options
                );


            return result;

        } finally {

            // Do not immediately resume recognition.
            //
            // VoiceTTS handles its own speech lifecycle.
            //
            // The user will tap the microphone again.
        }
    },


    // ========================================================
    // TTS FINISHED
    // ========================================================

    notifySpeechFinished() {

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
            this.isSpeaking
        ) {
            return;
        }


        this.restartTimer =
            window.setTimeout(
                () => {

                    this.restartTimer =
                        null;


                    if (
                        !this.shouldListen ||
                        this.isProcessing ||
                        this.requestInProgress ||
                        this.isSpeaking
                    ) {
                        return;
                    }


                    this.start();

                },
                250
            );
    },


    // ========================================================
    // CLEAR RESTART TIMER
    // ========================================================

    clearRestartTimer() {

        if (this.restartTimer) {

            window.clearTimeout(
                this.restartTimer
            );

            this.restartTimer =
                null;
        }
    },


    // ========================================================
    // LANGUAGE NORMALIZATION
    // ========================================================

    normalizeLanguage(language) {

        const value =
            String(
                language ||
                'ja-JP'
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


// ============================================================
// OPTIONAL TTS EVENT BRIDGE
// ============================================================
//
// VoiceTTS uses the browser speechSynthesis lifecycle.
// We listen globally here so the engine knows when AI
// speech has finished.
//
// This is intentionally defensive.
// It does not assume VoiceTTS implementation details.
//

if (
    'speechSynthesis' in window
) {

    window.addEventListener(
        'voiceschanged',
        () => {

            // Voices becoming available is not speech ending.
            // Nothing to do here.
        }
    );
}
