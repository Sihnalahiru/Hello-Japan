// ============================================================
// Hello Japan AI
// js/voice/voiceRenderer.js
// Voice Assistant UI Renderer
// ============================================================
//
// RESPONSIBILITY
//
// Voice AI data
//      ↓
// VoiceRenderer
//      ↓
// UI rendering
//
// User-triggered voice replay / suggestion playback
//      ↓
// VoiceEngine.speakWithProtection()
//      ↓
// VoiceTTS
//
// IMPORTANT:
// This module MUST NOT call VoiceTTS directly.
// VoiceEngine owns the microphone/TTS lifecycle.
// ============================================================

import { State } from '../state.js';
import { Toast } from '../ui/toast.js';


// ============================================================
// HELPERS
// ============================================================

function get(id) {
    return document.getElementById(id);
}


function safeText(value, fallback = '') {
    return typeof value === 'string'
        ? value.trim()
        : fallback;
}


function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// ============================================================
// VOICE ENGINE ACCESS
// ============================================================
//
// VoiceRenderer intentionally does not import VoiceEngine.
//
// Why?
//
// VoiceEngine imports VoiceRenderer.
//
// Direct import would create:
//
// VoiceEngine
//     ↓
// VoiceRenderer
//     ↓
// VoiceEngine
//
// Instead the already-registered global App namespace is used.
// ============================================================

function getVoiceEngine() {

    const engine =
        window.App?.VoiceEngine;

    if (
        !engine ||
        typeof engine.speakWithProtection !== 'function'
    ) {
        return null;
    }

    return engine;
}


// ============================================================
// VOICE RENDERER
// ============================================================

