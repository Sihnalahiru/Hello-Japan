window.App = window.App || {};

App.VoiceTTS = {
    speakText(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'ja-JP';
            u.rate = 0.92;

            const voices = window.speechSynthesis.getVoices();
            const jaVoice = voices.find(v => v.lang.toLowerCase().replace('_','-').startsWith('ja'));
            if (jaVoice) u.voice = jaVoice;

            window.speechSynthesis.speak(u);
        }
    },

    speakCurrentDetected() {
        const jp = document.getElementById('detected-japanese').textContent;
        if (jp && !jp.includes("⚠️")) this.speakText(jp);
    },

    speakReplyOption(jp) {
        this.speakText(jp);
        App.Toast.show(`Speaking: "${jp}"`);
    }
};
