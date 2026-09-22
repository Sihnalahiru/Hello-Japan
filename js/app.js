import { Config } from './config.js';
import { State } from './state.js';
import { Toast } from './ui/toast.js';
import { UI } from './ui/apiModal.js';

// තාවකාලිකව HTML onclick වැඩ කිරීමට (Backwards compatibility)
window.App = {
    Config,
    State,
    Toast,
    UI,
    Navigation: {
        switchView: (viewName) => {
            // අපි Phase 2 වලදී සම්පූර්ණ Navigation එක මෙතනට ගේනවා. 
            // දැනට පරණ navigation එක පාවිච්චි කරන්න බැරි නිසා මේක empty කරලා තියෙන්නේ.
            // HTML එක run කරද්දී podi error එකක් එයි, ඒක අපි ඊළඟට හදනවා.
            console.log("Switch View: ", viewName);
            Toast.show("Navigation logic is updating...");
        },
        tickClock: () => {
            const clock = document.getElementById("hero-clock");
            if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        }
    },
    CameraEngine: { toggleTorch: () => {}, toggleFacing: () => {} },
    CameraOCR: { scanFrame: () => {} },
    CameraRenderer: { speakArDetected: () => {} },
    VoiceEngine: { setSpeaker: () => {}, setContext: () => {}, toggleListening: () => {} },
    VoiceTTS: { speakCurrentDetected: () => {} }
};

window.addEventListener("DOMContentLoaded", () => {
    console.log("Hello Japan AI starting (ES6 Mode)...");
    
    // UI Initializers
    App.Navigation.tickClock();
    setInterval(() => App.Navigation.tickClock(), 1000);
    App.UI.updateApiStatus();

    // Service Worker
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
            .then(reg => console.log("Service Worker registered:", reg.scope))
            .catch(err => console.warn("Service Worker registration failed:", err));
    }
});
