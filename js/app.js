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

// Global window.App binding
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

// DIRECT EVENT DELEGATION (Guarantees button clicks work 100%)
document.addEventListener("click", (e) => {
    // 1. Navigation Routes
    const routeTarget = e.target.closest("[data-route]");
    if (routeTarget) {
        const route = routeTarget.getAttribute("data-route");
        if (route) Navigation.switchView(route);
        return;
    }

    // 2. Camera Controls
    if (e.target.closest("#camera-scan-button")) {
        CameraOCR.scanFrame();
        return;
    }
    if (e.target.closest("#btn-toggle-facing")) {
        CameraEngine.toggleFacing();
        return;
    }
    if (e.target.closest("#btn-toggle-torch")) {
        CameraEngine.toggleTorch();
        return;
    }
    if (e.target.closest("#btn-ar-pronounce")) {
        CameraRenderer.speakArDetected();
        return;
    }

    // 3. Voice Controls
    if (e.target.closest("#mic-avatar-btn")) {
        VoiceEngine.toggleListening();
        return;
    }
    if (e.target.closest("#btn-speaker-jp")) {
        VoiceEngine.setSpeaker('ja-JP');
        return;
    }
    if (e.target.closest("#btn-speaker-si")) {
        VoiceEngine.setSpeaker('si-LK');
        return;
    }
    if (e.target.closest("#btn-speaker-en")) {
        VoiceEngine.setSpeaker('en-US');
        return;
    }
    const ctxBtn = e.target.closest("[data-ctx]");
    if (ctxBtn) {
        const ctx = ctxBtn.getAttribute("data-ctx");
        VoiceEngine.setContext(ctx);
        return;
    }
});

window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Hello Japan AI initialized successfully in Full Modular Mode!");

    Navigation.tickClock();
    setInterval(() => Navigation.tickClock(), 1000);

    UI.updateApiStatus();
    VoiceTTS.init();

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
            .then(reg => console.log("Service Worker active:", reg.scope))
            .catch(err => console.warn("Service Worker error:", err));
    }
});
