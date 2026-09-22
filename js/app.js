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
    serviceWorker: null
};

window.App.Boot = Boot;


// ============================================================
// SAFE HELPERS
// ============================================================

function safeCall(name, fn) {
    try {
        if (typeof fn !== 'function') {
            console.warn(`[Hello Japan] ${name}: unavailable`);
            return undefined;
        }

        return fn();

    } catch (error) {
        console.error(`[Hello Japan] ${name} failed:`, error);
        return undefined;
    }
}


async function safeAsync(name, fn) {
    try {
        if (typeof fn !== 'function') {
            console.warn(`[Hello Japan] ${name}: unavailable`);
            return undefined;
        }

        return await fn();

    } catch (error) {
        console.error(`[Hello Japan] ${name} failed:`, error);
        return undefined;
    }
}


// ============================================================
// NAVIGATION
// ============================================================

function handleNavigation(target) {
    const route = target?.getAttribute('data-route');

    if (!route) {
        return;
    }

    safeCall(
        `Navigation: ${route}`,
        () => Navigation.switchView(route)
    );
}


// ============================================================
// CAMERA
// ============================================================

function handleCameraScan() {
    void safeAsync(
        'Camera OCR scan',
        () => CameraOCR.scanFrame()
    );
}


function handleFacingToggle() {
    void safeAsync(
        'Camera facing toggle',
        () => CameraEngine.toggleFacing()
    );
}


function handleTorchToggle() {
    void safeAsync(
        'Camera torch toggle',
        () => CameraEngine.toggleTorch()
    );
}


function handleARPronounce() {
    safeCall(
        'AR pronunciation',
        () => CameraRenderer.speakArDetected()
    );
}


// ============================================================
// VOICE
// ============================================================

function handleMic() {
    safeCall(
        'Voice listening toggle',
        () => VoiceEngine.toggleListening()
    );
}


function handleSpeaker(language) {
    safeCall(
        `Voice speaker: ${language}`,
        () => VoiceEngine.setSpeaker(language)
    );
}


function handleContext(target) {
    const context = target?.getAttribute('data-ctx');

    if (!context) {
        return;
    }

    safeCall(
        `Voice context: ${context}`,
        () => VoiceEngine.setContext(context)
    );
}


function handleVoiceReplay() {
    safeCall(
        'Voice replay',
        () => VoiceRenderer.replayDetected()
    );
}


// ============================================================
// CENTRAL EVENT DELEGATION
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
    // Camera
    // --------------------------------------------------------

    if (target.closest('#camera-scan-button')) {
        event.preventDefault();
        handleCameraScan();
        return;
    }


    if (target.closest('#btn-toggle-facing')) {
        event.preventDefault();
        handleFacingToggle();
        return;
    }


    if (target.closest('#btn-toggle-torch')) {
        event.preventDefault();
        handleTorchToggle();
        return;
    }


    if (target.closest('#btn-ar-pronounce')) {
        event.preventDefault();
        handleARPronounce();
        return;
    }


    // --------------------------------------------------------
    // Voice
    // --------------------------------------------------------

    if (target.closest('#mic-avatar-btn')) {
        event.preventDefault();
        handleMic();
        return;
    }


    if (target.closest('#btn-voice-replay')) {
        event.preventDefault();
        handleVoiceReplay();
        return;
    }


    if (target.closest('#btn-speaker-jp')) {
        event.preventDefault();
        handleSpeaker('ja-JP');
        return;
    }


    if (target.closest('#btn-speaker-si')) {
        event.preventDefault();
        handleSpeaker('si-LK');
        return;
    }


    if (target.closest('#btn-speaker-en')) {
        event.preventDefault();
        handleSpeaker('en-US');
        return;
    }


    // --------------------------------------------------------
    // Voice Context
    // --------------------------------------------------------

    const contextTarget =
        target.closest('[data-ctx]');

    if (contextTarget) {
        event.preventDefault();
        handleContext(contextTarget);
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
        safeCall(
            'Navigation clock',
            () => Navigation.tickClock()
        );
    };

    tick();

    Boot.clockTimer =
        window.setInterval(tick, 1000);
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
// TTS
// ============================================================

function initializeTTS() {

    safeCall(
        'Voice TTS',
        () => VoiceTTS.init()
    );
}


// ============================================================
// VOICE ENGINE
// ============================================================

function initializeVoiceEngine() {

    safeCall(
        'Voice Engine',
        () => VoiceEngine.init()
    );

    VoiceRenderer.updateSpeakerUI(
        State.activeSpeakerLang
    );

    VoiceRenderer.updateContextUI(
        State.activeVoiceContext
    );
}


// ============================================================
// STATE
// ============================================================

function initializeState() {

    safeCall(
        'State',
        () => State.init()
    );
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

        Boot.serviceWorker = registration;

        try {
            await registration.update();
        } catch (error) {
            console.warn(
                '[Hello Japan] Service Worker update check failed:',
                error
            );
        }

        console.log(
            '[Hello Japan] Service Worker active:',
            registration.scope
        );

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
}


// ============================================================
// CLEANUP
// ============================================================

function cleanupApplication() {

    if (Boot.clockTimer) {
        clearInterval(Boot.clockTimer);
        Boot.clockTimer = null;
    }

    safeCall(
        'Voice Engine cleanup',
        () => VoiceEngine.stop()
    );

    safeCall(
        'Voice TTS cleanup',
        () => VoiceTTS.stop()
    );

    safeCall(
        'Camera OCR cleanup',
        () => CameraOCR.cancel()
    );

    safeCall(
        'Camera cleanup',
        () => CameraEngine.stop(true)
    );
}


// ============================================================
// BOOT
// ============================================================

async function boot() {

    if (Boot.started) {
        return;
    }

    Boot.started = true;

    console.log(
        '🚀 Hello Japan AI booting...'
    );


    initializeErrorHandling();

    initializeState();

    initializeEvents();

    initializeClock();

    initializeAPI();

    initializeTTS();

    initializeVoiceEngine();

    await initializeServiceWorker();


    Boot.ready = true;

    console.log(
        '✅ Hello Japan AI initialized successfully.'
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
// PAGE LIFECYCLE
// ============================================================

window.addEventListener(
    'pagehide',
    cleanupApplication
);
