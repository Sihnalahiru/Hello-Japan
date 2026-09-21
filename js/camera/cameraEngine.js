window.App = window.App || {};

App.CameraEngine = {

    /**
     * =========================================================
     * CAMERA ENGINE
     * Real device camera only.
     * No demo / offline camera fallback.
     * =========================================================
     */

    isStarting: false,

    isReady: false,

    facingMode: "environment",

    stream: null,

    torchSupported: false,

    statusTimer: null,


    /**
     * =========================================================
     * INIT
     * =========================================================
     */

    async init() {

        const requestId =
            ++(App.State.cameraRequestId);

        const video =
            document.getElementById("live-video");

        if (!video) {

            console.error(
                "CameraEngine: #live-video not found."
            );

            return false;
        }


        if (
            this.isStarting &&
            this.isReady
        ) {

            return true;
        }


        this.isStarting = true;
        this.isReady = false;


        /*
         * Keep state-compatible facing mode.
         */

        if (
            App.State &&
            App.State.useFacingMode
        ) {

            this.facingMode =
                App.State.useFacingMode;

        } else {

            this.facingMode =
                this.facingMode ||
                "environment";

            if (App.State) {

                App.State.useFacingMode =
                    this.facingMode;
            }
        }


        /*
         * Stop previous stream first.
         */

        this.stop(false);


        this.showStatus(
            "📷 Starting camera..."
        );


        try {

            /*
             * Browser support check.
             */

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                throw new Error(
                    "CAMERA_API_UNAVAILABLE"
                );
            }


            /*
             * Camera constraints.
             *
             * Do not request an excessive resolution.
             * Gemini OCR does not need 4K.
             */

            const constraints = {

                audio: false,

                video: {

                    facingMode: {
                        ideal: this.facingMode
                    },

                    width: {
                        ideal: 1280,
                        max: 1920
                    },

                    height: {
                        ideal: 720,
                        max: 1080
                    }
                }
            };


            /*
             * Request real camera.
             */

            const stream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );


            /*
             * A newer camera request may have started
             * while this request was waiting.
             */

            if (
                requestId !==
                App.State.cameraRequestId
            ) {

                stream
                    .getTracks()
                    .forEach(track => track.stop());

                return false;
            }


            /*
             * Store stream.
             */

            this.stream = stream;

            if (App.State) {

                App.State.mediaStream =
                    stream;
            }


            /*
             * Attach stream to video.
             */

            video.srcObject =
                stream;


            /*
             * Important:
             * Wait until video metadata exists.
             */

            await this.waitForVideoReady(
                video
            );


            /*
             * Start playback.
             */

            try {

                await video.play();

            } catch (playError) {

                /*
                 * Some browsers may already be playing.
                 * If not, report it.
                 */

                if (
                    video.paused
                ) {

                    throw playError;
                }
            }


            /*
             * Check that the camera really produced
             * usable dimensions.
             */

            if (
                video.videoWidth <= 0 ||
                video.videoHeight <= 0
            ) {

                throw new Error(
                    "CAMERA_VIDEO_NOT_READY"
                );
            }


            /*
             * Check torch capability.
             */

            this.updateTorchCapability(
                stream
            );


            /*
             * Camera is ready.
             */

            this.isReady = true;
            this.isStarting = false;


            this.showStatus(
                "✅ Camera ready — point at Japanese text"
            );


            return true;

        } catch (error) {

            console.error(
                "CameraEngine.init error:",
                error
            );


            this.isReady = false;
            this.isStarting = false;


            /*
             * Clean failed stream.
             */

            this.stop(false);


            this.handleCameraError(
                error
            );


            return false;
        }
    },


    /**
     * =========================================================
     * WAIT FOR VIDEO METADATA
     * =========================================================
     */

    waitForVideoReady(video) {

        return new Promise(
            (resolve, reject) => {

                if (
                    video.readyState >= 2 &&
                    video.videoWidth > 0 &&
                    video.videoHeight > 0
                ) {

                    resolve();

                    return;
                }


                let finished = false;


                const cleanup = () => {

                    video.removeEventListener(
                        "loadedmetadata",
                        onReady
                    );

                    video.removeEventListener(
                        "canplay",
                        onReady
                    );

                    video.removeEventListener(
                        "error",
                        onError
                    );

                    clearTimeout(
                        timeout
                    );
                };


                const complete = () => {

                    if (finished) {
                        return;
                    }

                    finished = true;

                    cleanup();

                    resolve();
                };


                const fail = () => {

                    if (finished) {
                        return;
                    }

                    finished = true;

                    cleanup();

                    reject(
                        new Error(
                            "CAMERA_VIDEO_NOT_READY"
                        )
                    );
                };


                const onReady = () => {

                    if (
                        video.videoWidth > 0 &&
                        video.videoHeight > 0
                    ) {

                        complete();
                    }
                };


                const onError = () => {

                    fail();
                };


                const timeout =
                    setTimeout(
                        () => {

                            /*
                             * One final check before failing.
                             */

                            if (
                                video.videoWidth > 0 &&
                                video.videoHeight > 0
                            ) {

                                complete();

                            } else {

                                fail();
                            }

                        },
                        10000
                    );


                video.addEventListener(
                    "loadedmetadata",
                    onReady,
                    {
                        once: false
                    }
                );


                video.addEventListener(
                    "canplay",
                    onReady,
                    {
                        once: false
                    }
                );


                video.addEventListener(
                    "error",
                    onError,
                    {
                        once: false
                    );


                /*
                 * Force a metadata check in case the
                 * event already happened.
                 */

                setTimeout(
                    onReady,
                    100
                );
            }
        );
    },


    /**
     * =========================================================
     * UPDATE TORCH CAPABILITY
     * =========================================================
     */

    updateTorchCapability(stream) {

        this.torchSupported = false;


        const track =
            stream?.getVideoTracks?.()[0];


        if (!track) {
            return;
        }


        try {

            const capabilities =
                track.getCapabilities
                    ? track.getCapabilities()
                    : {};


            this.torchSupported =
                capabilities?.torch === true;

        } catch (error) {

            console.warn(
                "Torch capability check failed:",
                error
            );

            this.torchSupported = false;
        }
    },


    /**
     * =========================================================
     * STOP CAMERA
     * =========================================================
     */

    stop(showStatus = false) {

        this.isReady = false;
        this.isStarting = false;

        this.torchSupported = false;


        if (App.State) {

            App.State.isTorchOn = false;
        }


        /*
         * Stop internal stream.
         */

        if (this.stream) {

            try {

                this.stream
                    .getTracks()
                    .forEach(
                        track => {

                            try {

                                track.stop();

                            } catch (error) {

                                console.warn(
                                    "Camera track stop failed:",
                                    error
                                );
                            }
                        }
                    );

            } catch (error) {

                console.warn(
                    "Camera stream stop failed:",
                    error
                );
            }

            this.stream = null;
        }


        /*
         * Keep App.State synchronized.
         */

        if (App.State) {

            App.State.mediaStream =
                null;
        }


        /*
         * Detach video.
         */

        const video =
            document.getElementById(
                "live-video"
            );


        if (video) {

            try {

                video.pause();

            } catch (error) {
                // Ignore
            }


            video.srcObject =
                null;
        }


        if (showStatus) {

            this.showStatus(
                "Camera stopped"
            );
        }
    },


    /**
     * =========================================================
     * TOGGLE FRONT / BACK CAMERA
     * =========================================================
     */

    async toggleFacing() {

        const nextMode =
            this.getFacingMode() ===
            "environment"
                ? "user"
                : "environment";


        /*
         * Update state BEFORE starting the new request.
         */

        this.facingMode =
            nextMode;


        if (App.State) {

            App.State.useFacingMode =
                nextMode;
        }


        /*
         * Invalidate previous camera request.
         */

        if (App.State) {

            App.State.cameraRequestId =
                (App.State.cameraRequestId || 0) + 1;
        }


        this.stop(false);


        this.showStatus(
            nextMode === "environment"
                ? "📷 Switching to rear camera..."
                : "🤳 Switching to front camera..."
        );


        const success =
            await this.init();


        if (success) {

            App.Toast?.show?.(
                nextMode === "environment"
                    ? "Rear camera active"
                    : "Front camera active"
            );

        }
    },


    /**
     * =========================================================
     * GET CURRENT FACING MODE
     * =========================================================
     */

    getFacingMode() {

        if (
            App.State &&
            (
                App.State.useFacingMode ===
                    "environment" ||

                App.State.useFacingMode ===
                    "user"
            )
        ) {

            return App.State.useFacingMode;
        }


        return this.facingMode ||
            "environment";
    },


    /**
     * =========================================================
     * TOGGLE TORCH
     * =========================================================
     */

    async toggleTorch() {

        const stream =
            this.stream ||
            App.State?.mediaStream;


        if (!stream) {

            App.Toast?.show?.(
                "Camera is not ready"
            );

            return;
        }


        const track =
            stream.getVideoTracks?.()[0];


        if (!track) {

            App.Toast?.show?.(
                "Camera video track unavailable"
            );

            return;
        }


        let capabilities = {};


        try {

            capabilities =
                track.getCapabilities
                    ? track.getCapabilities()
                    : {};

        } catch (error) {

            console.warn(
                "Unable to read camera capabilities:",
                error
            );
        }


        if (
            !capabilities ||
            capabilities.torch !== true
        ) {

            App.Toast?.show?.(
                "Torch not supported on this device"
            );

            return;
        }


        const current =
            Boolean(
                App.State?.isTorchOn
            );


        const next =
            !current;


        try {

            await track.applyConstraints({

                advanced: [
                    {
                        torch: next
                    }
                ]

            });


            if (App.State) {

                App.State.isTorchOn =
                    next;
            }


            App.Toast?.show?.(
                next
                    ? "Torch ON"
                    : "Torch OFF"
            );

        } catch (error) {

            console.error(
                "Torch error:",
                error
            );


            if (App.State) {

                App.State.isTorchOn =
                    current;
            }


            App.Toast?.show?.(
                "Unable to control camera torch"
            );
        }
    },


    /**
     * =========================================================
     * STATUS MESSAGE
     * =========================================================
     */

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


            clearTimeout(
                this.statusTimer
            );


            this.statusTimer =
                setTimeout(
                    () => {

                        status.classList.add(
                            "hidden"
                        );

                    },
                    3500
                );
        }


        /*
         * Also use existing Toast system.
         */

        if (
            App.Toast &&
            typeof App.Toast.show ===
                "function"
        ) {

            App.Toast.show(
                message
            );
        }
    },


    /**
     * =========================================================
     * CAMERA ERROR HANDLER
     * =========================================================
     */

    handleCameraError(error) {

        const name =
            error?.name || "";


        const message =
            error?.message || "";


        console.error(
            "Camera error:",
            {
                name,
                message
            }
        );


        if (
            name ===
            "NotAllowedError"
        ) {

            this.showStatus(
                "🔒 Camera permission denied. Allow camera access and try again."
            );

            return;
        }


        if (
            name ===
            "PermissionDeniedError"
        ) {

            this.showStatus(
                "🔒 Camera permission denied. Allow camera access and try again."
            );

            return;
        }


        if (
            name ===
            "NotFoundError"
        ) {

            this.showStatus(
                "📷 No camera was found on this device."
            );

            return;
        }


        if (
            name ===
            "NotReadableError"
        ) {

            this.showStatus(
                "⚠️ Camera is busy or unavailable. Close other camera apps and try again."
            );

            return;
        }


        if (
            name ===
            "OverconstrainedError"
        ) {

            this.showStatus(
                "⚠️ Camera settings are not supported. Trying again..."
            );

            /*
             * Retry with the simplest possible camera
             * constraint.
             */

            this.retryBasicCamera();

            return;
        }


        if (
            name ===
            "SecurityError"
        ) {

            this.showStatus(
                "🔐 Camera access requires a secure HTTPS page."
            );

            return;
        }


        if (
            message ===
            "CAMERA_API_UNAVAILABLE"
        ) {

            this.showStatus(
                "⚠️ This browser does not support camera access."
            );

            return;
        }


        if (
            message ===
            "CAMERA_VIDEO_NOT_READY"
        ) {

            this.showStatus(
                "⚠️ Camera started but video is not ready. Please try again."
            );

            return;
        }


        this.showStatus(
            "❌ Camera could not start. Check permission and try again."
        );
    },


    /**
     * =========================================================
     * BASIC CAMERA RETRY
     * =========================================================
     */

    async retryBasicCamera() {

        /*
         * Prevent an immediate retry loop.
         */

        if (this.basicRetryRunning) {
            return;
        }


        this.basicRetryRunning =
            true;


        try {

            if (App.State) {

                App.State.cameraRequestId =
                    (App.State.cameraRequestId || 0) + 1;
            }


            this.stop(false);


            const video =
                document.getElementById(
                    "live-video"
                );


            if (!video) {
                return;
            }


            this.showStatus(
                "📷 Retrying camera..."
            );


            const stream =
                await navigator.mediaDevices.getUserMedia(
                    {
                        video: true,
                        audio: false
                    }
                );


            this.stream =
                stream;


            if (App.State) {

                App.State.mediaStream =
                    stream;
            }


            video.srcObject =
                stream;


            await this.waitForVideoReady(
                video
            );


            await video.play();


            this.updateTorchCapability(
                stream
            );


            this.isReady =
                true;


            this.showStatus(
                "✅ Camera ready"
            );

        } catch (error) {

            console.error(
                "Basic camera retry failed:",
                error
            );


            this.stop(false);


            this.showStatus(
                "❌ Camera retry failed. Please check browser permission."
            );

        } finally {

            this.basicRetryRunning =
                false;
        }
    }
};
