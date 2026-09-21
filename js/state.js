window.App = window.App || {};

App.State = {
    currentActiveView: "hero",

    // CAMERA
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

    // VOICE
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

    voiceRequestId: 0,

    lastTranscript: "",
    lastTranscriptTime: 0,

    currentVoiceTranscript: "",

    currentVoiceJapanese: "",
    currentVoiceRomaji: "",
    currentVoiceSinhala: "",
    currentVoiceEnglish: "",

    currentVoiceResponseJapanese: "",
    currentVoiceResponseRomaji: "",
    currentVoiceResponseSinhala: "",
    currentVoiceResponseEnglish: "",

    currentVoiceSuggestions: []
};
