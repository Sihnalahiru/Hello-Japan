window.App = window.App || {};

App.CameraOCR = {
    async scanFrame() {
        App.Toast.show("Visualizing & OCR Analyzing...");

        const video = document.getElementById("live-video");
        const canvas = document.getElementById("snapshot-canvas");

        // --------------------------------------------------
        // CAMERA VALIDATION
        // --------------------------------------------------
        if (!video || !canvas) {
            App.Toast.show("Camera elements are unavailable.");
            this.triggerDemo();
            return;
        }

        if (video.videoWidth <= 0 || video.videoHeight <= 0) {
            App.Toast.show("Camera frame is not ready.");
            this.triggerDemo();
            return;
        }

        // --------------------------------------------------
        // CAPTURE + RESIZE
        // --------------------------------------------------
        try {
            let w = video.videoWidth;
            let h = video.videoHeight;

            const maxDim =
                App.Config?.MAX_IMAGE_DIMENSION || 1280;

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

            const ctx = canvas.getContext("2d", {
                alpha: false
            });

            if (!ctx) {
                throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
            }

            ctx.drawImage(video, 0, 0, w, h);

            const dataUrl = canvas.toDataURL(
                "image/jpeg",
                0.8
            );

            const base64Data = dataUrl.split(",")[1];

            if (!base64Data) {
                throw new Error("IMAGE_CAPTURE_FAILED");
            }

            // --------------------------------------------------
            // VISION PROMPT
            // --------------------------------------------------
            const prompt =
                App.Prompts?.getVisionPrompt?.() ||
                `
You are a Japanese workplace and travel vision assistant.

Analyze the supplied image for visible Japanese text.

Return ONLY valid JSON with this structure:

{
  "japanese": "",
  "romaji": "",
  "sinhala": "",
  "english": "",
  "guide": ""
}

Rules:
- If Japanese text is visible, transcribe it accurately.
- Provide natural Hepburn-style romaji.
- Translate the meaning into Sinhala.
- Translate the meaning into English.
- Give a short practical cultural/workplace explanation.
- Do not invent text that is not visible.
- If no useful Japanese text is visible, return empty strings.
`;

            // --------------------------------------------------
            // GEMINI VIA CLOUDFLARE WORKER
            // --------------------------------------------------
            const result = await App.Gemini.callContent(
                {
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                },
                                {
                                    inlineData: {
                                        mimeType: "image/jpeg",
                                        data: base64Data
                                    }
                                }
                            ]
                        }
                    ]
                },
                App.Config?.OCR_TIMEOUT_MS || 18000
            );

            // --------------------------------------------------
            // VALIDATE GEMINI RESULT
            // --------------------------------------------------
            if (
                result &&
                typeof result === "object" &&
                typeof result.japanese === "string" &&
                result.japanese.trim()
            ) {
                const normalizedResult = {
                    japanese: result.japanese.trim(),
                    romaji:
                        typeof result.romaji === "string"
                            ? result.romaji.trim()
                            : "",
                    sinhala:
                        typeof result.sinhala === "string"
                            ? result.sinhala.trim()
                            : "",
                    english:
                        typeof result.english === "string"
                            ? result.english.trim()
                            : "",
                    guide:
                        typeof result.guide === "string"
                            ? result.guide.trim()
                            : ""
                };

                App.CameraRenderer.displayCard(
                    normalizedResult,
                    false
                );

                return;
            }

            throw new Error("NO_JAPANESE_TEXT_DETECTED");

        } catch (error) {
            console.warn(
                "Gemini OCR notice:",
                error
            );

            // --------------------------------------------------
            // USER-FRIENDLY ERROR
            // --------------------------------------------------
            const message =
                error?.message || "UNKNOWN_ERROR";

            if (message === "TIMEOUT") {
                App.Toast.show(
                    "Vision AI timed out. Please try again."
                );
            } else if (
                message === "API_KEY_INVALID"
            ) {
                App.Toast.show(
                    "Gemini API key is invalid."
                );
            } else if (
                message === "RATE_LIMIT"
            ) {
                App.Toast.show(
                    "Gemini limit reached. Please try again later."
                );
            } else if (
                message === "SERVER_CONFIGURATION_ERROR"
            ) {
                App.Toast.show(
                    "Gemini is not configured on Cloudflare."
                );
            } else {
                App.Toast.show(
                    "AI scan failed. Showing demo preview."
                );
            }

            // Demo fallback keeps the camera UI usable.
            this.triggerDemo();
        }
    },

    // --------------------------------------------------
    // DEMO / FALLBACK
    // --------------------------------------------------
    triggerDemo() {
        const signs = [
            {
                japanese: "止まれ",
                romaji: "Tomare",
                sinhala:
                    "සම්පූර්ණ නැවතීම (නවතින්න)",
                english:
                    "Mandatory Full Stop",
                guide:
                    "Traffic law: Vehicles and bicycles must come to a complete stop."
            },
            {
                japanese: "いらっしゃいませ",
                romaji: "Irasshaimase",
                sinhala:
                    "සාදරයෙන් පිළිගනිමු!",
                english:
                    "Welcome to our shop!",
                guide:
                    "A common Japanese hospitality greeting used when welcoming customers."
            },
            {
                japanese: "本日のおすすめ",
                romaji: "Honjitsu no osusume",
                sinhala:
                    "අද දවසේ විශේෂ කෑම",
                english:
                    "Today's Chef Specials",
                guide:
                    "A restaurant menu heading indicating recommended dishes for today."
            }
        ];

        const chosen =
            signs[
                Math.floor(
                    Math.random() * signs.length
                )
            ];

        if (
            App.CameraRenderer &&
            typeof App.CameraRenderer.displayCard ===
                "function"
        ) {
            App.CameraRenderer.displayCard(
                chosen,
                false
            );
        }
    }
};
