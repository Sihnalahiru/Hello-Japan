// ============================================================
// Hello Japan AI
// js/voice/voiceTTS.js
// Text-to-Speech Engine
// ============================================================

import { Toast } from '../ui/toast.js';

export const VoiceTTS = {

    // --------------------------------------------------------
    // State
    // --------------------------------------------------------

    isSupported: false,
    isSpeaking: false,
    currentUtterance: null,
    voiceCache: [],

    activeLanguage: 'ja-JP',


    // --------------------------------------------------------
    // Initialize
    // --------------------------------------------------------

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


        // Chrome / Edge normally populate voices
        // asynchronously.
        window.speechSynthesis.onvoiceschanged = () => {
            this.loadVoices();
        };


        return true;
    },


    // --------------------------------------------------------
    // Load available voices
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Normalize language
    // --------------------------------------------------------

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


        return language || 'ja-JP';
    },


    // --------------------------------------------------------
    // Find voice by language
    // --------------------------------------------------------

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


        // ----------------------------------------------------
        // Exact language match
        // ----------------------------------------------------

        let voice =
            this.voiceCache.find(
                (item) => {

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
                (item) => {

                    const lang =
                        String(
                            item.lang || ''
                        )
                            .toLowerCase()
                            .replace('_', '-');

                    return lang === base ||
                        lang.startsWith(
                            `${base}-`
                        );
                }
            );


        if (voice) {
            return voice;
        }


        // ----------------------------------------------------
        // Common fallback mapping
        // ----------------------------------------------------

        if (target === 'ja-jp') {

            voice =
                this.voiceCache.find(
                    (item) =>
                        String(item.name || '')
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
                        String(item.name || '')
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


    // --------------------------------------------------------
    // Backward-compatible Japanese helper
    // --------------------------------------------------------

    findJapaneseVoice() {

        return this.findVoice(
            'ja-JP'
        );
    },


    // --------------------------------------------------------
    // Set active TTS language
    // --------------------------------------------------------

    setLanguage(language) {

        const normalized =
            this.normalizeLanguage(
                language
            );


        this.activeLanguage =
            normalized;


        return normalized;
    },


    // --------------------------------------------------------
    // Speak text
    // --------------------------------------------------------

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

                return false;
            }
        }


        const cleanText =
            text.trim();


        // ----------------------------------------------------
        // Determine language
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
        // Stop previous speech
        // ----------------------------------------------------

        this.stop();


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
                : this.getDefaultRate(language);


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
        // Select language-matching voice
        // ----------------------------------------------------

        const voice =
            options.voice ||
            this.findVoice(language);


        if (voice) {
            utterance.voice = voice;
        }


        // ----------------------------------------------------
        // Lifecycle
        // ----------------------------------------------------

        this.currentUtterance =
            utterance;


        this.isSpeaking =
            true;


        const finish =
            () => {

                if (
                    this.currentUtterance ===
                    utterance
                ) {

                    this.currentUtterance =
                        null;

                    this.isSpeaking =
                        false;
                }
            };


        utterance.onstart =
            () => {

                this.isSpeaking =
                    true;
            };


        utterance.onend =
            finish;


        utterance.onerror =
            (event) => {

                console.warn(
                    '[VoiceTTS] Speech error:',
                    event?.error || event
                );

                finish();
            };


        utterance.oncancel =
            finish;


        // ----------------------------------------------------
        // Speak
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


            finish();


            return false;
        }
    },


    // --------------------------------------------------------
    // Default speech rate
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Speak Japanese
    // --------------------------------------------------------

    speakJapanese(text, options = {}) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'ja-JP'
            }
        );
    },


    // --------------------------------------------------------
    // Speak Sinhala
    // --------------------------------------------------------

    speakSinhala(text, options = {}) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'si-LK'
            }
        );
    },


    // --------------------------------------------------------
    // Speak English
    // --------------------------------------------------------

    speakEnglish(text, options = {}) {

        return this.speakText(
            text,
            {
                ...options,
                lang: 'en-US'
            }
        );
    },


    // --------------------------------------------------------
    // Reply option
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Stop
    // --------------------------------------------------------

    stop() {

        try {

            if (
                'speechSynthesis' in window
            ) {

                window.speechSynthesis.cancel();
            }

        } catch (error) {

            console.warn(
                '[VoiceTTS] Stop failed:',
                error
            );
        }


        this.currentUtterance =
            null;

        this.isSpeaking =
            false;
    },


    // --------------------------------------------------------
    // Pause
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Resume
    // --------------------------------------------------------

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