export const VoiceRenderer = {

    // ========================================================
    // LISTENING STATE
    // ========================================================

    setListeningState(
        isListening,
        message = ''
    ) {

        const label =
            get('mic-status-label');

        const icon =
            get('mic-live-icon');

        const badge =
            get('listening-badge-dot');

        const button =
            get('mic-avatar-btn');


        const text =
            message ||
            (
                isListening
                    ? 'Listening...'
                    : 'Tap Mic to Speak'
            );


        if (label) {
            label.textContent =
                text;
        }


        if (icon) {

            icon.classList.toggle(
                'bg-red-500',
                Boolean(isListening)
            );

            icon.classList.toggle(
                'bg-gray-400',
                !isListening
            );

            icon.classList.toggle(
                'animate-pulse',
                Boolean(isListening)
            );
        }


        if (badge) {

            badge.classList.toggle(
                'hidden',
                !isListening
            );
        }


        if (button) {

            button.setAttribute(
                'aria-pressed',
                isListening
                    ? 'true'
                    : 'false'
            );

            button.classList.toggle(
                'scale-105',
                Boolean(isListening)
            );
        }
    },


    // ========================================================
    // PROCESSING STATE
    // ========================================================

    showProcessing(
        transcript = ''
    ) {

        this.setListeningState(
            false,
            'AI is thinking...'
        );


        const japanese =
            get('detected-japanese');

        const romaji =
            get('detected-romaji');

        const sinhala =
            get('detected-sinhala');

        const english =
            get('detected-english');


        if (
            japanese &&
            transcript
        ) {
            japanese.textContent =
                transcript;
        }


        if (romaji) {
            romaji.textContent =
                'Processing your speech...';
        }


        if (sinhala) {
            sinhala.textContent =
                'AI ඔබේ කතාව තේරුම් ගනිමින් පවතී...';
        }


        if (english) {
            english.textContent =
                'The AI is understanding your speech...';
        }


        this.clearSuggestions();
    },


    // ========================================================
    // CONVERSATION RENDERER
    // ========================================================

    renderConversation(
        data = {}
    ) {

        const heardJapanese =
            safeText(
                data.heardJapanese
            );

        const heardRomaji =
            safeText(
                data.heardRomaji
            );

        const heardSinhala =
            safeText(
                data.heardSinhala
            );

        const heardEnglish =
            safeText(
                data.heardEnglish
            );


        const responseJapanese =
            safeText(
                data.responseJapanese
            );

        const responseRomaji =
            safeText(
                data.responseRomaji
            );

        const responseSinhala =
            safeText(
                data.responseSinhala
            );

        const responseEnglish =
            safeText(
                data.responseEnglish
            );


        const environment =
            safeText(
                data.detectedEnvironment,
                'Daily / Friendly'
            );


        // ----------------------------------------------------
        // USER SPEECH
        // ----------------------------------------------------

        const japanese =
            get('detected-japanese');

        if (japanese) {

            japanese.textContent =
                heardJapanese ||
                'Speech recognized.';
        }


        const romaji =
            get('detected-romaji');

        if (romaji) {

            romaji.textContent =
                heardRomaji;
        }


        const sinhala =
            get('detected-sinhala');

        if (sinhala) {

            sinhala.textContent =
                heardSinhala ||
                'සිංහල තේරුම ලබාගෙන නොමැත.';
        }


        const english =
            get('detected-english');

        if (english) {

            english.textContent =
                heardEnglish ||
                'English translation unavailable.';
        }


        // ----------------------------------------------------
        // ENVIRONMENT
        // ----------------------------------------------------

        const envDisplay =
            get('voice-env-display');

        if (envDisplay) {

            envDisplay.textContent =
                `Context: ${environment}`;
        }


        // ----------------------------------------------------
        // SUGGESTED RESPONSES
        // ----------------------------------------------------

        const replies =
            Array.isArray(data.replies)
                ? data.replies
                : [];


        const normalizedReplies =
            replies
                .map(
                    reply =>
                        this.normalizeReply(reply)
                )
                .filter(Boolean);


        // ----------------------------------------------------
        // FALLBACK SUGGESTION
        // ----------------------------------------------------

        if (
            normalizedReplies.length === 0 &&
            (
                responseJapanese ||
                responseRomaji ||
                responseSinhala ||
                responseEnglish
            )
        ) {

            normalizedReplies.push({

                japanese:
                    responseJapanese,

                romaji:
                    responseRomaji,

                sinhala:
                    responseSinhala,

                english:
                    responseEnglish
            });
        }


        this.renderSuggestions(
            normalizedReplies
        );


        // ----------------------------------------------------
        // SAVE LAST RESPONSE
        // ----------------------------------------------------

        State.lastVoiceResponse = {

            heardJapanese,
            heardRomaji,
            heardSinhala,
            heardEnglish,

            responseJapanese,
            responseRomaji,
            responseSinhala,
            responseEnglish,

            detectedEnvironment:
                environment,

            replies:
                normalizedReplies
        };


        this.setListeningState(
            false,
            'Tap Mic to Speak'
        );
    },


    // ========================================================
    // REPLY NORMALIZATION
    // ========================================================

    normalizeReply(reply) {

        if (!reply) {
            return null;
        }


        // ----------------------------------------------------
        // STRING
        // ----------------------------------------------------

        if (
            typeof reply === 'string'
        ) {

            const japanese =
                reply.trim();

            if (!japanese) {
                return null;
            }


            return {

                japanese,

                romaji: '',

                sinhala: '',

                english: ''
            };
        }


        // ----------------------------------------------------
        // OBJECT
        // ----------------------------------------------------

        if (
            typeof reply !== 'object'
        ) {
            return null;
        }


        const japanese =
            safeText(
                reply.japanese ||
                reply.jp ||
                reply.response_japanese ||
                reply.responseJapanese
            );


        const romaji =
            safeText(
                reply.romaji ||
                reply.response_romaji ||
                reply.responseRomaji
            );


        const sinhala =
            safeText(
                reply.sinhala ||
                reply.response_sinhala ||
                reply.responseSinhala
            );


        const english =
            safeText(
                reply.english ||
                reply.response_english ||
                reply.responseEnglish
            );


        if (
            !japanese &&
            !romaji &&
            !sinhala &&
            !english
        ) {
            return null;
        }


        return {

            japanese,

            romaji,

            sinhala,

            english
        };
    },


    // ========================================================
    // SUGGESTIONS
    // ========================================================

    renderSuggestions(
        replies = []
    ) {

        const container =
            get('suggestions-list');

        const empty =
            get('voice-suggestion-empty');


        if (!container) {
            return;
        }


        container.innerHTML = '';


        if (
            !Array.isArray(replies) ||
            replies.length === 0
        ) {

            if (empty) {
                empty.classList.remove(
                    'hidden'
                );
            }

            return;
        }


        if (empty) {
            empty.classList.add(
                'hidden'
            );
        }


        replies.forEach(
            (
                reply,
                index
            ) => {

                const card =
                    document.createElement(
                        'button'
                    );


                card.type =
                    'button';

                card.className =
                    'voice-suggestion-card w-full text-left bg-white border border-emerald-100 rounded-xl p-3 shadow-sm hover:border-brandGreen hover:bg-emerald-50 active:scale-[0.99] transition-all';


                card.dataset.voiceReply =
                    String(index);


                const japanese =
                    escapeHtml(
                        reply.japanese ||
                        ''
                    );


                const romaji =
                    escapeHtml(
                        reply.romaji ||
                        ''
                    );


                const sinhala =
                    escapeHtml(
                        reply.sinhala ||
                        ''
                    );


                const english =
                    escapeHtml(
                        reply.english ||
                        ''
                    );


                card.innerHTML = `

                    <div class="flex items-start justify-between gap-2">

                        <div class="min-w-0 flex-1">

                            ${
                                japanese
                                    ? `
                                        <div class="text-sm font-black text-gray-900 leading-snug">
                                            ${japanese}
                                        </div>
                                      `
                                    : ''
                            }

                            ${
                                romaji
                                    ? `
                                        <div class="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                            ${romaji}
                                        </div>
                                      `
                                    : ''
                            }

                            ${
                                sinhala
                                    ? `
                                        <div class="text-[10px] text-gray-700 font-semibold mt-1">
                                            🇱🇰 ${sinhala}
                                        </div>
                                      `
                                    : ''
                            }

                            ${
                                english
                                    ? `
                                        <div class="text-[10px] text-gray-500 mt-0.5">
                                            🇬🇧 ${english}
                                        </div>
                                      `
                                    : ''
                            }

                        </div>

                        <span class="shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">

                            <i class="ph ph-speaker-high"></i>

                        </span>

                    </div>
                `;


                card.addEventListener(
                    'click',
                    () => {

                        this.handleSuggestionTap(
                            reply
                        );
                    }
                );


                container.appendChild(
                    card
                );
            }
        );
    },


    // ========================================================
    // SUGGESTION TAP
    // ========================================================
    //
    // IMPORTANT:
    //
    // NEVER call VoiceTTS directly here.
    //
    // Correct:
    //
    // VoiceRenderer
    //      ↓
    // VoiceEngine
    //      ↓
    // protected TTS
    //
    // ========================================================

    async handleSuggestionTap(
        reply
    ) {

        const japanese =
            safeText(
                reply?.japanese
            );


        if (!japanese) {

            Toast.show(
                'No Japanese response available.'
            );

            return false;
        }


        // ----------------------------------------------------
        // Save selected response.
        // ----------------------------------------------------

        State.selectedVoiceResponse =
            {
                ...reply
            };


        // ----------------------------------------------------
        // Get protected voice engine.
        // ----------------------------------------------------

        const engine =
            getVoiceEngine();


        if (!engine) {

            console.warn(
                '[VoiceRenderer] VoiceEngine TTS protection unavailable.'
            );


            Toast.show(
                'Voice output is not ready.'
            );

            return false;
        }


        // ----------------------------------------------------
        // Speak through VoiceEngine.
        // ----------------------------------------------------

        const result =
            await Promise.resolve(
                engine.speakWithProtection(
                    japanese,
                    {
                        lang: 'ja-JP'
                    }
                )
            );


        if (result === false) {

            Toast.show(
                'Voice output failed.'
            );

            return false;
        }


        return true;
    },


    // ========================================================
    // CLEAR SUGGESTIONS
    // ========================================================

    clearSuggestions() {

        const container =
            get('suggestions-list');

        const empty =
            get('voice-suggestion-empty');


        if (container) {

            container.innerHTML =
                '';
        }


        if (empty) {

            empty.classList.remove(
                'hidden'
            );
        }
    },


    // ========================================================
    // ERROR
    // ========================================================

    showError(
        message = ''
    ) {

        const japanese =
            get('detected-japanese');

        const romaji =
            get('detected-romaji');

        const sinhala =
            get('detected-sinhala');

        const english =
            get('detected-english');


        if (japanese) {

            japanese.textContent =
                'Voice AI error';
        }


        if (romaji) {

            romaji.textContent =
                'Please speak again.';
        }


        if (sinhala) {

            sinhala.textContent =
                'කරුණාකර නැවත කතා කරන්න.';
        }


        if (english) {

            english.textContent =
                message ||
                'Please try speaking again.';
        }


        this.clearSuggestions();


        this.setListeningState(
            false,
            'Tap Mic to Speak'
        );
    },


    // ========================================================
    // SPEAKER UI
    // ========================================================

    updateSpeakerUI(
        language
    ) {

        const buttons = {

            'ja-JP':
                get('btn-speaker-jp'),

            'si-LK':
                get('btn-speaker-si'),

            'en-US':
                get('btn-speaker-en')
        };


        Object.entries(
            buttons
        ).forEach(
            (
                [lang, button]
            ) => {

                if (!button) {
                    return;
                }


                const active =
                    lang === language;


                if (active) {

                    button.classList.add(
                        'bg-deepCard',
                        'text-white'
                    );

                    button.classList.remove(
                        'bg-white',
                        'text-gray-700'
                    );

                } else {

                    button.classList.remove(
                        'bg-deepCard',
                        'text-white'
                    );

                    button.classList.add(
                        'bg-white',
                        'text-gray-700'
                    );
                }
            }
        );


        State.activeSpeakerLang =
            language;
    },


    // ========================================================
    // CONTEXT UI
    // ========================================================

    updateContextUI(
        context
    ) {

        const buttons =
            document.querySelectorAll(
                '[data-ctx]'
            );


        buttons.forEach(
            button => {

                const active =
                    button.getAttribute(
                        'data-ctx'
                    ) === context;


                button.classList.toggle(
                    'active',
                    active
                );


                if (active) {

                    button.classList.add(
                        'bg-deepCard',
                        'text-white'
                    );

                    button.classList.remove(
                        'bg-white',
                        'text-gray-600'
                    );

                } else {

                    button.classList.remove(
                        'bg-deepCard',
                        'text-white'
                    );

                    button.classList.add(
                        'bg-white',
                        'text-gray-600'
                    );
                }
            }
        );


        const envDisplay =
            get('voice-env-display');


        const labels = {

            daily:
                'Daily / Friendly',

            workplace:
                'Workplace (Keigo)',

            restaurant:
                'Restaurant',

            konbini:
                'Store / Konbini'
        };


        if (envDisplay) {

            envDisplay.textContent =
                `Context: ${
                    labels[context] ||
                    context ||
                    'Daily / Friendly'
                }`;
        }
    },


    // ========================================================
    // REPLAY DETECTED SPEECH
    // ========================================================
    //
    // This MUST also use VoiceEngine protection.
    //
    // ========================================================

    async replayDetected() {

        const data =
            State.lastVoiceResponse;


        const text =
            safeText(
                data?.heardJapanese
            );


        if (!text) {

            Toast.show(
                'No detected Japanese speech yet.'
            );

            return false;
        }


        const engine =
            getVoiceEngine();


        if (!engine) {

            console.warn(
                '[VoiceRenderer] VoiceEngine TTS protection unavailable.'
            );


            Toast.show(
                'Voice output is not ready.'
            );

            return false;
        }


        const result =
            await Promise.resolve(
                engine.speakWithProtection(
                    text,
                    {
                        lang: 'ja-JP'
                    }
                )
            );


        if (result === false) {

            Toast.show(
                'Voice replay failed.'
            );

            return false;
        }


        return true;
    },


    // ========================================================
    // CLEAR COMPLETE VOICE SCREEN
    // ========================================================

    clearConversation() {

        const japanese =
            get('detected-japanese');

        const romaji =
            get('detected-romaji');

        const sinhala =
            get('detected-sinhala');

        const english =
            get('detected-english');


        if (japanese) {

            japanese.textContent =
                'Speak when you are ready...';
        }


        if (romaji) {

            romaji.textContent =
                'Your Japanese speech will appear here.';
        }


        if (sinhala) {

            sinhala.textContent =
                'ඔබ කතා කරන Japanese වාක්‍යයේ තේරුම මෙහි පෙන්වයි.';
        }


        if (english) {

            english.textContent =
                'Your recognized speech will be translated here.';
        }


        this.clearSuggestions();


        State.lastVoiceResponse =
            null;

        State.selectedVoiceResponse =
            null;
    }
};


// ============================================================
// REPLAY BUTTON
// ============================================================
//
// Kept as a defensive listener because existing HTML may use
// this button directly.
//
// ============================================================

document.addEventListener(
    'click',
    event => {

        const target =
            event.target instanceof Element
                ? event.target
                : null;


        if (!target) {
            return;
        }


        const replay =
            target.closest(
                '#btn-voice-replay'
            );


        if (!replay) {
            return;
        }


        event.preventDefault();


        void VoiceRenderer.replayDetected();
    }
);
