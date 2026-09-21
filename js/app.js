window.addEventListener('DOMContentLoaded', () => {
    // Clock startup
    App.Navigation.tickClock();
    setInterval(() => App.Navigation.tickClock(), 1000);

    // Initial Status UI
    App.UI.updateApiStatus();
    App.VoiceEngine.setSpeaker('ja-JP');

    // FIX: Show Clean IDLE State on Load (No fake pre-loaded speech)
    App.VoiceRenderer.renderConversation({
        japanese: "🎤 සවන්දෙමින් පවතී...",
        romaji: "Listening for Japanese / Sinhala speech...",
        sinhala: "කතා කරන්න හෝ Mic එක මත Tap කරන්න",
        english: "Start speaking or tap mic to generate live replies",
        replies: [] // Empty replies list until someone speaks
    });

    // Visibility Listener
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            App.VoiceEngine.stop();
            App.CameraEngine.stop();
        } else {
            if (App.State.currentActiveView === 'voice') App.VoiceEngine.start();
            if (App.State.currentActiveView === 'camera') App.CameraEngine.init();
        }
    });

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(e => console.log('PWA SW notice:', e));
    }

    App.Navigation.switchView('hero');
});
