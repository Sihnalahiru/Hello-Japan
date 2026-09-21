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


        const currentReq =
            ++App.State.voiceRequestId;


        App.State.currentVoiceTranscript =
            transcript;


        App.Toast?.show?.(
            `Heard: "${transcript}"`
        );


        let prompt;


        try {

            if (
                !App.Prompts ||
                typeof App.Prompts.getVoicePrompt !==
                    "function"
            ) {

                throw new Error(
                    "VOICE_PROMPT_UNAVAILABLE"
                );
            }


            prompt =
                App.Prompts.getVoicePrompt(
                    App.State.activeVoiceContext,
                    App.State.activeSpeakerLang,
                    transcript
                );

        } catch (error) {

            console.error(
                "Voice prompt error:",
                error
            );

            this.showVoiceError(
                "Voice AI prompt is unavailable."
            );

            return;
        }


        let analysis;


        try {

            if (
                !App.Gemini ||
                typeof App.Gemini.callContent !==
                    "function"
            ) {

                throw new Error(
                    "GEMINI_CLIENT_UNAVAILABLE"
                );
            }


            analysis =
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

        } catch (error) {

            if (
                currentReq !==
                App.State.voiceRequestId
            ) {

                return;
            }


            console.error(
                "Gemini voice API error:",
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

            } else if (
                code === "API_KEY_INVALID"
            ) {

                this.showVoiceError(
                    "🔑 Gemini service configuration is invalid."
                );

            } else if (
                code ===
                "SERVER_CONFIGURATION_ERROR"
            ) {

                this.showVoiceError(
                    "⚠️ Gemini API is not configured on the Cloudflare Worker."
                );

            } else if (code === "BAD_REQUEST") {

                this.showVoiceError(
                    "⚠️ Gemini rejected the voice request."
                );

            } else {

                this.showVoiceError(
                    "❌ Voice AI response failed. Please try again."
                );
            }

            return;
        }


        if (
            currentReq !==
            App.State.voiceRequestId
        ) {

            return;
        }


        const validated =
            this.validateResponse(
                analysis
            );


        if (!validated) {

            console.error(
                "Invalid Voice AI response:",
                analysis
            );


            this.showVoiceError(
                "⚠️ AI returned an invalid voice response."
            );

            return;
        }


        /*
         * SAVE REAL RESULT
         */

        App.State.currentVoiceJapanese =
            validated.japanese;

        App.State.currentVoiceRomaji =
            validated.romaji;

        App.State.currentVoiceSinhala =
            validated.sinhala;

        App.State.currentVoiceEnglish =
            validated.english;

        App.State.currentVoiceResponse =
            validated.japanese;

        App.State.currentVoiceSuggestions =
            validated.replies;


        /*
         * RENDER
         */

        App.VoiceRenderer?.renderConversation?.(
            validated
        );


        /*
         * TTS.
         *
         * VoiceTTS will pause the microphone.
         * It will resume automatically after speech.
         */

        if (
            validated.japanese &&
            App.VoiceTTS &&
            typeof App.VoiceTTS.speakText ===
                "function"
        ) {

            try {

                App.VoiceTTS.speakText(
                    validated.japanese
                );

            } catch (error) {

                console.warn(
                    "Voice TTS notice:",
                    error
                );
            }

        } else if (
            App.State.isContinuousListening &&
            !App.VoiceEngine?.isPausedForSpeech
        ) {

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;
        }
    },


    /*
     * =========================================================
     * VALIDATE
     * =========================================================
     */

    validateResponse(data) {

        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {

            return null;
        }


        const japanese =
            typeof data.japanese === "string"
                ? data.japanese.trim()
                : "";


        const romaji =
            typeof data.romaji === "string"
                ? data.romaji.trim()
                : "";


        const sinhala =
            typeof data.sinhala === "string"
                ? data.sinhala.trim()
                : "";


        const english =
            typeof data.english === "string"
                ? data.english.trim()
                : "";


        if (!japanese) {
            return null;
        }


        const rawReplies =
            Array.isArray(data.replies)
                ? data.replies
                : [];


        const replies =
            rawReplies
                .filter(reply => {

                    return (
                        reply &&
                        typeof reply === "object" &&
                        typeof reply.jp === "string" &&
                        reply.jp.trim()
                    );

                })
                .slice(0, 3)
                .map(reply => {

                    return {

                        badge:
                            typeof reply.badge === "string"
                                ? reply.badge.trim()
                                : "Suggested Reply",

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
                    };
                });


        return {
            japanese,
            romaji,
            sinhala,
            english,
            replies
        };
    },


    /*
     * =========================================================
     * ERROR
     * =========================================================
     */

    showVoiceError(message) {

        console.warn(
            "Voice AI:",
            message
        );


        App.Toast?.show?.(
            message
        );


        App.VoiceRenderer?.renderSuggestions?.(
            []
        );


        if (
            App.State.isContinuousListening &&
            !App.VoiceEngine?.isPausedForSpeech
        ) {

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;
        }
    }
};
