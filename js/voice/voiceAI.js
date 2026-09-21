window.App = window.App || {};

App.VoiceAI = {
    async handleSpokenVoice(heardText) {
        const currentReq = ++App.State.voiceRequestId;
        App.Toast.show(`Heard: "${heardText}"`);

        let analysis = null;
        if (App.State.userApiKey) {
            try {
                const prompt = App.Prompts.getVoicePrompt(App.State.activeVoiceContext, App.State.activeSpeakerLang, heardText);
                const response = await App.Gemini.callContent({
                    contents: [{ parts: [{ text: prompt }] }]
                }, App.Config.DEFAULT_TIMEOUT_MS, App.Schemas.VOICE_RESPONSE_SCHEMA);

                if (response && typeof response.japanese === 'string' && Array.isArray(response.replies)) {
                    analysis = response;
                }
            } catch(e) {
                console.warn("Gemini voice API notice:", e);
                if (e.message === "API_KEY_INVALID") App.Toast.show("Invalid API Key!");
                else if (e.message === "RATE_LIMIT") App.Toast.show("Rate limit reached!");
                else if (e.message === "TIMEOUT") App.Toast.show("Network Timeout!");
            }
        }

        if (currentReq !== App.State.voiceRequestId) return;

        // Honest Offline State (P0 Fix)
        if (!analysis) {
            analysis = {
                japanese: (App.State.activeSpeakerLang === 'ja-JP') ? heardText : "⚠️ AI Offline",
                romaji: (App.State.activeSpeakerLang === 'ja-JP') ? "Speech recorded offline" : "Connect API Key for Live AI",
                sinhala: `සවන් දුන් දෙය: "${heardText}" (AI Offline)`,
                english: `Heard: "${heardText}" (API Key required for translation)`,
                replies: [
                    { badge: "Offline Note", jp: "はい、承知いたしました！", romaji: "Hai, shouchi itashimashita!", sinhala: "එසේය, මට තේරුණා! (Offline Preset)", english: "Yes, understood! (Offline Preset)" },
                    { badge: "Offline Note", jp: "ご親切にありがとうございます。", romaji: "Goshinsetsu ni arigatou gozaimasu.", sinhala: "ඔබට බොහොම ස්තූතියි! (Offline Preset)", english: "Thank you very much! (Offline Preset)" },
                    { badge: "Offline Note", jp: "もう一度お願いできますか？", romaji: "Mou ichido onegai dekimasu ka?", sinhala: "නැවත පවසන්න? (Offline Preset)", english: "Say again? (Offline Preset)" }
                ]
            };
        }

        App.VoiceRenderer.renderConversation(analysis);
    }
};
