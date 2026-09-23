// ============================================================
// Hello Japan AI
// js/voice/voiceAI.js
// Voice AI Controller
// ============================================================

import { State } from '../state.js';
import { Config } from '../config.js';
import { Prompts } from '../ai/prompts.js';
import { Schemas } from '../ai/schemas.js';
import { Gemini } from '../ai/gemini.js';
import { VoiceRenderer } from './voiceRenderer.js';
import { Toast } from '../ui/toast.js';

export const VoiceAI = {

    // ========================================================
    // MAIN VOICE REQUEST
    // ========================================================

    async handleSpokenVoice(heardText) {

        const transcript =
            typeof heardText === 'string'
                ? heardText.trim()
                : '';

        if (!transcript) {
            return false;
        }

        // ----------------------------------------------------
        // Every new request receives a unique ID.
        // This protects against stale Gemini responses.
        // ----------------------------------------------------

        const requestId =
            ++State.voiceRequestId;

        State.currentVoiceTranscript =
            transcript;

        State.lastTranscript =
            transcript;

        State.lastTranscriptTime =
            Date.now();

        VoiceRenderer.showProcessing(
            transcript
        );

        try {

            // ------------------------------------------------
            // Build a small recent conversation context.
            //
            // Do not send the entire 50-record history.
            // Keep only the latest few useful turns.
            // ------------------------------------------------

            const recentHistory =
                this.getRecentHistory(5);

            const prompt =
                Prompts.getVoicePrompt(
                    State.activeVoiceContext,
                    State.activeSpeakerLang,
                    transcript,
                    recentHistory
                );

            // ------------------------------------------------
            // Gemini request
            // ------------------------------------------------

            const result =
                await Gemini.callContent(
                    {
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ]
                    },
                    Config.DEFAULT_TIMEOUT_MS || 12000,
                    Schemas.VOICE_RESPONSE_SCHEMA
                );

            // ------------------------------------------------
            // Ignore stale AI responses.
            //
            // Example:
            // User presses STOP while Gemini is processing.
            // VoiceEngine increments voiceRequestId.
            // This response must be ignored.
            // ------------------------------------------------

            if (
                requestId !==
                State.voiceRequestId
            ) {
                return false;
            }

            // ------------------------------------------------
            // Validate + normalize
            // ------------------------------------------------

            const validated =
                this.validateResponse(result);

            if (!validated) {
                throw new Error(
                    'INVALID_VOICE_RESPONSE'
                );
            }

            // ------------------------------------------------
            // Save current voice state
            // ------------------------------------------------

            State.detectedEnvironment =
                validated.detectedEnvironment;

            State.currentVoiceJapanese =
                validated.heardJapanese;

            State.currentVoiceRomaji =
                validated.heardRomaji;

            State.currentVoiceSinhala =
                validated.heardSinhala;

            State.currentVoiceEnglish =
                validated.heardEnglish;

            State.currentVoiceResponseJapanese =
                validated.responseJapanese;

            State.currentVoiceResponseRomaji =
                validated.responseRomaji;

            State.currentVoiceResponseSinhala =
                validated.responseSinhala;

            State.currentVoiceResponseEnglish =
                validated.responseEnglish;

            State.currentVoiceSuggestions =
                validated.replies;

            // ------------------------------------------------
            // Render
            // ------------------------------------------------

            VoiceRenderer.renderConversation(
                validated
            );

            // ------------------------------------------------
            // Save conversation record
            // ------------------------------------------------

            const conversationRecord = {
                transcript,

                heardJapanese:
                    validated.heardJapanese,

                heardRomaji:
                    validated.heardRomaji,

                heardSinhala:
                    validated.heardSinhala,

                heardEnglish:
                    validated.heardEnglish,

                responseJapanese:
                    validated.responseJapanese,

                responseRomaji:
                    validated.responseRomaji,

                responseSinhala:
                    validated.responseSinhala,

                responseEnglish:
                    validated.responseEnglish,

                detectedEnvironment:
                    validated.detectedEnvironment,

                replies:
                    validated.replies,

                timestamp:
                    Date.now()
            };

            State.lastVoiceResponse =
                conversationRecord;

            if (
                !Array.isArray(
                    State.conversationHistory
                )
            ) {
                State.conversationHistory = [];
            }

            State.conversationHistory.push(
                conversationRecord
            );

            // Keep memory bounded.
            if (
                State.conversationHistory.length > 50
            ) {
                State.conversationHistory =
                    State.conversationHistory.slice(-50);
            }

            // ------------------------------------------------
            // SAFE JAPANESE TTS
            // ------------------------------------------------

            if (
                validated.responseJapanese
            ) {

                const engine =
                    window.App?.VoiceEngine;

                if (
                    engine &&
                    typeof engine.speakWithProtection ===
                        'function'
                ) {

                    engine.speakWithProtection(
                        validated.responseJapanese,
                        {
                            lang: 'ja-JP'
                        }
                    );

                } else {

                    throw new Error(
                        'VOICE_ENGINE_UNAVAILABLE'
                    );
                }
            }

            return true;

        } catch (error) {

            // ------------------------------------------------
            // Never display an error for an obsolete request.
            // ------------------------------------------------

            if (
                requestId !==
                State.voiceRequestId
            ) {
                return false;
            }

            console.error(
                '[VoiceAI] Error:',
                error
            );

            this.showError(error);

            return false;
        }
    },

    // ========================================================
    // RECENT CONVERSATION HISTORY
    // ========================================================

    getRecentHistory(limit = 5) {

        if (
            !Array.isArray(
                State.conversationHistory
            )
        ) {
            return [];
        }

        const safeLimit =
            Math.max(
                0,
                Math.min(
                    Number(limit) || 5,
                    5
                )
            );

        return State.conversationHistory
            .slice(-safeLimit)
            .map(
                (item) => ({
                    user:
                        typeof item?.transcript === 'string'
                            ? item.transcript.trim()
                            : '',

                    assistant:
                        typeof item?.responseJapanese === 'string'
                            ? item.responseJapanese.trim()
                            : ''
                })
            )
            .filter(
                (item) =>
                    item.user ||
                    item.assistant
            );
    },

    // ========================================================
    // RESPONSE VALIDATION / NORMALIZATION
    // ========================================================

    validateResponse(data) {

        if (
            !data ||
            typeof data !== 'object'
        ) {
            return null;
        }

        const text = (key) =>
            typeof data[key] === 'string'
                ? data[key].trim()
                : '';

        const replies =
            Array.isArray(data.replies)
                ? data.replies
                    .map(
                        (reply) =>
                            this.normalizeReply(reply)
                    )
                    .filter(Boolean)
                : [];

        const normalized = {

            detectedEnvironment:
                text('detected_environment') ||
                'Daily / Friendly',

            heardJapanese:
                text('heard_japanese'),

            heardRomaji:
                text('heard_romaji'),

            heardSinhala:
                text('heard_sinhala'),

            heardEnglish:
                text('heard_english'),

            responseJapanese:
                text('response_japanese'),

            responseRomaji:
                text('response_romaji'),

            responseSinhala:
                text('response_sinhala'),

            responseEnglish:
                text('response_english'),

            replies
        };

        // ----------------------------------------------------
        // Application-level validation.
        //
        // The Gemini schema guarantees field structure,
        // but it does NOT guarantee useful non-empty content.
        // ----------------------------------------------------

        const hasHeardContent =
            Boolean(
                normalized.heardJapanese ||
                normalized.heardRomaji ||
                normalized.heardSinhala ||
                normalized.heardEnglish
            );

        const hasResponseContent =
            Boolean(
                normalized.responseJapanese ||
                normalized.responseRomaji ||
                normalized.responseSinhala ||
                normalized.responseEnglish
            );

        if (
            !hasHeardContent ||
            !hasResponseContent
        ) {
            return null;
        }

        return normalized;
    },

    // ========================================================
    // REPLY NORMALIZATION
    // ========================================================

    normalizeReply(reply) {

        if (!reply) {
            return null;
        }

        // ----------------------------------------------------
        // String reply
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
                badge: '',
                japanese,
                romaji: '',
                sinhala: '',
                english: ''
            };
        }

        // ----------------------------------------------------
        // Object reply
        // ----------------------------------------------------

        if (
            typeof reply !== 'object'
        ) {
            return null;
        }

        const value = (
            ...keys
        ) => {

            for (const key of keys) {

                if (
                    typeof reply[key] ===
                    'string'
                ) {

                    const value =
                        reply[key].trim();

                    if (value) {
                        return value;
                    }
                }
            }

            return '';
        };

        const normalized = {

            badge:
                value(
                    'badge',
                    'label',
                    'type'
                ),

            japanese:
                value(
                    'japanese',
                    'jp',
                    'response_japanese',
                    'responseJapanese'
                ),

            romaji:
                value(
                    'romaji',
                    'response_romaji',
                    'responseRomaji'
                ),

            sinhala:
                value(
                    'sinhala',
                    'si',
                    'response_sinhala',
                    'responseSinhala'
                ),

            english:
                value(
                    'english',
                    'en',
                    'response_english',
                    'responseEnglish'
                )
        };

        if (
            !normalized.japanese &&
            !normalized.romaji &&
            !normalized.sinhala &&
            !normalized.english
        ) {
            return null;
        }

        return normalized;
    },

    // ========================================================
    // ERROR
    // ========================================================

    showError(error) {

        console.error(
            '[VoiceAI] Request failed:',
            error
        );

        const message =
            '❌ Voice AI failed. Please speak again.';

        Toast.show(message);

        VoiceRenderer.showError(
            message
        );
    }
};
