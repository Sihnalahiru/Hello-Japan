import { State } from '../state.js';
import { Config } from '../config.js';
import { Gemini } from '../ai/gemini.js';
import { Prompts } from '../ai/prompts.js';
import { Schemas } from '../ai/schemas.js';
import { CameraRenderer } from './cameraRenderer.js';
import { CameraEngine } from './cameraEngine.js';

export const CameraOCR = {
    isScanning: false,
    scanRequestId: 0,

    async scanFrame() {
        if (this.isScanning || State.currentActiveView !== "camera") return;

        const video = document.getElementById("live-video");
        const canvas = document.getElementById("snapshot-canvas");

        if (!video || !canvas) {
            CameraEngine.showStatus("Camera elements missing.");
            return;
        }

        if (!video.srcObject || video.readyState < 2 || video.videoWidth <= 0) {
            CameraEngine.showStatus("📷 Camera is not ready yet.");
            return;
        }

        const requestId = ++this.scanRequestId;
        this.isScanning = true;

        const button = document.getElementById("camera-scan-button");
        if (button) {
            button.disabled = true;
            button.style.opacity = "0.55";
        }

        CameraEngine.showStatus("🔍 Scanning Japanese text...");

        try {
            let width = video.videoWidth;
            let height = video.videoHeight;
            const max = Config.MAX_IMAGE_DIMENSION || 1280;

            if (width > max || height > max) {
                if (width >= height) {
                    height = Math.round(height * max / width);
                    width = max;
                } else {
                    width = Math.round(width * max / height);
                    height = max;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d", { alpha: false });
            if (!ctx) throw new Error("CANVAS_CONTEXT_UNAVAILABLE");

            ctx.drawImage(video, 0, 0, width, height);
            const image = canvas.toDataURL("image/jpeg", 0.82);
            const base64 = image.split(",")[1];

            if (!base64) throw new Error("IMAGE_CAPTURE_FAILED");

            const result = await Gemini.callContent(
                {
                    contents: [
                        {
                            parts: [
                                { text: Prompts.getVisionPrompt() },
                                { inlineData: { mimeType: "image/jpeg", data: base64 } }
                            ]
                        }
                    ]
                },
                Config.OCR_TIMEOUT_MS || 18000,
                Schemas.VISION_RESPONSE_SCHEMA
            );

            if (requestId !== this.scanRequestId || State.currentActiveView !== "camera") return;

            const validated = this.validateResult(result);
            if (!validated) throw new Error("INVALID_VISION_RESULT");

            CameraRenderer.displayCard(validated, false);
            CameraEngine.showStatus(validated.japanese ? "✅ Japanese text detected." : "No readable text.");

            setTimeout(() => {
                if (requestId === this.scanRequestId) CameraEngine.hideStatus();
            }, 1800);

        } catch (error) {
            if (requestId !== this.scanRequestId) return;
            CameraEngine.showStatus("❌ Camera scan failed.");
        } finally {
            if (requestId === this.scanRequestId) {
                this.isScanning = false;
                if (button) {
                    button.disabled = false;
                    button.style.opacity = "";
                }
            }
        }
    },

    validateResult(data) {
        if (!data || typeof data !== "object") return null;
        return {
            japanese: typeof data.japanese === "string" ? data.japanese.trim() : "",
            romaji: typeof data.romaji === "string" ? data.romaji.trim() : "",
            sinhala: typeof data.sinhala === "string" ? data.sinhala.trim() : "",
            english: typeof data.english === "string" ? data.english.trim() : "",
            guide: typeof data.guide === "string" ? data.guide.trim() : ""
        };
    },

    cancel() {
        ++this.scanRequestId;
        this.isScanning = false;
        const button = document.getElementById("camera-scan-button");
        if (button) {
            button.disabled = false;
            button.style.opacity = "";
        }
    }
};
