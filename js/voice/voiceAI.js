// ============================================================
// Hello Japan AI
// js/voice/voiceAI.js
// Voice AI orchestration layer
// ============================================================
//
// Responsibility:
//
// User speech
//    ↓
// VoiceEngine
//    ↓
// VoiceAI
//    ↓
// Gemini
//    ↓
// Schema validation
//    ↓
// VoiceRenderer
//    ↓
// VoiceEngine.speakWithProtection()
//    ↓
// VoiceTTS
//
// IMPORTANT:
// VoiceAI must NOT import VoiceTTS directly.
//
// VoiceEngine owns the microphone/TTS lifecycle so that
// recognition cannot hear the AI's own speech.
// ============================================================

import { State } from '../state.js';
import { Config } from '../config.js';
import { Prompts } from '../ai/prompts.js';
import { Schemas } from '../ai/schemas.js';
import { Gemini } from '../ai/gemini.js';
import { VoiceRenderer } from './voiceRenderer.js';
import { Toast } from '../ui/toast.js';


// ============================================================
// INTERNAL HELPERS
// ============================================================

function cleanString(value) {
    return typeof value === 'string'
        ? value.trim()
        : '';
}


function getVoiceEngine() {
    const engine = window.App?.VoiceEngine;

    if (
        !engine ||
        typeof engine.speakWithProtection !== 'function'
    ) {
        return null;
    }

    return engine;
}


// ============================================================
// VOICE AI
// ============================================================

