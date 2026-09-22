export const State = {
    currentActiveView: "hero",

    // CAMERA STATE
    mediaStream: null,
    useFacingMode: "environment",
    isTorchOn: false,
    cameraRequestId: 0,
    currentArJapanese: "",
    currentCameraResult: {
        japanese: "", romaji: "", sinhala: "", english: "", guide: ""
    },

    // VOICE STATE & CONVERSATION HISTORY THREAD
    activeVoiceContext: "daily",
    activeSpeakerLang: "ja-JP",
    detectedEnvironment: "Daily / Friendly",
    conversationHistory: [], // Full scrollable thread (Latest items stored first)

    VoiceState: {
        IDLE: "IDLE", STARTING: "STARTING", LISTENING: "LISTENING",
        PROCESSING: "PROCESSING", STOPPING: "STOPPING"
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
