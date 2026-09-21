window.App = window.App || {};

App.VoiceAI = {

    async handleSpokenVoice(heardText) {

        const transcript =
            typeof heardText === "string"
                ? heardText.trim()
                : "";

        if (!transcript) return;

        const requestId = ++App.State.voiceRequestId;

        App.State.currentVoiceTranscript = transcript;
        App.State.currentVoiceState =
            App.State.VoiceState.PROCESSING;

        App.VoiceRenderer?.showProcessing?.(transcript);

        try {

            const prompt = App.Prompts.getVoicePrompt(
                App.State.activeVoiceContext,
                App.State.activeSpeakerLang,
                transcript
            );

            const result = await App.Gemini.callContent(
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
                App.Config?.DEFAULT_TIMEOUT_MS || 12000,
                App.Schemas?.VOICE_RESPONSE_SCHEMA
            );

            // Ignore old request results
            if (requestId !== App.State.voiceRequestId) {
                return;
            }

            const validated = this.validateResponse(result);

            if (!validated) {
                throw new Error("INVALID_VOICE_RESPONSE");
            }

            // --------------------------------------------------
            // SAVE HEARD SPEECH
            // --------------------------------------------------

            App.State.currentVoiceTranscript = transcript;

            App.State.currentVoiceJapanese =
                validated.heardJapanese;

            App.State.currentVoiceRomaji =
                validated.heardRomaji;

            App.State.currentVoiceSinhala =
                validated.heardSinhala;

            App.State.currentVoiceEnglish =
                validated.heardEnglish;

            // --------------------------------------------------
            // SAVE AI RESPONSE
            // --------------------------------------------------

            App.State.currentVoiceResponseJapanese =
                validated.responseJapanese;

            App.State.currentVoiceResponseRomaji =
                validated.responseRomaji;

            App.State.currentVoiceResponseSinhala =
                validated.responseSinhala;

            App.State.currentVoiceResponseEnglish =
                validated.responseEnglish;

            App.State.currentVoiceSuggestions =
                validated.replies;

            // --------------------------------------------------
            // RENDER
            // --------------------------------------------------

            App.VoiceRenderer?.renderConversation?.(
                validated
            );

            // --------------------------------------------------
            // READY STATE
            // --------------------------------------------------

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;

            // --------------------------------------------------
            // JAPANESE TTS
            // --------------------------------------------------

            if (
                validated.responseJapanese &&
                App.VoiceTTS &&
                typeof App.VoiceTTS.speakText === "function"
            ) {
                try {
                    await App.VoiceTTS.speakText(
                        validated.responseJapanese
                    );
                } catch (ttsError) {
                    console.warn(
                        "Voice TTS Error:",
                        ttsError
                    );
                }
            }

        } catch (error) {

            // Ignore old request errors
            if (requestId !== App.State.voiceRequestId) {
                return;
            }

            console.error(
                "Voice AI Processing Error:",
                error
            );

            // Don't pretend we are actively listening
            App.State.currentVoiceState =
                App.State.VoiceState.IDLE;

            this.showError(error);
        }
    },


    // ==========================================================
    // VALIDATE GEMINI RESPONSE
    // ==========================================================

    validateResponse(data) {

        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {
            return null;
        }

        const text = (key) => {

            return typeof data[key] === "string"
                ? data[key].trim()
                : "";
        };

        const responseJapanese =
            text("response_japanese");

        // Mandatory AI response
        if (!responseJapanese) {
            return null;
        }

        // ------------------------------------------------------
        // QUICK REPLIES
        // ------------------------------------------------------

        const replies =
            Array.isArray(data.replies)
                ? data.replies
                    .filter(
                        reply =>
                            reply &&
                            typeof reply === "object" &&
                            typeof reply.jp === "string" &&
                            reply.jp.trim()
                    )
                    .slice(0, 3)
                    .map(reply => ({
                        badge:
                            typeof reply.badge === "string" &&
                            reply.badge.trim()
                                ? reply.badge.trim()
                                : "💬 QUICK REPLY",

                        jp:
                            reply.jp.trim(),

                        romaji:
                            typeof reply.romaji === "string"
                                ? reply.romaji.trim()
                                : "",

                        sinhala:
                            typeof reply.sinhala === "string"
                                ? reply.sinhala.trim()
                                : "",

                        english:
                            typeof reply.english === "string"
                                ? reply.english.trim()
                                : ""
                    }))
                : [];

        return {

            heardJapanese:
                text("heard_japanese"),

            heardRomaji:
                text("heard_romaji"),

            heardSinhala:
                text("heard_sinhala"),

            heardEnglish:
                text("heard_english"),

            responseJapanese,

            responseRomaji:
                text("response_romaji"),

            responseSinhala:
                text("response_sinhala"),

            responseEnglish:
                text("response_english"),

            replies
        };
    },


    // ==========================================================
    // USER-FACING ERROR
    // ==========================================================

    showError(error) {

        const code =
            error?.message ||
            "UNKNOWN_ERROR";

        let message =
            "❌ Voice AI response failed. Please speak again.";

        switch (code) {

            case "TIMEOUT":
                message =
                    "⏱️ AI response timed out. Please speak again.";
                break;

            case "RATE_LIMIT":
                message =
                    "⚠️ AI limit reached. Please try again shortly.";
                break;

            case "API_KEY_INVALID":
                message =
                    "🔑 Gemini Worker configuration is invalid.";
                break;

            case "BAD_REQUEST":
                message =
                    "⚠️ AI request was rejected. Please try again.";
                break;

            case "SERVER_ERROR":
                message =
                    "☁️ AI server error. Please try again.";
                break;

            case "EMPTY_GEMINI_RESPONSE":
                message =
                    "🤖 AI returned no answer. Please speak again.";
                break;

            case "INVALID_GEMINI_RESPONSE":
            case "INVALID_GEMINI_JSON":
            case "INVALID_GEMINI_DATA":
                message =
                    "🤖 AI returned an invalid response. Please try again.";
                break;

            case "INVALID_VOICE_RESPONSE":
                message =
                    "🤖 AI response format was incomplete. Please try again.";
                break;

            case "WORKER_ENDPOINT_MISSING":
                message =
                    "⚙️ AI Worker configuration is missing.";
                break;

            default:
                console.warn(
                    "Unhandled Voice AI error:",
                    code
                );
                break;
        }

        App.Toast?.show?.(message);

        App.VoiceRenderer?.showError?.(
            message
        );
    }
};
