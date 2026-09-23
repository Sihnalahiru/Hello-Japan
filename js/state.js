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
    // CAMERA STATE
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
    // VOICE STATE
    //
    // IMPORTANT:
    // VoiceEngine owns the actual recognition lifecycle.
    // State stores the application-level state label only.
    // ========================================================

    VoiceState: {
        IDLE: 'IDLE',
        STARTING: 'STARTING',
        LISTENING: 'LISTENING',
        PROCESSING: 'PROCESSING',
        STOPPING: 'STOPPING'
    },

    currentVoiceState: 'IDLE',


    // ========================================================
    // VOICE REQUEST CONTROL
    //
    // Incremented whenever a new AI request supersedes
    // an older request.
    // ========================================================

    voiceRequestId: 0,


    // ========================================================
    // SPEECH RECOGNITION DATA
    //
    // VoiceEngine owns recognition.
    // State stores the latest recognized transcript only.
    // ========================================================

    lastTranscript: '',

    lastTranscriptTime: 0,

    currentVoiceTranscript: '',


    // ========================================================
    // CURRENT VOICE INTERPRETATION
    // ========================================================

    currentVoiceJapanese: '',

    currentVoiceRomaji: '',

    currentVoiceSinhala: '',

    currentVoiceEnglish: '',


    // ========================================================
    // CURRENT AI RESPONSE
    // ========================================================

    currentVoiceResponseJapanese: '',

    currentVoiceResponseRomaji: '',

    currentVoiceResponseSinhala: '',

    currentVoiceResponseEnglish: '',

    currentVoiceSuggestions: [],


    // ========================================================
    // INITIALIZATION
    // ========================================================

    init() {

        // ----------------------------------------------------
        // Application defaults
        // ----------------------------------------------------

        if (
            !this.currentActiveView ||
            typeof this.currentActiveView !== 'string'
        ) {
            this.currentActiveView = 'hero';
        }


        // ----------------------------------------------------
        // Voice context
        // ----------------------------------------------------

        if (
            !this.activeVoiceContext ||
            typeof this.activeVoiceContext !== 'string'
        ) {
            this.activeVoiceContext = 'daily';
        }


        // ----------------------------------------------------
        // Speaker language
        // ----------------------------------------------------

        if (
            !this.activeSpeakerLang ||
            typeof this.activeSpeakerLang !== 'string'
        ) {
            this.activeSpeakerLang = 'ja-JP';
        }


        // ----------------------------------------------------
        // Voice state
        // ----------------------------------------------------

        if (
            !this.currentVoiceState ||
            typeof this.currentVoiceState !== 'string'
        ) {
            this.currentVoiceState =
                this.VoiceState.IDLE;
        }


        // ----------------------------------------------------
        // Conversation history
        // ----------------------------------------------------

        if (
            !Array.isArray(this.conversationHistory)
        ) {
            this.conversationHistory = [];
        }


        // ----------------------------------------------------
        // Current suggestions
        // ----------------------------------------------------

        if (
            !Array.isArray(this.currentVoiceSuggestions)
        ) {
            this.currentVoiceSuggestions = [];
        }


        // ----------------------------------------------------
        // Request ID
        // ----------------------------------------------------

        if (
            !Number.isFinite(this.voiceRequestId)
        ) {
            this.voiceRequestId = 0;
        }


        // ----------------------------------------------------
        // Camera request ID
        // ----------------------------------------------------

        if (
            !Number.isFinite(this.cameraRequestId)
        ) {
            this.cameraRequestId = 0;
        }


        // ----------------------------------------------------
        // Camera facing mode
        // ----------------------------------------------------

        const validFacingModes = [
            'environment',
            'user'
        ];

        if (
            !validFacingModes.includes(
                this.useFacingMode
            )
        ) {
            this.useFacingMode =
                'environment';
        }


        // ----------------------------------------------------
        // Torch state
        // ----------------------------------------------------

        this.isTorchOn =
            Boolean(this.isTorchOn);


        // ----------------------------------------------------
        // Detection environment
        // ----------------------------------------------------

        if (
            typeof this.detectedEnvironment !== 'string'
        ) {
            this.detectedEnvironment =
                'Daily / Friendly';
        }

        this.detectedEnvironment =
            this.detectedEnvironment.trim() ||
            'Daily / Friendly';


        // ----------------------------------------------------
        // Transcript timestamp
        // ----------------------------------------------------

        if (
            !Number.isFinite(this.lastTranscriptTime)
        ) {
            this.lastTranscriptTime = 0;
        }
    }
};
