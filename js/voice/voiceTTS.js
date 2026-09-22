// ============================================================
// Hello Japan AI
// js/voice/voiceTTS.js
// Protected Text-to-Speech Engine
// ============================================================

import { Toast } from '../ui/toast.js';

export const VoiceTTS = {

    // ========================================================
    // STATE
    // ========================================================

    isSupported: false,

    isSpeaking: false,

    currentUtterance: null,

    voiceCache: [],

    activeLanguage: 'ja-JP',

    speechRequestId: 0,


    // ========================================================
    // INITIALIZE
    // ========================================================

    init() {

        this.isSupported =
            'speechSynthesis' in window &&
            typeof window.SpeechSynthesisUtterance !==
                'undefined';

        if (!this.isSupported) {

            console.warn(
                '[VoiceTTS] Speech synthesis is not supported.'
            );

            return false;
        }

        this.loadVoices();

        if (
            'onvoiceschanged' in
            window.speechSynthesis
        ) {

            window.speechSynthesis.onvoiceschanged =
                () => {
                    this.loadVoices();
                };
        }

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

        } catch (error) {

            console.warn(
                '[VoiceTTS] Voice loading failed:',
                error
            );
        }

        return this.voiceCache;
    },


    // ========================================================
    // LANGUAGE
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
    },


    setLanguage(language) {

        this.activeLanguage =
            this.normalizeLanguage(
                language
            );

        return this.activeLanguage;
    },


    // ========================================================
    // FIND VOICE
    // ========================================================

    findVoice(language = 'ja-JP') {

        this.loadVoices();

        const target =
            this.normalizeLanguage(
                language
            )
                .toLowerCase()
                .replace('_', '-');

        if (!this.voiceCache.length) {
            return null;
        }

        // Exact language.
        let voice =
            this.voiceCache.find(
                (item) =>
                    String(
                        item.lang || ''
                    )
                        .toLowerCase()
                        .replace('_', '-') ===
                    target
            );

        if (voice) {
            return voice;
        }

        // Base language.
        const base =
            target.split('-')[0];

        voice =
            this.voiceCache.find(
                (item) => {

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

        // Name-based fallback.
        if (target === 'ja-jp') {

            voice =
                this.voiceCache.find(
                    (item) =>
                        String(
                            item.name || ''
                        )
                            .toLowerCase()
                            .includes('japanese')
                );
        }

        if (
            !voice &&
            target === 'en-us'
        ) {

            voice =
                this.voiceCache.find(
                    (item) =>
                        String(
                            item.name || ''
                        )
                            .toLowerCase()
                            .includes('english')
                );
        }

        if (
            !voice &&
            target === 'si-lk'
        ) {

            voice =
                this.voiceCache.find(
                    (item) => {

                        const name =
                            String(
                                item.name || ''
                            ).toLowerCase();

                        const lang =
                            String(
                                item.lang || ''
                            ).toLowerCase();

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


    findJapaneseVoice() {

        return this.findVoice('ja-JP');
    },


    // ========================================================
    // SPEAK
    // ========================================================

    speakText(text, options = {}) {

        if (
            typeof text !== 'string' ||
            !text.trim()
        ) {
            return false;
        }

        if (!this.isSupported) {

            this.init();

            if (!this.isSupported) {

                Toast.show(
                    'Speech synthesis is not supported on this device.'
                );

                this.notifyEngine(
                    'unsupported'
                );

                return false;
            }
        }

        const cleanText =
            text.trim();

        const language =
            this.normalizeLanguage(
                options.lang ||
                options.language ||
                this.activeLanguage
            );

        this.activeLanguage =
            language;


        // ----------------------------------------------------
        // IMPORTANT
        //
        // Create the NEW request ID first.
        // Cancelling the old utterance must NOT increment it.
        // Old callbacks will become stale because their ID
        // is different from this current ID.
        // ----------------------------------------------------

        const requestId =
            ++this.speechRequestId;

        this.cancelCurrentUtterance();


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


        const voice =
            options.voice ||
            this.findVoice(language);

        if (voice) {
            utterance.voice =
                voice;
        }


        this.currentUtterance =
            utterance;

        this.isSpeaking =
            true;


        // ----------------------------------------------------
        // FINISH
        // ----------------------------------------------------

        const finish = (reason) => {

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

            this.notifyEngine(
                reason
            );
        };


        // ----------------------------------------------------
        // EVENTS
        // ----------------------------------------------------

        utterance.onstart = () => {

            if (
                requestId !==
                this.speechRequestId
            ) {
                return;
            }

            this.isSpeaking =
                true;
        };


        utterance.onend = () => {

            finish(
                'finished'
            );
        };


        utterance.oncancel = () => {

            finish(
                'cancelled'
            );
        };


        utterance.onerror = (event) => {

            console.warn(
                '[VoiceTTS] Speech error:',
                event?.error || event
            );

            finish(
                'error'
            );
        };


        // ----------------------------------------------------
        // START SPEECH
        // ----------------------------------------------------

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

            finish(
                'exception'
            );

            return false;
        }
    },


    // ========================================================
    // DEFAULT RATE
    // ========================================================

    getDefaultRate(language) {

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
    // HELPERS
    // ========================================================

    speakJapanese(text, options = {}) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'ja-JP'
            }
        );
    },


    speakSinhala(text, options = {}) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'si-LK'
            }
        );
    },


    speakEnglish(text, options = {}) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'en-US'
            }
        );
    },


    speakReplyOption(japanese) {

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
    // INTERNAL CANCEL
    //
    // IMPORTANT:
    // This function does NOT change speechRequestId.
    //
    // The caller that starts a NEW speech request is responsible
    // for creating the new request ID.
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

        const hadSpeech =
            this.isSpeaking ||
            Boolean(
                this.currentUtterance
            );

        // Invalidate the current request.
        this.speechRequestId += 1;

        this.cancelCurrentUtterance();

        if (hadSpeech) {

            this.notifyEngine(
                'stopped'
            );
        }
    },


    // ========================================================
    // ENGINE NOTIFICATION
    // ========================================================

    notifyEngine(reason) {

        const engine =
            window.App?.VoiceEngine;

        if (
            engine &&
            typeof engine.notifySpeechFinished ===
                'function'
        ) {

            engine.notifySpeechFinished(
                reason
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
