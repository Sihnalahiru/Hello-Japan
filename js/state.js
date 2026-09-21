window.App = window.App || {};

App.State = {

    /**
     * =========================================================
     * APPLICATION VIEW
     * =========================================================
     */

    currentActiveView: "hero",


    /**
     * =========================================================
     * API / WORKER STATE
     *
     * Gemini API key is handled by the Cloudflare Worker.
     * Browser should not contain the real Gemini secret.
     *
     * Kept temporarily for compatibility with the existing
     * apiModal.js until that module is removed.
     * =========================================================
     */

    userApiKey:
        localStorage.getItem(
            "SUHADA_GEMINI_API_KEY"
        ) || "",


    /**
     * =========================================================
     * CAMERA STATE
     * =========================================================
     */

    mediaStream: null,

    useFacingMode: "environment",

    isTorchOn: false,

    cameraRequestId: 0,

    currentArJapanese: "",


    /**
     * =========================================================
     * VOICE CONTEXT
     * =========================================================
     */

    activeVoiceContext: "daily",

    activeSpeakerLang: "ja-JP",


    /**
     * =========================================================
     * VOICE STATE MACHINE
     * =========================================================
     */

    VoiceState: {

        IDLE: "IDLE",

        STARTING: "STARTING",

        LISTENING: "LISTENING",

        PROCESSING: "PROCESSING",

        STOPPING: "STOPPING"
    },


    currentVoiceState: "IDLE",

    isContinuousListening: false,


    /**
     * =========================================================
     * VOICE RACE-CONDITION TRACKER
     * =========================================================
     */

    voiceRequestId: 0,


    /**
     * =========================================================
     * VOICE DEBOUNCE
     * =========================================================
     */

    lastTranscript: "",

    lastTranscriptTime: 0,


    /**
     * =========================================================
     * VOICE RESPONSE STATE
     *
     * These are intentionally empty.
     * No hard-coded/demo conversation.
     * =========================================================
     */

    currentVoiceTranscript: "",

    currentVoiceJapanese: "",

    currentVoiceRomaji: "",

    currentVoiceSinhala: "",

    currentVoiceEnglish: "",

    currentVoiceResponse: "",

    currentVoiceSuggestions: [],


    /**
     * =========================================================
     * CAMERA RESULT STATE
     *
     * Empty until Gemini Vision returns a real result.
     * =========================================================
     */

    currentCameraResult: {

        japanese: "",

        romaji: "",

        sinhala: "",

        english: "",

        guide: ""
    }

};
