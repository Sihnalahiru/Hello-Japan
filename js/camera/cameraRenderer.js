window.App = window.App || {};

App.CameraRenderer = {
    displayCard(data, autoSpeak = false) {
        document.getElementById('ar-jp').textContent = data.japanese || '';
        document.getElementById('ar-romaji').textContent = data.romaji ? `(${data.romaji})` : '';
        document.getElementById('ar-si').textContent = data.sinhala || '';
        document.getElementById('ar-en').textContent = data.english || '';
        document.getElementById('ar-guide').textContent = data.guide || '';
        App.State.currentArJapanese = data.japanese;
        
        if (autoSpeak && data.japanese) {
            App.VoiceTTS.speakText(data.japanese);
        }
    },

    speakArDetected() {
        if (App.State.currentArJapanese) App.VoiceTTS.speakText(App.State.currentArJapanese);
    }
};
