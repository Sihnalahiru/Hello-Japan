window.addEventListener('DOMContentLoaded', () => {
    // Clock startup
    App.Navigation.tickClock();
    setInterval(() => App.Navigation.tickClock(), 1000);

    // Initial Status UI
    App.UI.updateApiStatus();
    App.VoiceEngine.setSpeaker('ja-JP');

    // Default Starting Conversation Render
    App.VoiceRenderer.renderConversation({
        japanese: "こんにちは！今日はお疲れ様でした。",
        romaji: "Konnichiwa! Kyou wa otsukaresama deshita.",
        sinhala: "හෙලෝ! අද දවසේ මහන්සි වුණාට බොහොම ස්තූතියි.",
        english: "Hello! Thank you for your hard work today.",
        replies: [
            { badge: "Polite Respect", jp: "お疲れ様でした！ありがとうございます", romaji: "Otsukaresama deshita! Arigatou gozaimasu", sinhala: "ඔබටත් බොහෝම ස්තූතියි!", english: "Thank you for your hard work too!" },
            { badge: "Workplace Keigo", jp: "こちらこそ、大変お世話になりました", romaji: "Kochira koso, taihen osewa ni narimashita", sinhala: "මා කෙරෙහි දැක්වූ උදව්වට බොහොම ස්තූතියි", english: "Thank you very much for your kind support" }
        ]
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