export const VoiceAI = {

    // ========================================================
    // HANDLE SPOKEN VOICE
    // ========================================================

    async handleSpokenVoice(heardText) {

        const transcript =
            cleanString(heardText);

        if (!transcript) {
            return false;
        }


        // ----------------------------------------------------
        // Create a unique request ID.
        //
        // If another request becomes active before this one
        // finishes, the older response must never update the UI
        // or trigger TTS.
        // ----------------------------------------------------

        const requestId =
            ++State.voiceRequestId;


        // ----------------------------------------------------
        // Save latest transcript into state.
        // ----------------------------------------------------

        State.lastTranscript =
            transcript;

        State.lastTranscriptTime =
            Date.now();

        State.currentVoiceTranscript =
            transcript;


        // ----------------------------------------------------
        // Show processing UI.
        // ----------------------------------------------------

        VoiceRenderer.showProcessing(
            transcript
        );


        try {

            // ==================================================
            // BUILD PROMPT
            // ==================================================

            const prompt =
                Prompts.getVoicePrompt(
                    State.activeVoiceContext,
                    State.activeSpeakerLang,
                    transcript
                );


            if (
                typeof prompt !== 'string' ||
                !prompt.trim()
            ) {
                throw new Error(
                    'VOICE_PROMPT_EMPTY'
                );
            }


            // ==================================================
            // GEMINI REQUEST
            // ==================================================

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

                    Config.DEFAULT_TIMEOUT_MS ||
                    12000,

                    Schemas.VOICE_RESPONSE_SCHEMA
                );


            // ==================================================
            // STALE REQUEST PROTECTION
            // ==================================================
            //
            // A newer voice request may have started while
            // Gemini was processing this one.
            //
            // Never allow an old request to:
            // - overwrite the UI
            // - speak old text
            // - overwrite State
            //
            // This check MUST happen before validation/rendering.
            // ==================================================

            if (
                requestId !==
                State.voiceRequestId
            ) {
                return false;
            }


            // ==================================================
            // VALIDATE / NORMALIZE RESPONSE
            // ==================================================

            const validated =
                this.validateResponse(
                    result
                );


            if (!validated) {
                throw new Error(
                    'INVALID_VOICE_RESPONSE'
                );
            }


            // ==================================================
            // UPDATE STATE
            // ==================================================

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


            // ==================================================
            // RENDER RESPONSE
            // ==================================================

            VoiceRenderer.renderConversation(
                validated
            );


            // ==================================================
            // FINAL STALE CHECK
            // ==================================================
            //
            // Rendering can theoretically trigger another
            // interaction synchronously/asynchronously.
            //
            // Never speak if this request is no longer current.
            // ==================================================

            if (
                requestId !==
                State.voiceRequestId
            ) {
                return false;
            }


            // ==================================================
            // SPEAK AI RESPONSE
            // ==================================================

            const responseJapanese =
                validated.responseJapanese;


            if (!responseJapanese) {
                return true;
            }


            // --------------------------------------------------
            // IMPORTANT
            // --------------------------------------------------
            //
            // Do NOT do this:
            //
            // VoiceTTS.speakText(...)
            //
            // VoiceAI is not allowed to bypass VoiceEngine.
            //
            // VoiceEngine must:
            //
            // 1. stop/protect recognition
            // 2. mark speaking state
            // 3. call VoiceTTS
            // 4. prevent recognition feedback
            // 5. restore safe idle state
            //
            // --------------------------------------------------

            const voiceEngine =
                getVoiceEngine();


            if (!voiceEngine) {

                console.warn(
                    '[VoiceAI] VoiceEngine TTS protection is unavailable.'
                );

                Toast.show(
                    'Voice output is not ready.'
                );

                return true;
            }


            // ==================================================
            // SPEAK THROUGH PROTECTED ENGINE
            // ==================================================

            const speechResult =
                await Promise.resolve(
                    voiceEngine.speakWithProtection(
                        responseJapanese,
                        {
                            lang:
                                'ja-JP'
                        }
                    )
                );


            // --------------------------------------------------
            // The TTS engine may return false if speech
            // synthesis is unavailable.
            // --------------------------------------------------

            if (
                speechResult === false
            ) {

                console.warn(
                    '[VoiceAI] Protected TTS request failed.'
                );

                return true;
            }


            return true;

        } catch (error) {

            // ==================================================
            // STALE ERROR PROTECTION
            // ==================================================

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
    // RESPONSE VALIDATION
    // ========================================================
    //
    // Gemini is schema-constrained, but we still normalize
    // defensively because runtime data should never be trusted
    // blindly.
    // ========================================================

    validateResponse(data) {

        if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data)
        ) {
            return null;
        }


        const text = (key) => {

            return cleanString(
                data[key]
            );

        };


        // ----------------------------------------------------
        // Normalize replies.
        //
        // We preserve the existing reply structure:
        //
        // {
        //   badge,
        //   jp,
        //   romaji,
        //   sinhala,
        //   english
        // }
        //
        // VoiceRenderer already knows how to normalize both
        // schema-style and UI-style reply objects.
        // ----------------------------------------------------

        const replies =
            Array.isArray(
                data.replies
            )
                ? data.replies
                    .filter(
                        reply =>
                            reply &&
                            typeof reply === 'object'
                    )
                    .map(
                        reply => ({
                            badge:
                                cleanString(
                                    reply.badge
                                ),

                            jp:
                                cleanString(
                                    reply.jp
                                ),

                            romaji:
                                cleanString(
                                    reply.romaji
                                ),

                            sinhala:
                                cleanString(
                                    reply.sinhala
                                ),

                            english:
                                cleanString(
                                    reply.english
                                )
                        })
                    )
                : [];


        // ----------------------------------------------------
        // Required response fields.
        //
        // The schema requires them, but defensive normalization
        // keeps the application stable if Gemini/backend
        // returns an incomplete object.
        // ----------------------------------------------------

        return {

            detectedEnvironment:
                text(
                    'detected_environment'
                ) ||
                'Daily / Friendly',

            heardJapanese:
                text(
                    'heard_japanese'
                ),

            heardRomaji:
                text(
                    'heard_romaji'
                ),

            heardSinhala:
                text(
                    'heard_sinhala'
                ),

            heardEnglish:
                text(
                    'heard_english'
                ),

            responseJapanese:
                text(
                    'response_japanese'
                ),

            responseRomaji:
                text(
                    'response_romaji'
                ),

            responseSinhala:
                text(
                    'response_sinhala'
                ),

            responseEnglish:
                text(
                    'response_english'
                ),

            replies
        };
    },


    // ========================================================
    // ERROR HANDLING
    // ========================================================

    showError(error) {

        let message =
            '❌ Voice AI failed. Please speak again.';


        // ----------------------------------------------------
        // Keep the user-facing message simple.
        //
        // Detailed technical errors stay in console.
        // ----------------------------------------------------

        if (
            error?.message ===
            'VOICE_PROMPT_EMPTY'
        ) {
            message =
                '❌ Voice request could not be prepared. Please try again.';
        }

        else if (
            error?.message ===
            'INVALID_VOICE_RESPONSE'
        ) {
            message =
                '❌ AI response was incomplete. Please speak again.';
        }

        else if (
            error?.message ===
            'RATE_LIMIT'
        ) {
            message =
                '⏳ Too many requests. Please wait a moment and try again.';
        }

        else if (
            error?.message ===
            'API_KEY_INVALID'
        ) {
            message =
                '❌ AI service authentication failed.';
        }

        else if (
            error?.message ===
            'WORKER_ENDPOINT_MISSING'
        ) {
            message =
                '❌ AI service is not configured.';
        }


        Toast.show(
            message
        );

        VoiceRenderer.showError(
            message
        );
    }
};
