window.App = window.App || {};

App.CameraEngine = {

    isStarting: false,

    isReady: false,

    facingMode: "environment",

    stream: null,

    torchSupported: false,

    statusTimer: null,

    basicRetryRunning: false,


    async init() {

        const requestId =
            ++App.State.cameraRequestId;


        const video =
            document.getElementById("live-video");


        if (!video) {

            console.error(
                "CameraEngine: #live-video not found."
            );

            return false;
        }


        if (this.isStarting) {
            return false;
        }


        if (this.isReady && this.stream) {
            return true;
        }


        this.isStarting = true;

        this.isReady = false;


        this.facingMode =
            App.State.useFacingMode ||
            this.facingMode ||
            "environment";


        this.stop(false);


        this.showStatus(
            "📷 Starting camera..."
        );


        try {

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                throw new Error(
                    "CAMERA_API_UNAVAILABLE"
                );
            }


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


            const stream =
                await navigator.mediaDevices.getUserMedia(
                    constraints
                );


            if (
                requestId !==
                App.State.cameraRequestId
            ) {

                stream
                    .getTracks()
                    .forEach(track => track.stop());

                return false;
            }


            this.stream =
                stream;


            App.State.mediaStream =
                stream;


            video.srcObject =
                stream;


            await this.waitForVideoReady(
                video
            );


            try {

                await video.play();

            } catch (error) {

                if (video.paused) {
                    throw error;
                }
            }


            if (
                video.videoWidth <= 0 ||
                video.videoHeight <= 0
            ) {

                throw new Error(
                    "CAMERA_VIDEO_NOT_READY"
                );
            }


            this.updateTorchCapability(
                stream
            );


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


            this.stop(false);

            this.handleCameraError(
                error
            );


            return false;
        }
    },


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

                    clearTimeout(timeout);
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
                    setTimeout(() => {

                        if (
                            video.videoWidth > 0 &&
                            video.videoHeight > 0
                        ) {

                            complete();

                        } else {

                            fail();
                        }

                    }, 10000);


                video.addEventListener(
                    "loadedmetadata",
                    onReady
                );

                video.addEventListener(
                    "canplay",
                    onReady
                );

                video.addEventListener(
                    "error",
                    onError
                );


                setTimeout(
                    onReady,
                    100
                );
            }
        );
    },


    updateTorchCapability(stream) {

        this.torchSupported =
            false;


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
        }
    },


    stop(showStatus = false) {

        this.isReady = false;

        this.isStarting = false;

        this.torchSupported = false;


        App.State.isTorchOn =
            false;


        if (this.stream) {

            try {

                this.stream
                    .getTracks()
                    .forEach(track => {

                        try {
                            track.stop();
                        } catch (error) {
                            console.warn(
                                "Camera track stop failed:",
                                error
                            );
                        }
                    });

            } catch (error) {

                console.warn(
                    "Camera stream stop failed:",
                    error
                );
            }


            this.stream = null;
        }


        App.State.mediaStream =
            null;


        const video =
            document.getElementById(
                "live-video"
            );


        if (video) {

            try {
                video.pause();
            } catch (error) {
                /* ignore */
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


    async toggleFacing() {

        const nextMode =
            this.getFacingMode() ===
            "environment"
                ? "user"
                : "environment";


        this.facingMode =
            nextMode;


        App.State.useFacingMode =
            nextMode;


        App.State.cameraRequestId++;


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


    getFacingMode() {

        if (
            App.State.useFacingMode ===
                "environment" ||
            App.State.useFacingMode ===
                "user"
        ) {

            return App.State.useFacingMode;
        }


        return this.facingMode ||
            "environment";
    },


    async toggleTorch() {

        const stream =
            this.stream ||
            App.State.mediaStream;


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
            capabilities?.torch !== true
        ) {

            App.Toast?.show?.(
                "Torch not supported on this device"
            );

            return;
        }


        const current =
            Boolean(
                App.State.isTorchOn
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


            App.State.isTorchOn =
                next;


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


            App.State.isTorchOn =
                current;


            App.Toast?.show?.(
                "Unable to control camera torch"
            );
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


            clearTimeout(
                this.statusTimer
            );


            this.statusTimer =
                setTimeout(() => {

                    status.classList.add(
                        "hidden"
                    );

                }, 3500);
        }


        App.Toast?.show?.(
            message
        );
    },


    handleCameraError(error) {

        const name =
            error?.name || "";


        const message =
            error?.message || "";


        if (
            name === "NotAllowedError" ||
            name === "PermissionDeniedError"
        ) {

            this.showStatus(
                "🔒 Camera permission denied. Allow camera access and try again."
            );

            return;
        }


        if (name === "NotFoundError") {

            this.showStatus(
                "📷 No camera was found on this device."
            );

            return;
        }


        if (name === "NotReadableError") {

            this.showStatus(
                "⚠️ Camera is busy or unavailable. Close other camera apps and try again."
            );

            return;
        }


        if (name === "OverconstrainedError") {

            this.showStatus(
                "⚠️ Camera settings are not supported. Trying basic camera..."
            );


            this.retryBasicCamera();

            return;
        }


        if (name === "SecurityError") {

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


    async retryBasicCamera() {

        if (this.basicRetryRunning) {
            return;
        }


        this.basicRetryRunning =
            true;


        try {

            App.State.cameraRequestId++;


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
                await navigator.mediaDevices.getUserMedia({

                    video: true,

                    audio: false
                });


            this.stream =
                stream;


            App.State.mediaStream =
                stream;


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
