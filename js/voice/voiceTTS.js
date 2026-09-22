// ============================================================
// Hello Japan AI
// js/voice/voiceTTS.js
// Text-to-Speech Engine
// ============================================================
//
// RESPONSIBILITY
//
// Text
//   ↓
// VoiceTTS
//   ↓
// Browser SpeechSynthesis
//
// VoiceEngine owns microphone/TTS protection.
// VoiceTTS reports speech completion back to VoiceEngine.
//
// IMPORTANT:
// VoiceTTS does NOT import VoiceEngine directly.
//
// This avoids:
//
// VoiceEngine
//    ↓
// VoiceTTS
//    ↓
// VoiceEngine
//
// Instead VoiceEngine is accessed through window.App.
// ============================================================

import { Toast } from '../ui/toast.js';


// ============================================================
// VOICE TTS
// ============================================================

export const VoiceTTS = {

    // ========================================================
    // STATE
    // ========================================================

    isSupported: false,

    isSpeaking: false,

    currentUtterance: null,

    voiceCache: [],

    activeLanguage: 'ja-JP',

    // Unique speech lifecycle ID.
    //
    // Every new speech request receives a new ID.
    // Old utterance callbacks cannot modify the state of a
    // newer utterance.
    speechRequestId: 0,


    // ========================================================
    // INITIALIZE
    // ========================================================

    init() {

        this.isSupported =
            'speechSynthesis' in window &&
            typeof window.SpeechSynthesisUtterance !== 'undefined';


        if (!this.isSupported) {

            console.warn(
                '[VoiceTTS] Speech synthesis is not supported.'
            );

            return false;
        }


        this.loadVoices();


        // Chrome / Edge may populate voices asynchronously.
        window.speechSynthesis.onvoiceschanged =
            () => {

                this.loadVoices();
            };


        return true;
    },


    // ========================================================
    // LOAD VOICES
    // ========================================================

    loadVoices() {

        if (!this.isSupported) {
            return [];
        }


        try {

            const voices =
                window.speechSynthesis.getVoices();


            if (Array.isArray(voices)) {

                this.voiceCache =
                    voices.slice();
            }


            return this.voiceCache;

        } catch (error) {

            console.warn(
                '[VoiceTTS] Failed to load voices:',
                error
            );

            return this.voiceCache;
        }
    },


    // ========================================================
    // NORMALIZE LANGUAGE
    // ========================================================

    normalizeLanguage(language) {

        const value =
            String(
                language ||
                this.activeLanguage ||
                'ja-JP'
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


        return language ||
            'ja-JP';
    },


    // ========================================================
    // FIND VOICE
    // ========================================================

    findVoice(
        language = 'ja-JP'
    ) {

        this.loadVoices();


        const target =
            this.normalizeLanguage(
                language
            )
                .toLowerCase()
                .replace('_', '-');


        if (
            !this.voiceCache.length
        ) {
            return null;
        }


        // ----------------------------------------------------
        // Exact language match
        // ----------------------------------------------------

        let voice =
            this.voiceCache.find(
                item => {

                    const lang =
                        String(
                            item.lang || ''
                        )
                            .toLowerCase()
                            .replace('_', '-');


                    return lang === target;
                }
            );


        if (voice) {
            return voice;
        }


        // ----------------------------------------------------
        // Base language match
        // ----------------------------------------------------

        const base =
            target.split('-')[0];


        voice =
            this.voiceCache.find(
                item => {

                    const lang =
                        String(
                            item.lang || ''
                        )
                            .toLowerCase()
                            .replace('_', '-');


                    return (
                        lang === base ||
                        lang.startsWith(
                            `${base}-`
                        )
                    );
                }
            );


        if (voice) {
            return voice;
        }


        // ----------------------------------------------------
        // Japanese fallback
        // ----------------------------------------------------

        if (
            target === 'ja-jp'
        ) {

            voice =
                this.voiceCache.find(
                    item =>
                        String(
                            item.name || ''
                        )
                            .toLowerCase()
                            .includes('japanese')
                );
        }


        // ----------------------------------------------------
        // English fallback
        // ----------------------------------------------------

        if (
            !voice &&
            target === 'en-us'
        ) {

            voice =
                this.voiceCache.find(
                    item =>
                        String(
                            item.name || ''
                        )
                            .toLowerCase()
                            .includes('english')
                );
        }


        // ----------------------------------------------------
        // Sinhala fallback
        // ----------------------------------------------------

        if (
            !voice &&
            target === 'si-lk'
        ) {

            voice =
                this.voiceCache.find(
                    item => {

                        const name =
                            String(
                                item.name || ''
                            )
                                .toLowerCase();


                        const lang =
                            String(
                                item.lang || ''
                            )
                                .toLowerCase();


                        return (
                            lang.includes('si') ||
                            name.includes('sinhala') ||
                            name.includes('sinhalese')
                        );
                    }
                );
        }


        return voice || null;
    },


    // ========================================================
    // BACKWARD-COMPATIBLE JAPANESE HELPER
    // ========================================================

    findJapaneseVoice() {

        return this.findVoice(
            'ja-JP'
        );
    },


    // ========================================================
    // SET ACTIVE LANGUAGE
    // ========================================================

    setLanguage(
        language
    ) {

        const normalized =
            this.normalizeLanguage(
                language
            );


        this.activeLanguage =
            normalized;


        return normalized;
    },


    // ========================================================
    // SPEAK TEXT
    // ========================================================

    speakText(
        text,
        options = {}
    ) {

        // ----------------------------------------------------
        // Validate text
        // ----------------------------------------------------

        if (
            typeof text !== 'string' ||
            !text.trim()
        ) {
            return false;
        }


        // ----------------------------------------------------
        // Initialize if necessary
        // ----------------------------------------------------

        if (
            !this.isSupported
        ) {

            this.init();


            if (
                !this.isSupported
            ) {

                Toast.show(
                    'Speech synthesis is not supported on this device.'
                );

                return false;
            }
        }


        const cleanText =
            text.trim();


        // ----------------------------------------------------
        // Language
        // ----------------------------------------------------

        const language =
            this.normalizeLanguage(
                options.lang ||
                options.language ||
                this.activeLanguage
            );


        this.activeLanguage =
            language;


        // ----------------------------------------------------
        // Cancel previous speech
        //
        // IMPORTANT:
        //
        // Increment speechRequestId BEFORE cancelling.
        //
        // Therefore an old oncancel/onend callback cannot
        // terminate the new speech lifecycle.
        // ----------------------------------------------------

        const requestId =
            ++this.speechRequestId;


        this.cancelCurrentUtterance();


        // ----------------------------------------------------
        // Create utterance
        // ----------------------------------------------------

        const utterance =
            new SpeechSynthesisUtterance(
                cleanText
            );


        utterance.lang =
            language;


        utterance.rate =
            typeof options.rate === 'number'
                ? options.rate
                : this.getDefaultRate(
                    language
                );


        utterance.pitch =
            typeof options.pitch === 'number'
                ? options.pitch
                : 1;


        utterance.volume =
            typeof options.volume === 'number'
                ? Math.max(
                    0,
                    Math.min(
                        1,
                        options.volume
                    )
                )
                : 1;


        // ----------------------------------------------------
        // Select matching voice
        // ----------------------------------------------------

        const voice =
            options.voice ||
            this.findVoice(
                language
            );


        if (voice) {

            utterance.voice =
                voice;
        }


        // ----------------------------------------------------
        // Register active utterance
        // ----------------------------------------------------

        this.currentUtterance =
            utterance;

        this.isSpeaking =
            true;


        // ----------------------------------------------------
        // Finalize speech lifecycle
        // ----------------------------------------------------

        const finish =
            (
                reason = 'finished'
            ) => {

                // --------------------------------------------
                // Ignore stale utterance callbacks.
                //
                // A previous utterance must never reset the
                // state belonging to a newer utterance.
                // --------------------------------------------

                if (
                    requestId !==
                    this.speechRequestId
                ) {
                    return;
                }


                if (
                    this.currentUtterance !==
                    utterance
                ) {
                    return;
                }


                this.currentUtterance =
                    null;

                this.isSpeaking =
                    false;


                // --------------------------------------------
                // Tell VoiceEngine that protected TTS has
                // completed.
                //
                // Do not import VoiceEngine here.
                // --------------------------------------------

                this.notifyEngineSpeechFinished(
                    reason
                );
            };


        // ====================================================
        // BROWSER EVENTS
        // ====================================================

        utterance.onstart =
            () => {

                if (
                    requestId !==
                    this.speechRequestId
                ) {
                    return;
                }


                this.isSpeaking =
                    true;
            };


        utterance.onend =
            () => {

                finish(
                    'end'
                );
            };


        utterance.onerror =
            event => {

                console.warn(
                    '[VoiceTTS] Speech error:',
                    event?.error ||
                    event
                );


                finish(
                    'error'
                );
            };


        utterance.oncancel =
            () => {

                finish(
                    'cancel'
                );
            };


        // ====================================================
        // START SPEECH
        // ====================================================

        try {

            window.speechSynthesis.speak(
                utterance
            );


            return true;

        } catch (error) {

            console.error(
                '[VoiceTTS] Speech failed:',
                error
            );


            // Only finish this request if it is still active.
            finish(
                'exception'
            );


            return false;
        }
    },


    // ========================================================
    // NOTIFY VOICE ENGINE
    // ========================================================

    notifyEngineSpeechFinished(
        reason = 'finished'
    ) {

        const engine =
            window.App?.VoiceEngine;


        if (
            !engine ||
            typeof engine.notifySpeechFinished !==
                'function'
        ) {
            return;
        }


        try {

            engine.notifySpeechFinished(
                reason
            );

        } catch (error) {

            console.warn(
                '[VoiceTTS] Failed to notify VoiceEngine:',
                error
            );
        }
    },


    // ========================================================
    // DEFAULT SPEECH RATE
    // ========================================================

    getDefaultRate(
        language
    ) {

        switch (
            this.normalizeLanguage(
                language
            )
        ) {

            case 'ja-JP':
                return 0.92;

            case 'si-LK':
                return 0.95;

            case 'en-US':
                return 0.95;

            default:
                return 0.92;
        }
    },


    // ========================================================
    // SPEAK JAPANESE
    // ========================================================

    speakJapanese(
        text,
        options = {}
    ) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'ja-JP'
            }
        );
    },


    // ========================================================
    // SPEAK SINHALA
    // ========================================================

    speakSinhala(
        text,
        options = {}
    ) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'si-LK'
            }
        );
    },


    // ========================================================
    // SPEAK ENGLISH
    // ========================================================

    speakEnglish(
        text,
        options = {}
    ) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'en-US'
            }
        );
    },


    // ========================================================
    // SPEAK REPLY OPTION
    // ========================================================

    speakReplyOption(
        japanese
    ) {

        if (
            typeof japanese !== 'string' ||
            !japanese.trim()
        ) {
            return false;
        }


        const result =
            this.speakJapanese(
                japanese
            );


        if (result) {

            Toast.show(
                `🔊 ${japanese}`
            );
        }


        return result;
    },


    // ========================================================
    // CANCEL CURRENT UTTERANCE
    // ========================================================
    //
    // Internal cancellation helper.
    //
    // Does NOT call VoiceEngine notification.
    //
    // Why?
    //
    // If a new speech request replaces an old one, the engine
    // must remain in "speaking" mode for the new utterance.
    // ========================================================

    cancelCurrentUtterance() {

        try {

            if (
                'speechSynthesis' in window
            ) {

                window.speechSynthesis.cancel();
            }

        } catch (error) {

            console.warn(
                '[VoiceTTS] Cancel failed:',
                error
            );
        }


        this.currentUtterance =
            null;

        this.isSpeaking =
            false;
    },


    // ========================================================
    // STOP
    // ========================================================

    stop() {

        // ----------------------------------------------------
        // Invalidate current speech lifecycle first.
        // ----------------------------------------------------

        ++this.speechRequestId;


        const wasSpeaking =
            this.isSpeaking ||
            Boolean(
                this.currentUtterance
            );


        this.cancelCurrentUtterance();


        // ----------------------------------------------------
        // If stop() was explicitly called while speech was
        // active, inform VoiceEngine.
        // ----------------------------------------------------

        if (wasSpeaking) {

            this.notifyEngineSpeechFinished(
                'stopped'
            );
        }
    },


    // ========================================================
    // PAUSE
    // ========================================================

    pause() {

        try {

            if (
                this.isSupported &&
                window.speechSynthesis.speaking
            ) {

                window.speechSynthesis.pause();

                return true;
            }

        } catch (error) {

            console.warn(
                '[VoiceTTS] Pause failed:',
                error
            );
        }


        return false;
    },


    // ========================================================
    // RESUME
    // ========================================================

    resume() {

        try {

            if (
                this.isSupported &&
                window.speechSynthesis.paused
            ) {

                window.speechSynthesis.resume();

                return true;
            }

        } catch (error) {

            console.warn(
                '[VoiceTTS] Resume failed:',
                error
            );
        }


        return false;
    }
};
