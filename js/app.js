```javascript
// ============================================================
// Hello Japan AI
// js/app.js
// Main Application Bootstrap
// ============================================================

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


// ============================================================
// GLOBAL APP NAMESPACE
// ============================================================

window.App = window.App || {};

Object.assign(window.App, {
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
});


// ============================================================
// BOOT STATE
// ============================================================

const Boot = {
    started: false,
    ready: false,
    eventsBound: false,
    clockTimer: null,
    serviceWorker: null,
    errorHandlersBound: false
};

window.App.Boot = Boot;


// ============================================================
// SAFE HELPERS
// ============================================================

function safeCall(name, fn) {
    try {
        if (typeof fn !== 'function') {
            console.warn(
                `[Hello Japan] ${name}: unavailable`
            );
            return undefined;
        }

        return fn();

    } catch (error) {
        console.error(
            `[Hello Japan] ${name} failed:`,
            error
        );

        return undefined;
    }
}


async function safeAsync(name, fn) {
    try {
        if (typeof fn !== 'function') {
            console.warn(
                `[Hello Japan] ${name}: unavailable`
            );
            return undefined;
        }

        return await fn();

    } catch (error) {
        console.error(
            `[Hello Japan] ${name} failed:`,
            error
        );

        return undefined;
    }
}


// ============================================================
// NAVIGATION
// ============================================================

function handleNavigation(target) {
    const route =
        target?.getAttribute('data-route');

    if (!route) {
        return;
    }

    if (
        Navigation &&
        typeof Navigation.switchView === 'function'
    ) {
        safeCall(
            `Navigation: ${route}`,
            () => Navigation.switchView(route)
        );
    }
}


// ============================================================
// CAMERA
// ============================================================

function handleCameraScan() {
    if (
        CameraOCR &&
        typeof CameraOCR.scanFrame === 'function'
    ) {
        safeCall(
            'Camera OCR scan',
            () => CameraOCR.scanFrame()
        );
    }
}


function handleFacingToggle() {
    if (
        CameraEngine &&
        typeof CameraEngine.toggleFacing === 'function'
    ) {
        safeCall(
            'Camera facing toggle',
            () => CameraEngine.toggleFacing()
        );
    }
}


function handleTorchToggle() {
    if (
        CameraEngine &&
        typeof CameraEngine.toggleTorch === 'function'
    ) {
        safeCall(
            'Camera torch toggle',
            () => CameraEngine.toggleTorch()
        );
    }
}


function handleARPronounce() {
    if (
        CameraRenderer &&
        typeof CameraRenderer.speakArDetected === 'function'
    ) {
        safeCall(
            'AR pronunciation',
            () => CameraRenderer.speakArDetected()
        );
    }
}


// ============================================================
// VOICE
// ============================================================

function handleMic() {
    if (
        VoiceEngine &&
        typeof VoiceEngine.toggleListening === 'function'
    ) {
        safeCall(
            'Voice listening toggle',
            () => VoiceEngine.toggleListening()
        );
    }
}


function handleSpeaker(language) {
    if (
        VoiceEngine &&
        typeof VoiceEngine.setSpeaker === 'function'
    ) {
        safeCall(
            `Voice speaker: ${language}`,
            () => VoiceEngine.setSpeaker(language)
        );
    }
}


function handleContext(target) {
    const context =
        target?.getAttribute('data-ctx');

    if (!context) {
        return;
    }

    if (
        VoiceEngine &&
        typeof VoiceEngine.setContext === 'function'
    ) {
        safeCall(
            `Voice context: ${context}`,
            () => VoiceEngine.setContext(context)
        );
    }
}


// ============================================================
// CENTRAL DOCUMENT EVENT DELEGATION
// ============================================================

function handleDocumentClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
        return;
    }


    // --------------------------------------------------------
    // Navigation
    // --------------------------------------------------------

    const routeTarget =
        target.closest('[data-route]');

    if (routeTarget) {
        event.preventDefault();

        handleNavigation(routeTarget);

        return;
    }


    // --------------------------------------------------------
    // Camera scan
    // --------------------------------------------------------

    const cameraScanTarget =
        target.closest('#camera-scan-button');

    if (cameraScanTarget) {
        event.preventDefault();

        handleCameraScan();

        return;
    }


    // --------------------------------------------------------
    // Camera facing
    // --------------------------------------------------------

    const facingTarget =
        target.closest('#btn-toggle-facing');

    if (facingTarget) {
        event.preventDefault();

        handleFacingToggle();

        return;
    }


    // --------------------------------------------------------
    // Camera torch
    // --------------------------------------------------------

    const torchTarget =
        target.closest('#btn-toggle-torch');

    if (torchTarget) {
        event.preventDefault();

        handleTorchToggle();

        return;
    }


    // --------------------------------------------------------
    // AR pronunciation
    // --------------------------------------------------------

    const arTarget =
        target.closest('#btn-ar-pronounce');

    if (arTarget) {
        event.preventDefault();

        handleARPronounce();

        return;
    }


    // --------------------------------------------------------
    // Voice microphone
    // --------------------------------------------------------

    const micTarget =
        target.closest('#mic-avatar-btn');

    if (micTarget) {
        event.preventDefault();

        handleMic();

        return;
    }


    // --------------------------------------------------------
    // Voice speaker — Japanese
    // --------------------------------------------------------

    const japaneseSpeakerTarget =
        target.closest('#btn-speaker-jp');

    if (japaneseSpeakerTarget) {
        event.preventDefault();

        handleSpeaker('ja-JP');

        return;
    }


    // --------------------------------------------------------
    // Voice speaker — Sinhala
    // --------------------------------------------------------

    const sinhalaSpeakerTarget =
        target.closest('#btn-speaker-si');

    if (sinhalaSpeakerTarget) {
        event.preventDefault();

        handleSpeaker('si-LK');

        return;
    }


    // --------------------------------------------------------
    // Voice speaker — English
    // --------------------------------------------------------

    const englishSpeakerTarget =
        target.closest('#btn-speaker-en');

    if (englishSpeakerTarget) {
        event.preventDefault();

        handleSpeaker('en-US');

        return;
    }


    // --------------------------------------------------------
    // Voice context
    // --------------------------------------------------------

    const contextTarget =
        target.closest('[data-ctx]');

    if (contextTarget) {
        event.preventDefault();

        handleContext(contextTarget);

        return;
    }
}


// ============================================================
// EVENT INITIALIZATION
// ============================================================

function initializeEvents() {
    if (Boot.eventsBound) {
        return;
    }

    document.addEventListener(
        'click',
        handleDocumentClick,
        false
    );

    Boot.eventsBound = true;

    console.log(
        '[Hello Japan] Event delegation ready.'
    );
}


// ============================================================
// CLOCK
// ============================================================

function initializeClock() {
    if (Boot.clockTimer) {
        clearInterval(Boot.clockTimer);

        Boot.clockTimer = null;
    }

    const tick = () => {
        if (
            Navigation &&
            typeof Navigation.tickClock === 'function'
        ) {
            safeCall(
                'Navigation clock',
                () => Navigation.tickClock()
            );
        }
    };


    // Immediate clock update.
    tick();


    // Update every second.
    Boot.clockTimer =
        window.setInterval(
            tick,
            1000
        );
}


// ============================================================
// API STATUS
// ============================================================

function initializeAPI() {
    if (
        UI &&
        typeof UI.updateApiStatus === 'function'
    ) {
        safeCall(
            'API status',
            () => UI.updateApiStatus()
        );
    }
}


// ============================================================
// TEXT-TO-SPEECH
// ============================================================

function initializeTTS() {
    if (
        VoiceTTS &&
        typeof VoiceTTS.init === 'function'
    ) {
        safeCall(
            'Voice TTS',
            () => VoiceTTS.init()
        );
    }
}


// ============================================================
// VOICE ENGINE
// ============================================================

function initializeVoiceEngine() {
    if (
        !VoiceEngine ||
        typeof VoiceEngine.init !== 'function'
    ) {
        console.warn(
            '[Hello Japan] VoiceEngine.init unavailable.'
        );

        return false;
    }

    const result =
        safeCall(
            'Voice Engine',
            () => VoiceEngine.init()
        );

    if (result === false) {
        console.warn(
            '[Hello Japan] Voice Engine initialized but speech recognition is unavailable.'
        );

        return false;
    }

    console.log(
        '[Hello Japan] Voice Engine ready.'
    );

    return true;
}


// ============================================================
// STATE INITIALIZATION
// ============================================================

function initializeState() {
    try {
        if (
            State &&
            typeof State.init === 'function'
        ) {
            State.init();

            return true;
        }


        if (
            State &&
            typeof State.initialize === 'function'
        ) {
            State.initialize();

            return true;
        }


        console.log(
            '[Hello Japan] State module loaded.'
        );

        return true;

    } catch (error) {
        console.error(
            '[Hello Japan] State initialization failed:',
            error
        );

        return false;
    }
}


// ============================================================
// SERVICE WORKER
// ============================================================

async function initializeServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn(
            '[Hello Japan] Service Worker unsupported.'
        );

        return null;
    }


    try {
        const registration =
            await navigator.serviceWorker.register(
                './sw.js',
                {
                    updateViaCache: 'none'
                }
            );

        Boot.serviceWorker =
            registration;


        console.log(
            '[Hello Japan] Service Worker registered:',
            registration.scope
        );


        try {
            await registration.update();

        } catch (updateError) {
            console.warn(
                '[Hello Japan] Service Worker update check failed:',
                updateError
            );
        }


        return registration;

    } catch (error) {
        console.warn(
            '[Hello Japan] Service Worker registration failed:',
            error
        );

        return null;
    }
}


// ============================================================
// GLOBAL ERROR MONITORING
// ============================================================

function initializeErrorHandling() {
    if (Boot.errorHandlersBound) {
        return;
    }


    window.addEventListener(
        'error',
        (event) => {
            console.error(
                '[Hello Japan] Runtime error:',
                event.error || event.message
            );
        }
    );


    window.addEventListener(
        'unhandledrejection',
        (event) => {
            console.error(
                '[Hello Japan] Unhandled promise rejection:',
                event.reason
            );
        }
    );


    Boot.errorHandlersBound = true;
}


// ============================================================
// APPLICATION BOOT
// ============================================================

async function boot() {
    if (Boot.started) {
        return;
    }

    Boot.started = true;


    console.log(
        '🚀 Hello Japan AI booting...'
    );


    // --------------------------------------------------------
    // 1. Error monitoring
    // --------------------------------------------------------

    initializeErrorHandling();


    // --------------------------------------------------------
    // 2. Global document events
    // --------------------------------------------------------

    initializeEvents();


    // --------------------------------------------------------
    // 3. Application state
    // --------------------------------------------------------

    initializeState();


    // --------------------------------------------------------
    // 4. Navigation clock
    // --------------------------------------------------------

    initializeClock();


    // --------------------------------------------------------
    // 5. API status
    // --------------------------------------------------------

    initializeAPI();


    // --------------------------------------------------------
    // 6. TTS
    //
    // Must be initialized before VoiceEngine because
    // VoiceEngine can later coordinate with VoiceTTS.
    // --------------------------------------------------------

    initializeTTS();


    // --------------------------------------------------------
    // 7. Voice recognition
    //
    // THIS WAS MISSING FROM THE PREVIOUS APP.JS.
    // --------------------------------------------------------

    initializeVoiceEngine();


    // --------------------------------------------------------
    // 8. Service Worker
    // --------------------------------------------------------

    await initializeServiceWorker();


    // --------------------------------------------------------
    // READY
    // --------------------------------------------------------

    Boot.ready = true;


    console.log(
        '✅ Hello Japan AI initialized successfully.'
    );


    console.log(
        '[Hello Japan] Modules:',
        Object.keys(window.App)
    );
}


// ============================================================
// DOM READY
// ============================================================

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        () => {
            void boot();
        },
        {
            once: true
        }
    );

} else {
    void boot();
}


// ============================================================
// PAGE CLEANUP
// ============================================================

window.addEventListener(
    'pagehide',
    () => {

        // Stop application clock.
        if (Boot.clockTimer) {
            clearInterval(
                Boot.clockTimer
            );

            Boot.clockTimer = null;
        }


        // Stop voice recognition.
        if (
            VoiceEngine &&
            typeof VoiceEngine.stop === 'function'
        ) {
            try {
                VoiceEngine.stop();
            } catch (error) {
                console.warn(
                    '[Hello Japan] Voice cleanup failed:',
                    error
                );
            }
        }


        // Stop TTS.
        if (
            VoiceTTS &&
            typeof VoiceTTS.stop === 'function'
        ) {
            try {
                VoiceTTS.stop();
            } catch (error) {
                console.warn(
                    '[Hello Japan] TTS cleanup failed:',
                    error
                );
            }
        }


        // Stop camera.
        if (
            CameraEngine &&
            typeof CameraEngine.stop === 'function'
        ) {
            try {
                CameraEngine.stop(true);
            } catch (error) {
                console.warn(
                    '[Hello Japan] Camera cleanup failed:',
                    error
                );
            }
        }

    },
    {
        once: true
    }
);
```
