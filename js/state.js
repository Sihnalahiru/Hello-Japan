window.App = window.App || {};

App.State = {

    /*
     * =========================================================
     * APPLICATION VIEW
     * =========================================================
     */

    currentActiveView: "hero",


    /*
     * =========================================================
     * CAMERA STATE
     * =========================================================
     */

    mediaStream: null,

    useFacingMode: "environment",

    isTorchOn: false,

    cameraRequestId: 0,

    currentArJapanese: "",


    /*
     * =========================================================
     * VOICE CONTEXT
     * =========================================================
     */

    activeVoiceContext: "daily",

    activeSpeakerLang: "ja-JP",


    /*
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


    /*
     * =========================================================
     * HANDS-FREE LISTENING
     * =========================================================
     *
     * true  = assistant should continue listening
     * false = user deliberately stopped it
     */

    isContinuousListening: false,


    /*
     * =========================================================
     * VOICE REQUEST RACE PROTECTION
     * =========================================================
     */

    voiceRequestId: 0,


    /*
     * =========================================================
     * DUPLICATE TRANSCRIPT PROTECTION
     * =========================================================
     */

    lastTranscript: "",

    lastTranscriptTime: 0,


    /*
     * =========================================================
     * CURRENT VOICE TRANSCRIPT
     * =========================================================
     */

    currentVoiceTranscript: "",


    /*
     * =========================================================
     * CURRENT AI RESPONSE
     * =========================================================
     */

    currentVoiceJapanese: "",

    currentVoiceRomaji: "",

    currentVoiceSinhala: "",

    currentVoiceEnglish: "",

    currentVoiceResponse: "",


    /*
     * =========================================================
     * AI SUGGESTED REPLIES
     * =========================================================
     */

    currentVoiceSuggestions: [],


    /*
     * =========================================================
     * CAMERA / VISION RESULT
     * =========================================================
     *
     * Empty until a real Gemini Vision scan succeeds.
     */

    currentCameraResult: {

        japanese: "",

        romaji: "",

        sinhala: "",

        english: "",

        guide: ""
    }

};
