window.App = window.App || {};

App.CameraOCR = {

    isScanning: false,


    async scanFrame() {

        if (this.isScanning) {
            return;
        }


        const video =
            document.getElementById(
                "live-video"
            );

        const canvas =
            document.getElementById(
                "snapshot-canvas"
            );


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


        this.isScanning =
            true;


        this.showStatus(
            "🔍 Scanning Japanese text..."
        );


        try {

            let width =
                video.videoWidth;

            let height =
                video.videoHeight;


            const maxDimension =
                App.Config?.MAX_IMAGE_DIMENSION ||
                1280;


            if (
                width > maxDimension ||
                height > maxDimension
            ) {

                if (width >= height) {

                    height =
                        Math.round(
                            (
                                height *
                                maxDimension
                            ) /
                            width
                        );

                    width =
                        maxDimension;

                } else {

                    width =
                        Math.round(
                            (
                                width *
                                maxDimension
                            ) /
                            height
                        );

                    height =
                        maxDimension;
                }
            }


            canvas.width =
                width;

            canvas.height =
                height;


            const context =
                canvas.getContext(
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
                App.Prompts?.getVisionPrompt?.();


            if (!prompt) {

                throw new Error(
                    "VISION_PROMPT_UNAVAILABLE"
                );
            }


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
                typeof result !== "object" ||
                Array.isArray(result)
            ) {

                throw new Error(
                    "INVALID_VISION_RESULT"
                );
            }


            const finalResult = {

                japanese:
                    typeof result.japanese === "string"
                        ? result.japanese.trim()
                        : "",

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


            if (!finalResult.japanese) {

                this.clearResult();


                this.showStatus(
                    "No Japanese text detected. Point the camera at a Japanese sign, menu, label, or notice and scan again."
                );


                return;
            }


            if (
                !App.CameraRenderer ||
                typeof App.CameraRenderer.displayCard !==
                    "function"
            ) {

                throw new Error(
                    "CAMERA_RENDERER_UNAVAILABLE"
                );
            }


            App.CameraRenderer.displayCard(
                finalResult,
                false
            );


            this.showStatus(
                "✅ Japanese text detected."
            );

        } catch (error) {

            console.error(
                "Camera Vision Error:",
                error
            );


            const code =
                error?.message ||
                "UNKNOWN_ERROR";


            if (code === "TIMEOUT") {

                this.showStatus(
                    "⏱️ Vision AI timed out. Please scan again."
                );

            } else if (
                code === "RATE_LIMIT"
            ) {

                this.showStatus(
                    "⚠️ Gemini request limit reached. Please try again later."
                );

            } else if (
                code ===
                "SERVER_CONFIGURATION_ERROR"
            ) {

                this.showStatus(
                    "⚠️ Gemini API is not configured on Cloudflare Worker."
                );

            } else if (
                code === "BAD_REQUEST"
            ) {

                this.showStatus(
                    "⚠️ Gemini rejected the camera request."
                );

            } else if (
                code ===
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

            this.isScanning =
                false;
        }
    },


    showStatus(message) {

        const status =
            document.getElementById(
                "camera-status"
            );


        if (status) {

            status.textContent =
                message;

            status.classList.remove(
                "hidden"
            );
        }


        App.CameraEngine?.showStatus?.(
            message
        );
    },


    clearResult() {

        App.CameraRenderer?.clearCard?.();
    }
};
