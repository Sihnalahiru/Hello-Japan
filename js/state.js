window.App = window.App || {};

App.State = {

    currentActiveView: "hero",

    /*
     * Gemini secret is NOT stored in the browser.
     * Cloudflare Worker handles authentication.
     */
    userApiKey: "",

    /*
     * CAMERA
     */
    mediaStream: null,

    useFacingMode: "environment",

    isTorchOn: false,

    cameraRequestId: 0,

    currentArJapanese: "",

    currentCameraResult: {
        japanese: "",
        romaji: "",
        sinhala: "",
        english: "",
        guide: ""
    },

    /*
     * VOICE
     */
    activeVoiceContext: "daily",

    activeSpeakerLang: "ja-JP",

    VoiceState: {
        IDLE: "IDLE",
        STARTING: "STARTING",
        LISTENING: "LISTENING",
        PROCESSING: "PROCESSING",
        STOPPING: "STOPPING"
    },

    currentVoiceState: "IDLE",

    isContinuousListening: false,

    /*
     * Prevent stale Gemini responses.
     */
    voiceRequestId: 0,

    /*
     * Prevent duplicate speech recognition results.
     */
    lastTranscript: "",

    lastTranscriptTime: 0,

    /*
     * REAL voice result only.
     */
    currentVoiceTranscript: "",

    currentVoiceJapanese: "",

    currentVoiceRomaji: "",

    currentVoiceSinhala: "",

    currentVoiceEnglish: "",

    currentVoiceResponse: "",

    currentVoiceSuggestions: []
};
