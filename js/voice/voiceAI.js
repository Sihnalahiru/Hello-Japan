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

            const prompt =
                Prompts.getVoicePrompt(
                    State.activeVoiceContext,
                    State.activeSpeakerLang,
                    transcript
                );


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


            // Ignore stale AI responses.
            if (
                requestId !==
                State.voiceRequestId
            ) {
                return false;
            }


            const validated =
                this.validateResponse(result);


            if (!validated) {
                throw new Error(
                    'INVALID_VOICE_RESPONSE'
                );
            }


            // ------------------------------------------------
            // Save state
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

            State.lastVoiceResponse = {
                ...validated,
                timestamp: Date.now()
            };


            State.conversationHistory.push(
                {
                    transcript,
                    ...validated,
                    timestamp: Date.now()
                }
            );

            // Keep memory bounded.
            if (
                State.conversationHistory.length > 50
            ) {
                State.conversationHistory =
                    State.conversationHistory.slice(-50);
            }


            // ------------------------------------------------
            // SAFE TTS
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


        return {

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
    },


    // ========================================================
    // REPLY NORMALIZATION
    // ========================================================

    normalizeReply(reply) {

        if (!reply) {
            return null;
        }


        if (typeof reply === 'string') {

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
