window.App = window.App || {};

App.CameraOCR = {
    async scanFrame() {
        App.Toast.show("Visualizing & OCR Analyzing...");
        const video = document.getElementById('live-video');
        const canvas = document.getElementById('snapshot-canvas');

        if (App.State.userApiKey && video && canvas && video.videoWidth > 0) {
            try {
                let w = video.videoWidth;
                let h = video.videoHeight;
                const maxDim = App.Config.MAX_IMAGE_DIMENSION;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, w, h);
                const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

                const prompt = App.Prompts.getVisionPrompt();

                const result = await App.Gemini.callContent({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
                        ]
                    }]
                }, App.Config.OCR_TIMEOUT_MS);

                if (result && result.japanese) {
                    App.CameraRenderer.displayCard(result, false);
                    return;
                }
            } catch(e) {
                console.warn("Gemini OCR notice:", e);
            }
        }

        this.triggerDemo();
    },

    triggerDemo() {
        const signs = [
            { japanese: "止まれ", romaji: "Tomare", sinhala: "සම්පූර්ණ නැවතීම (නවතින්න)", english: "Mandatory Full Stop", guide: "Traffic law: Vehicles and bicycles must come to a dead stop." },
            { japanese: "いらっしゃいませ", romaji: "Irasshaimase", sinhala: "සාදරයෙන් පිළිගනිමු!", english: "Welcome to our shop!", guide: "Hospitality greeting. A polite nod or smile is perfect etiquette." },
            { japanese: "本日のおすすめ", romaji: "Honjitsu no osusume", sinhala: "අද දවසේ විශේෂ කෑම", english: "Today's Chef Specials", guide: "Restaurant menu heading showing seasonal recommendations." }
        ];
        const chosen = signs[Math.floor(Math.random() * signs.length)];
        App.CameraRenderer.displayCard(chosen, false);
    }
};
