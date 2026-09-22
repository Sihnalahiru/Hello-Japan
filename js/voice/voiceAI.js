// ============================================================
// Hello Japan AI
// js/voice/voiceAI.js
// Voice AI Orchestrator
// ============================================================

import { State } from '../state.js';
import { Config } from '../config.js';
import { Prompts } from '../ai/prompts.js';
import { Schemas } from '../ai/schemas.js';
import { Gemini } from '../ai/gemini.js';
import { VoiceRenderer } from './voiceRenderer.js';
import { Toast } from '../ui/toast.js';


// ============================================================
// VOICE AI
// ============================================================

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
        // Request ID
        //
        // Prevents an old Gemini response from overwriting
        // a newer voice request.
        // ----------------------------------------------------

        const requestId =
            ++State.voiceRequestId;


        // ----------------------------------------------------
        // Save transcript
        // ----------------------------------------------------

        State.currentVoiceTranscript =
            transcript;


        // ----------------------------------------------------
        // Processing UI
        // ----------------------------------------------------

        VoiceRenderer.showProcessing(
            transcript
        );


        try {

            // ------------------------------------------------
            // Build prompt
            // ------------------------------------------------

            const prompt =
                Prompts.getVoicePrompt(
                    State.activeVoiceContext,
                    State.activeSpeakerLang,
                    transcript
                );


            // ------------------------------------------------
            // Gemini
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
            // Stale request protection
            // ------------------------------------------------

            if (
                requestId !==
                State.voiceRequestId
            ) {
                return false;
            }


            // ------------------------------------------------
            // Validate / normalize
            // ------------------------------------------------

            const validated =
                this.validateResponse(
                    result
                );


            if (!validated) {
                throw new Error(
                    'INVALID_VOICE_RESPONSE'
                );
            }


            // ------------------------------------------------
            // Save response to State
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
            // Render conversation
            // ------------------------------------------------

            VoiceRenderer.renderConversation(
                validated
            );


            // ------------------------------------------------
            // AI Japanese response → TTS
            //
            // IMPORTANT:
            //
            // Do NOT import VoiceTTS here.
            //
            // VoiceEngine owns TTS protection.
            //
            // This prevents:
            //
            // VoiceAI → TTS
            //
            // and instead creates:
            //
            // VoiceAI
            //    ↓
            // VoiceEngine
            //    ↓
            // VoiceTTS
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

                    await engine.speakWithProtection(
                        validated.responseJapanese,
                        {
                            lang: 'ja-JP'
                        }
                    );

                } else {

                    console.warn(
                        '[VoiceAI] VoiceEngine.speakWithProtection unavailable.'
                    );

                }
            }


            return true;

        } catch (error) {

            // ------------------------------------------------
            // Ignore stale errors
            // ------------------------------------------------

            if (
                requestId !==
                State.voiceRequestId
            ) {
                return false;
            }


            console.error(
                '[VoiceAI] Voice AI Error:',
                error
            );


            this.showError(
                error
            );


            return false;
        }
    },


    // ========================================================
    // VALIDATE RESPONSE
    // ========================================================

    validateResponse(data) {

        if (
            !data ||
            typeof data !== 'object'
        ) {
            return null;
        }


        const text = (key) => {

            const value =
                data[key];

            return typeof value === 'string'
                ? value.trim()
                : '';
        };


        const replies =
            Array.isArray(data.replies)
                ? data.replies
                    .map((reply) =>
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
    // NORMALIZE REPLY
    // ========================================================

    normalizeReply(reply) {

        if (
            !reply ||
            typeof reply !== 'object'
        ) {
            return null;
        }


        const textFrom =
            (...keys) => {

                for (const key of keys) {

                    if (
                        typeof reply[key] ===
                            'string' &&
                        reply[key].trim()
                    ) {
                        return reply[key].trim();
                    }
                }

                return '';
            };


        return {

            badge:
                textFrom(
                    'badge',
                    'label',
                    'title'
                ),

            jp:
                textFrom(
                    'jp',
                    'japanese',
                    'response_japanese',
                    'responseJapanese'
                ),

            romaji:
                textFrom(
                    'romaji',
                    'response_romaji',
                    'responseRomaji'
                ),

            sinhala:
                textFrom(
                    'sinhala',
                    'response_sinhala',
                    'responseSinhala'
                ),

            english:
                textFrom(
                    'english',
                    'response_english',
                    'responseEnglish'
                )
        };
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


        Toast.show(
            message
        );


        VoiceRenderer.showError(
            message
        );
    }
};
