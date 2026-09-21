window.App = window.App || {};

App.CameraOCR = {

    isScanning: false,

    async scanFrame() {

        if (this.isScanning) {
            return;
        }

        const video = document.getElementById("live-video");
        const canvas = document.getElementById("snapshot-canvas");

        if (!video || !canvas) {
            this.showStatus(
                "Camera elements are unavailable."
            );
            return;
        }

        if (
            !video.srcObject ||
            video.readyState < 2 ||
            video.videoWidth <= 0 ||
            video.videoHeight <= 0
        ) {
            this.showStatus(
                "Camera is not ready. Please wait a moment and try again."
            );
            return;
        }

        this.isScanning = true;

        this.showStatus(
            "🔍 Scanning Japanese text..."
        );

        try {

            let width = video.videoWidth;
            let height = video.videoHeight;

            const maxDimension =
                App.Config?.MAX_IMAGE_DIMENSION || 1280;

            if (width > maxDimension || height > maxDimension) {

                if (width >= height) {

                    height = Math.round(
                        (height * maxDimension) / width
                    );

                    width = maxDimension;

                } else {

                    width = Math.round(
                        (width * maxDimension) / height
                    );

                    height = maxDimension;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext(
                "2d",
                {
                    alpha: false
                }
            );

            if (!context) {
                throw new Error(
                    "CANVAS_CONTEXT_UNAVAILABLE"
                );
            }

            context.drawImage(
                video,
                0,
                0,
                width,
                height
            );

            const imageData =
                canvas.toDataURL(
                    "image/jpeg",
                    0.82
                );

            const base64Data =
                imageData.split(",")[1];

            if (!base64Data) {
                throw new Error(
                    "IMAGE_CAPTURE_FAILED"
                );
            }

            const prompt =
                App.Prompts?.getVisionPrompt?.() ||
                `
You are a Japanese workplace vision assistant
for a person preparing to work in Japan.

Analyze ONLY the visible image.

Look carefully for Japanese text such as:

- signs
- menus
- hotel notices
- workplace instructions
- warnings
- labels
- room signs
- transportation signs
- customer-service phrases

Return ONLY valid JSON.

Required structure:

{
  "japanese": "",
  "romaji": "",
  "sinhala": "",
  "english": "",
  "guide": ""
}

Rules:

1. Read only Japanese text that is actually visible.
2. Do not invent text.
3. Preserve Japanese wording accurately.
4. Give natural Hepburn-style romaji.
5. Give a natural Sinhala meaning.
6. Give a clear English meaning.
7. Give a short practical Japanese workplace/travel explanation.
8. If no useful Japanese text is visible, return empty strings.
9. Do not return markdown.
`;

            const result =
                await App.Gemini.callContent(
                    {
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt
                                    },
                                    {
                                        inlineData: {
                                            mimeType:
                                                "image/jpeg",
                                            data:
                                                base64Data
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    App.Config?.OCR_TIMEOUT_MS ||
                        18000
                );

            if (
                !result ||
                typeof result !== "object"
            ) {
                throw new Error(
                    "INVALID_VISION_RESULT"
                );
            }

            const japanese =
                typeof result.japanese === "string"
                    ? result.japanese.trim()
                    : "";

            const romaji =
                typeof result.romaji === "string"
                    ? result.romaji.trim()
                    : "";

            const sinhala =
                typeof result.sinhala === "string"
                    ? result.sinhala.trim()
                    : "";

            const english =
                typeof result.english === "string"
                    ? result.english.trim()
                    : "";

            const guide =
                typeof result.guide === "string"
                    ? result.guide.trim()
                    : "";

            /*
             * IMPORTANT:
             * No offline/demo result is generated here.
             */

            if (!japanese) {

                this.showStatus(
                    "No Japanese text detected. Point the camera at a Japanese sign, menu, label, or notice and scan again."
                );

                this.clearResult();

                return;
            }

            const finalResult = {
                japanese,
                romaji,
                sinhala,
                english,
                guide
            };

            if (
                App.CameraRenderer &&
                typeof App.CameraRenderer.displayCard ===
                    "function"
            ) {

                App.CameraRenderer.displayCard(
                    finalResult,
                    false
                );

                this.showStatus(
                    "✅ Japanese text detected."
                );

            } else {

                throw new Error(
                    "CAMERA_RENDERER_UNAVAILABLE"
                );
            }

        } catch (error) {

            console.error(
                "Camera Vision Error:",
                error
            );

            const errorMessage =
                error?.message ||
                "UNKNOWN_ERROR";

            if (
                errorMessage === "TIMEOUT"
            ) {

                this.showStatus(
                    "⏱️ Vision AI timed out. Please scan again."
                );

            } else if (
                errorMessage === "API_KEY_INVALID"
            ) {

                this.showStatus(
                    "🔑 Gemini API key is invalid or unavailable."
                );

            } else if (
                errorMessage === "RATE_LIMIT"
            ) {

                this.showStatus(
                    "⚠️ Gemini request limit reached. Please try again later."
                );

            } else if (
                errorMessage ===
                "SERVER_CONFIGURATION_ERROR"
            ) {

                this.showStatus(
                    "⚠️ Gemini API is not configured on Cloudflare Worker."
                );

            } else if (
                errorMessage ===
                "ASSETS_BINDING_MISSING"
            ) {

                this.showStatus(
                    "⚠️ Cloudflare Worker asset configuration error."
                );

            } else if (
                errorMessage ===
                "CAMERA_RENDERER_UNAVAILABLE"
            ) {

                this.showStatus(
                    "⚠️ Camera result renderer is unavailable."
                );

            } else {

                this.showStatus(
                    "❌ Vision AI scan failed. Please try again."
                );
            }

        } finally {

            this.isScanning = false;
        }
    },


    showStatus(message) {

        if (
            App.Toast &&
            typeof App.Toast.show === "function"
        ) {

            App.Toast.show(message);
        }

        const hud =
            document.getElementById(
                "ar-side-hud"
            );

        if (!hud) {
            return;
        }

        /*
         * Do not overwrite an existing
         * successful AI result.
         *
         * Status is shown only temporarily
         * through Toast when a result exists.
         */

        const status =
            document.getElementById(
                "camera-scan-status"
            );

        if (status) {

            status.textContent = message;
        }
    },


    clearResult() {

        const jp =
            document.getElementById("ar-jp");

        const romaji =
            document.getElementById("ar-romaji");

        const si =
            document.getElementById("ar-si");

        const en =
            document.getElementById("ar-en");

        const guide =
            document.getElementById("ar-guide");

        if (jp) {
            jp.textContent =
                "No Japanese text detected";
        }

        if (romaji) {
            romaji.textContent = "";
        }

        if (si) {
            si.textContent =
                "කරුණාකර ජපන් text එකක් camera එකට පෙන්වා නැවත Scan කරන්න.";
        }

        if (en) {
            en.textContent =
                "Point the camera at Japanese text and scan again.";
        }

        if (guide) {
            guide.textContent =
                "Try a Japanese sign, hotel notice, menu, label, or workplace instruction.";
        }
    }
};
