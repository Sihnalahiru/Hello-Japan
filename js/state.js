window.App = window.App || {};

App.State = {
    currentActiveView: 'hero',
    userApiKey: localStorage.getItem('SUHADA_GEMINI_API_KEY') || '',
    mediaStream: null,
    useFacingMode: 'environment',
    activeVoiceContext: 'daily',
    currentArJapanese: '止まれ',
    activeSpeakerLang: 'ja-JP',
    isTorchOn: false,
    
    // Voice State Machine
    VoiceState: {
        IDLE: 'IDLE',
        STARTING: 'STARTING',
        LISTENING: 'LISTENING',
        PROCESSING: 'PROCESSING',
        STOPPING: 'STOPPING'
    },
    currentVoiceState: 'IDLE',
    isContinuousListening: false,
    
    // Race Condition Trackers
    voiceRequestId: 0,
    cameraRequestId: 0,
    
    // Debounce Trackers
    lastTranscript: '',
    lastTranscriptTime: 0
};
