window.App = window.App || {};

App.Schemas = {
    VOICE_RESPONSE_SCHEMA: {
        type: "OBJECT",
        properties: {
            heard_japanese: { type: "STRING" },
            heard_romaji: { type: "STRING" },
            heard_sinhala: { type: "STRING" },
            heard_english: { type: "STRING" },

            response_japanese: { type: "STRING" },
            response_romaji: { type: "STRING" },
            response_sinhala: { type: "STRING" },
            response_english: { type: "STRING" },

            replies: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        badge: { type: "STRING" },
                        jp: { type: "STRING" },
                        romaji: { type: "STRING" },
                        sinhala: { type: "STRING" },
                        english: { type: "STRING" }
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

        required: [
            "heard_japanese",
            "heard_romaji",
            "heard_sinhala",
            "heard_english",
            "response_japanese",
            "response_romaji",
            "response_sinhala",
            "response_english",
            "replies"
        ]
    },

    VISION_RESPONSE_SCHEMA: {
        type: "OBJECT",
        properties: {
            japanese: { type: "STRING" },
            romaji: { type: "STRING" },
            sinhala: { type: "STRING" },
            english: { type: "STRING" },
            guide: { type: "STRING" }
        },
        required: [
            "japanese",
            "romaji",
            "sinhala",
            "english",
            "guide"
        ]
    }
};
