window.App = window.App || {};

App.Schemas = {

    /*
     * ==========================================
     * LIVE VOICE RESPONSE SCHEMA
     * ==========================================
     *
     * This schema must stay synchronized with:
     *
     * js/ai/prompts.js
     * js/voice/voiceAI.js
     * js/voice/voiceRenderer.js
     *
     * Gemini must return ONLY this structure.
     */

    VOICE_RESPONSE_SCHEMA: {

        type: "OBJECT",

        properties: {

            /*
             * Main Japanese response / translation.
             */

            japanese: {
                type: "STRING"
            },


            /*
             * Hepburn-style romaji.
             */

            romaji: {
                type: "STRING"
            },


            /*
             * Sinhala explanation.
             */

            sinhala: {
                type: "STRING"
            },


            /*
             * English explanation.
             */

            english: {
                type: "STRING"
            },


            /*
             * User-selectable Japanese replies.
             *
             * The prompt allows 0–3 relevant replies.
             */

            replies: {

                type: "ARRAY",

                items: {

                    type: "OBJECT",

                    properties: {

                        badge: {
                            type: "STRING"
                        },

                        jp: {
                            type: "STRING"
                        },

                        romaji: {
                            type: "STRING"
                        },

                        sinhala: {
                            type: "STRING"
                        },

                        english: {
                            type: "STRING"
                        }
                    },

                    required: [
                        "badge",
                        "jp",
                        "romaji",
                        "sinhala",
                        "english"
                    ]
                }
            }
        },


        /*
         * Every top-level property is required.
         *
         * replies itself may contain zero items.
         */

        required: [
            "japanese",
            "romaji",
            "sinhala",
            "english",
            "replies"
        ]
    }
};
