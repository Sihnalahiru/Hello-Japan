import { Config } from './config.js';
import { State } from './state.js';
import { Toast } from './ui/toast.js';
import { UI } from './ui/apiModal.js';
import { Navigation } from './ui/navigation.js';
import { Schemas } from './ai/schemas.js';
import { Prompts } from './ai/prompts.js';
import { Gemini } from './ai/gemini.js';

window.App = {
    Config,
    State,
    Toast,
    UI,
    Navigation,
    Schemas,
    Prompts,
    Gemini,
    CameraEngine: { toggleTorch: () => {}, toggleFacing: () => {} },
    CameraOCR: { scanFrame: () => {} },
    CameraRenderer: { speakArDetected: () => {} },
    VoiceEngine: { setSpeaker: () => {}, setContext: () => {}, toggleListening: () => {} },
    VoiceTTS: { speakCurrentDetected: () => {} }
};

window.addEventListener("DOMContentLoaded", () => {
    console.log("Hello Japan AI starting (Phase 2 ES6 Mode)...");
    
    Navigation.tickClock();
    setInterval(() => Navigation.tickClock(), 1000);
    UI.updateApiStatus();

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
            .then(reg => console.log("Service Worker registered:", reg.scope))
            .catch(err => console.warn("Service Worker registration failed:", err));
    }
});
