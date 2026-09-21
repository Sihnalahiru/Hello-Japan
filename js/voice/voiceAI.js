window.App = window.App || {};

App.VoiceAI = {
    async handleSpokenVoice(heardText) {
        const transcript =
            typeof heardText === "string"
                ? heardText.trim()
                : "";

        if (!transcript) return;

        const requestId =
            ++App.State.voiceRequestId;

        App.State.currentVoiceTranscript =
            transcript;

        App.State.currentVoiceState =
            App.State.VoiceState.PROCESSING;

        App.VoiceRenderer?.showProcessing?.(transcript);

        try {
            const prompt =
                App.Prompts.getVoicePrompt(
                    App.State.activeVoiceContext,
                    App.State.activeSpeakerLang,
                    transcript
                );

            const result =
                await App.Gemini.callContent(
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

            if (
                requestId !==
                App.State.voiceRequestId
            ) {
                return;
            }

            const validated =
                this.validateResponse(result);

            if (!validated) {
                throw new Error(
                    "INVALID_VOICE_RESPONSE"
                );
            }

            App.State.currentVoiceJapanese =
                validated.heardJapanese;

            App.State.currentVoiceRomaji =
                validated.heardRomaji;

            App.State.currentVoiceSinhala =
                validated.heardSinhala;

            App.State.currentVoiceEnglish =
                validated.heardEnglish;

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

            App.VoiceRenderer?.renderConversation?.(
                validated
            );

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;

            if (
                validated.responseJapanese &&
                App.VoiceTTS &&
                typeof App.VoiceTTS.speakText === "function"
            ) {
                App.VoiceTTS.speakText(
                    validated.responseJapanese
                );
            }

        } catch (error) {
            if (
                requestId !==
                App.State.voiceRequestId
            ) {
                return;
            }

            console.error(
                "Voice AI error:",
                error
            );

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;

            this.showError(error);
        }
    },

    validateResponse(data) {
        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {
            return null;
        }

        const text = key =>
            typeof data[key] === "string"
                ? data[key].trim()
                : "";

        const heardJapanese =
            text("heard_japanese");

        const heardRomaji =
            text("heard_romaji");

        const heardSinhala =
            text("heard_sinhala");

        const heardEnglish =
            text("heard_english");

        const responseJapanese =
            text("response_japanese");

        const responseRomaji =
            text("response_romaji");

        const responseSinhala =
            text("response_sinhala");

        const responseEnglish =
            text("response_english");

        if (!responseJapanese) {
            return null;
        }

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
            heardJapanese,
            heardRomaji,
            heardSinhala,
            heardEnglish,

            responseJapanese,
            responseRomaji,
            responseSinhala,
            responseEnglish,

            replies
        };
    },

    showError(error) {
        const code =
            error?.message || "UNKNOWN_ERROR";

        let message =
            "❌ Voice AI response failed. Please speak again.";

        if (code === "TIMEOUT") {
            message =
                "⏱️ AI response timed out. Please speak again.";
        } else if (code === "RATE_LIMIT") {
            message =
                "⚠️ AI limit reached. Please try again shortly.";
        } else if (code === "API_KEY_INVALID") {
            message =
                "🔑 Gemini Worker configuration is invalid.";
        } else if (code === "BAD_REQUEST") {
            message =
                "⚠️ Gemini rejected the voice request.";
        }

        App.Toast?.show?.(message);

        App.VoiceRenderer?.showError?.(message);
    }
};
