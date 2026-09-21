window.App = window.App || {};

App.VoiceAI = {

    async handleSpokenVoice(heardText) {

        const transcript =
            typeof heardText === "string"
                ? heardText.trim()
                : "";

        if (!transcript) {
            return;
        }

        const currentRequest =
            ++App.State.voiceRequestId;

        App.State.currentVoiceTranscript =
            transcript;

        App.State.currentVoiceState =
            App.State.VoiceState.PROCESSING;


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

                    App.Config?.DEFAULT_TIMEOUT_MS ||
                    12000,

                    App.Schemas?.VOICE_RESPONSE_SCHEMA ||
                    null
                );


            /*
             * Ignore old Gemini response if the user
             * has already spoken again.
             */
            if (
                currentRequest !==
                App.State.voiceRequestId
            ) {
                return;
            }


            const validated =
                this.validateResponse(result);


            if (!validated) {

                console.error(
                    "Invalid voice response:",
                    result
                );

                this.showVoiceError(
                    "⚠️ AI response format was invalid."
                );

                return;
            }


            App.State.currentVoiceJapanese =
                validated.heard_japanese ||
                transcript;

            App.State.currentVoiceRomaji =
                validated.heard_romaji;

            App.State.currentVoiceSinhala =
                validated.heard_sinhala;

            App.State.currentVoiceEnglish =
                validated.heard_english;


            App.State.currentVoiceResponseJapanese =
                validated.response_japanese;

            App.State.currentVoiceResponseRomaji =
                validated.response_romaji;

            App.State.currentVoiceResponseSinhala =
                validated.response_sinhala;

            App.State.currentVoiceResponseEnglish =
                validated.response_english;


            if (
                App.VoiceRenderer &&
                typeof App.VoiceRenderer.renderConversation ===
                    "function"
            ) {

                App.VoiceRenderer.renderConversation(
                    validated
                );
            }


            /*
             * Speak the AI's suggested answer,
             * NOT merely the user's detected words.
             */
            if (
                validated.response_japanese &&
                App.VoiceTTS &&
                typeof App.VoiceTTS.speakText ===
                    "function"
            ) {

                App.VoiceTTS.speakText(
                    validated.response_japanese
                );
            }

        } catch (error) {

            if (
                currentRequest !==
                App.State.voiceRequestId
            ) {
                return;
            }

            console.error(
                "Voice AI error:",
                error
            );

            const code =
                error?.message ||
                "UNKNOWN_ERROR";


            if (code === "TIMEOUT") {

                this.showVoiceError(
                    "⏱️ AI response timed out. Please speak again."
                );

            } else if (code === "RATE_LIMIT") {

                this.showVoiceError(
                    "⚠️ AI request limit reached. Please try again shortly."
                );

            } else if (code === "API_KEY_INVALID") {

                this.showVoiceError(
                    "🔑 Gemini service configuration is invalid."
                );

            } else if (code === "BAD_REQUEST") {

                this.showVoiceError(
                    "⚠️ Gemini rejected the voice request."
                );

            } else if (
                code === "INVALID_GEMINI_RESPONSE" ||
                code === "EMPTY_GEMINI_RESPONSE" ||
                code === "INVALID_GEMINI_JSON" ||
                code === "INVALID_GEMINI_DATA"
            ) {

                this.showVoiceError(
                    "⚠️ Gemini returned an invalid response."
                );

            } else {

                this.showVoiceError(
                    "❌ Voice AI failed. Please speak again."
                );
            }

        } finally {

            if (
                currentRequest ===
                App.State.voiceRequestId
            ) {

                App.State.currentVoiceState =
                    App.State.isContinuousListening
                        ? App.State.VoiceState.LISTENING
                        : App.State.VoiceState.IDLE;
            }
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


        /*
         * New response format.
         */
        let heardJapanese =
            typeof data.heard_japanese === "string"
                ? data.heard_japanese.trim()
                : "";

        let heardRomaji =
            typeof data.heard_romaji === "string"
                ? data.heard_romaji.trim()
                : "";

        let heardSinhala =
            typeof data.heard_sinhala === "string"
                ? data.heard_sinhala.trim()
                : "";

        let heardEnglish =
            typeof data.heard_english === "string"
                ? data.heard_english.trim()
                : "";


        let responseJapanese =
            typeof data.response_japanese === "string"
                ? data.response_japanese.trim()
                : "";

        let responseRomaji =
            typeof data.response_romaji === "string"
                ? data.response_romaji.trim()
                : "";

        let responseSinhala =
            typeof data.response_sinhala === "string"
                ? data.response_sinhala.trim()
                : "";

        let responseEnglish =
            typeof data.response_english === "string"
                ? data.response_english.trim()
                : "";


        /*
         * Backward compatibility.
         */
        if (!heardJapanese && typeof data.japanese === "string") {
            heardJapanese = data.japanese.trim();
        }

        if (!heardRomaji && typeof data.romaji === "string") {
            heardRomaji = data.romaji.trim();
        }

        if (!heardSinhala && typeof data.sinhala === "string") {
            heardSinhala = data.sinhala.trim();
        }

        if (!heardEnglish && typeof data.english === "string") {
            heardEnglish = data.english.trim();
        }


        if (!heardJapanese && !App.State.currentVoiceTranscript) {
            return null;
        }


        const rawReplies =
            Array.isArray(data.replies)
                ? data.replies
                : [];


        const replies =
            rawReplies
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
                }));


        return {

            heard_japanese:
                heardJapanese ||
                App.State.currentVoiceTranscript,

            heard_romaji:
                heardRomaji,

            heard_sinhala:
                heardSinhala,

            heard_english:
                heardEnglish,

            response_japanese:
                responseJapanese,

            response_romaji:
                responseRomaji,

            response_sinhala:
                responseSinhala,

            response_english:
                responseEnglish,

            replies
        };
    },


    showVoiceError(message) {

        console.warn(
            "Voice AI:",
            message
        );


        if (
            App.Toast &&
            typeof App.Toast.show === "function"
        ) {
            App.Toast.show(message);
        }


        if (
            App.VoiceRenderer &&
            typeof App.VoiceRenderer.renderSuggestions ===
                "function"
        ) {
            App.VoiceRenderer.renderSuggestions([]);
        }


        if (
            App.State.isContinuousListening &&
            App.State.currentActiveView === "voice"
        ) {

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;
        }
    }
};
