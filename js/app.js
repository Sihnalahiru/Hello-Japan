import { Config } from './config.js';
import { State } from './state.js';
import { Toast } from './ui/toast.js';
import { UI } from './ui/apiModal.js';
import { Navigation } from './ui/navigation.js';

import { Schemas } from './ai/schemas.js';
import { Prompts } from './ai/prompts.js';
import { Gemini } from './ai/gemini.js';

import { CameraEngine } from './camera/cameraEngine.js';
import { CameraOCR } from './camera/cameraOCR.js';
import { CameraRenderer } from './camera/cameraRenderer.js';

import { VoiceTTS } from './voice/voiceTTS.js';
import { VoiceRenderer } from './voice/voiceRenderer.js';
import { VoiceAI } from './voice/voiceAI.js';
import { VoiceEngine } from './voice/voiceEngine.js';

// Global window.App binding for backwards compatibility with HTML inline onclick events
window.App = {
    Config,
    State,
    Toast,
    UI,
    Navigation,
    Schemas,
    Prompts,
    Gemini,
    CameraEngine,
    CameraOCR,
    CameraRenderer,
    VoiceTTS,
    VoiceRenderer,
    VoiceAI,
    VoiceEngine
};

window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Hello Japan AI initialized successfully in Full Modular ES6 Mode!");

    // Clock
    Navigation.tickClock();
    setInterval(() => Navigation.tickClock(), 1000);

    // API UI Status
    UI.updateApiStatus();

    // Voice Speech Synthesis
    VoiceTTS.init();

    // Service Worker
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
            .then(reg => console.log("Service Worker active:", reg.scope))
            .catch(err => console.warn("Service Worker error:", err));
    }
});
