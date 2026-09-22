// ============================================================
// Hello Japan AI
// js/state.js
// Central Application State
// ============================================================

export const State = {

    // ========================================================
    // APPLICATION / NAVIGATION
    // ========================================================

    currentActiveView: 'hero',

    // ========================================================
    // CAMERA
    // ========================================================

    mediaStream: null,

    useFacingMode: 'environment',

    isTorchOn: false,

    cameraRequestId: 0,

    currentArJapanese: '',

    currentCameraResult: {
        japanese: '',
        romaji: '',
        sinhala: '',
        english: '',
        guide: ''
    },

    // ========================================================
    // VOICE CONTEXT
    // ========================================================

    activeVoiceContext: 'daily',

    activeSpeakerLang: 'ja-JP',

    detectedEnvironment: 'Daily / Friendly',

    // ========================================================
    // VOICE CONVERSATION
    // ========================================================

    conversationHistory: [],

    lastVoiceResponse: null,

    selectedVoiceResponse: null,

    // ========================================================
    // VOICE STATE CONSTANTS
    // ========================================================

    VoiceState: {
        IDLE: 'IDLE',
        STARTING: 'STARTING',
        LISTENING: 'LISTENING',
        PROCESSING: 'PROCESSING',
        STOPPING: 'STOPPING'
    },

    currentVoiceState: 'IDLE',

    isContinuousListening: false,

    // ========================================================
    // VOICE REQUEST CONTROL
    // ========================================================

    voiceRequestId: 0,

    lastTranscript: '',

    lastTranscriptTime: 0,

    // ========================================================
    // CURRENT VOICE DATA
    // ========================================================

    currentVoiceTranscript: '',

    currentVoiceJapanese: '',

    currentVoiceRomaji: '',

    currentVoiceSinhala: '',

    currentVoiceEnglish: '',

    currentVoiceResponseJapanese: '',

    currentVoiceResponseRomaji: '',

    currentVoiceResponseSinhala: '',

    currentVoiceResponseEnglish: '',

    currentVoiceSuggestions: [],

    // ========================================================
    // OPTIONAL STATE INITIALIZER
    // ========================================================

    init() {
        this.currentVoiceState = this.VoiceState.IDLE;

        if (!this.activeVoiceContext) {
            this.activeVoiceContext = 'daily';
        }

        if (!this.activeSpeakerLang) {
            this.activeSpeakerLang = 'ja-JP';
        }

        if (!Array.isArray(this.conversationHistory)) {
            this.conversationHistory = [];
        }

        if (!Array.isArray(this.currentVoiceSuggestions)) {
            this.currentVoiceSuggestions = [];
        }
    },

    // Backward-compatible alias.
    initialize() {
        this.init();
    }
};
