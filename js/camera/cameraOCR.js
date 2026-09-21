window.App = window.App || {};

App.CameraOCR = {

    isScanning: false,

    scanRequestId: 0,


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
                "Camera is not ready. Please wait a moment."
            );

            return;
        }


        const requestId =
            ++this.scanRequestId;


        this.isScanning =
            true;


        const button =
            document.getElementById(
                "camera-scan-button"
            );


        if (button) {
            button.disabled =
                true;

            button.style.opacity =
                "0.55";
        }


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
                width >
                    maxDimension ||
                height >
                    maxDimension
            ) {

                if (
                    width >= height
                ) {

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
                    18000,

                    App.Schemas?.VISION_RESPONSE_SCHEMA ||
                    null
                );


            if (
                requestId !==
                this.scanRequestId
            ) {
                return;
            }


            const validated =
                this.validateResult(
                    result
                );


            if (!validated) {

                throw new Error(
                    "INVALID_VISION_RESULT"
                );
            }


            App.CameraRenderer?.displayCard?.(
                validated,
                false
            );


            if (
                validated.japanese
            ) {

                this.showStatus(
                    "✅ Japanese text detected."
                );

            } else {

                this.showStatus(
                    "No readable Japanese text detected."
                );
            }


            setTimeout(
                () => {

                    if (
                        requestId ===
                        this.scanRequestId
                    ) {

                        this.hideStatus();
                    }

                },
                1800
            );


        } catch (error) {

            if (
                requestId !==
                this.scanRequestId
            ) {
                return;
            }


            console.error(
                "Camera OCR error:",
                error
            );


            const code =
                error?.message ||
                "UNKNOWN_ERROR";


            if (code === "TIMEOUT") {

                this.showStatus(
                    "⏱️ Vision AI timed out. Try again."
                );

            } else if (
                code === "RATE_LIMIT"
            ) {

                this.showStatus(
                    "⚠️ AI limit reached. Try again shortly."
                );

            } else if (
                code === "BAD_REQUEST"
            ) {

                this.showStatus(
                    "⚠️ Vision request was rejected."
                );

            } else {

                this.showStatus(
                    "❌ Camera scan failed. Try again."
                );
            }

        } finally {

            if (
                requestId ===
                this.scanRequestId
            ) {

                this.isScanning =
                    false;


                if (button) {

                    button.disabled =
                        false;

                    button.style.opacity =
                        "";
                }
            }
        }
    },


    validateResult(data) {

        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {
            return null;
        }


        return {

            japanese:
                typeof data.japanese === "string"
                    ? data.japanese.trim()
                    : "",

            romaji:
                typeof data.romaji === "string"
                    ? data.romaji.trim()
                    : "",

            sinhala:
                typeof data.sinhala === "string"
                    ? data.sinhala.trim()
                    : "",

            english:
                typeof data.english === "string"
                    ? data.english.trim()
                    : "",

            guide:
                typeof data.guide === "string"
                    ? data.guide.trim()
                    : ""
        };
    },


    cancel() {

        ++this.scanRequestId;

        this.isScanning =
            false;


        const button =
            document.getElementById(
                "camera-scan-button"
            );


        if (button) {

            button.disabled =
                false;

            button.style.opacity =
                "";
        }
    },


    showStatus(message) {

        if (
            App.CameraEngine &&
            typeof App.CameraEngine.showStatus ===
                "function"
        ) {

            App.CameraEngine.showStatus(
                message
            );

            return;
        }


        App.Toast?.show?.(
            message
        );
    },


    hideStatus() {

        App.CameraEngine?.hideStatus?.();
    }
};
