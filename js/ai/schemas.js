window.App = window.App || {};

App.Schemas = {

    VOICE_RESPONSE_SCHEMA: {

        type: "OBJECT",

        properties: {

            japanese: {
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
            },

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

        required: [
            "japanese",
            "romaji",
            "sinhala",
            "english",
            "replies"
        ]
    }
};
