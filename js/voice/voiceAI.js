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


        /*
         * ==========================================
         * REQUEST ID
         * ==========================================
         *
         * If the user speaks again before an older
         * Gemini request finishes, the older result
         * will be ignored.
         */

        const currentReq =
            ++App.State.voiceRequestId;


        /*
         * Save transcript.
         */

        App.State.currentVoiceTranscript =
            transcript;


        /*
         * Do NOT create fake/offline conversation.
         * The UI will only receive a real Gemini result.
         */

        if (
            App.Toast &&
            typeof App.Toast.show === "function"
        ) {
            App.Toast.show(
                `Heard: "${transcript}"`
            );
        }


        /*
         * ==========================================
         * BUILD PROMPT
         * ==========================================
         */

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


        /*
         * ==========================================
         * CALL CLOUDFLARE WORKER → GEMINI
         * ==========================================
         */

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

            /*
             * Ignore an older request if a newer
             * speech request has already started.
             */

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


            const errorCode =
                error?.message ||
                "UNKNOWN_ERROR";


            if (
                errorCode === "TIMEOUT"
            ) {

                this.showVoiceError(
                    "⏱️ AI response timed out. Please speak again."
                );

            } else if (
                errorCode === "RATE_LIMIT"
            ) {

                this.showVoiceError(
                    "⚠️ AI request limit reached. Please try again shortly."
                );

            } else if (
                errorCode === "API_KEY_INVALID"
            ) {

                this.showVoiceError(
                    "🔑 Gemini service configuration is invalid."
                );

            } else if (
                errorCode ===
                "SERVER_CONFIGURATION_ERROR"
            ) {

                this.showVoiceError(
                    "⚠️ Gemini API is not configured on the Cloudflare Worker."
                );

            } else if (
                errorCode === "BAD_REQUEST"
            ) {

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


        /*
         * ==========================================
         * REQUEST STILL CURRENT?
         * ==========================================
         */

        if (
            currentReq !==
            App.State.voiceRequestId
        ) {
            return;
        }


        /*
         * ==========================================
         * VALIDATE GEMINI RESPONSE
         * ==========================================
         */

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
         * ==========================================
         * SAVE RESULT
         * ==========================================
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
         * ==========================================
         * RENDER REAL AI RESPONSE
         * ==========================================
         */

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
         * ==========================================
         * SPEAK AI RESPONSE
         * ==========================================
         *
         * Speak ONLY the actual AI-generated
         * Japanese response.
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
        }


        /*
         * Return engine to listening state.
         */

        if (
            App.State.isContinuousListening
        ) {

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;
        }
    },


    /*
     * ==========================================
     * RESPONSE VALIDATION
     * ==========================================
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


        /*
         * Japanese response is required.
         *
         * We do NOT invent a response if Gemini
         * fails to provide one.
         */

        if (!japanese) {
            return null;
        }


        /*
         * Replies must be an array.
         * If Gemini gives none, use an empty array.
         */

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
                .slice(0, 5)
                .map(reply => {

                    return {

                        badge:
                            typeof reply.badge ===
                                "string"
                                ? reply.badge.trim()
                                : "Suggested Reply",

                        jp:
                            reply.jp.trim(),

                        romaji:
                            typeof reply.romaji ===
                                "string"
                                ? reply.romaji.trim()
                                : "",

                        sinhala:
                            typeof reply.sinhala ===
                                "string"
                                ? reply.sinhala.trim()
                                : "",

                        english:
                            typeof reply.english ===
                                "string"
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
     * ==========================================
     * ERROR HANDLER
     * ==========================================
     *
     * IMPORTANT:
     * Never create fake/offline Japanese here.
     */

    showVoiceError(message) {

        console.warn(
            "Voice AI:",
            message
        );


        if (
            App.Toast &&
            typeof App.Toast.show === "function"
        ) {

            App.Toast.show(
                message
            );
        }


        /*
         * Clear the current suggestion cards.
         */

        if (
            App.VoiceRenderer &&
            typeof App.VoiceRenderer.renderSuggestions ===
                "function"
        ) {

            App.VoiceRenderer.renderSuggestions(
                []
            );
        }


        if (
            App.State.isContinuousListening
        ) {

            App.State.currentVoiceState =
                App.State.VoiceState.LISTENING;
        }
    }
};
