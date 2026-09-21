window.App = window.App || {};

App.CameraEngine = {

    stream: null,

    facingMode: "environment",

    isStarting: false,

    isReady: false,

    torchSupported: false,

    startPromise: null,


    async init() {

        if (
            this.isReady &&
            this.stream
        ) {
            return true;
        }


        if (this.startPromise) {
            return this.startPromise;
        }


        const requestId =
            ++App.State.cameraRequestId;


        this.isStarting =
            true;


        this.startPromise =
            this._start(requestId);


        try {

            return await this.startPromise;

        } finally {

            this.startPromise =
                null;
        }
    },


    async _start(requestId) {

        const video =
            document.getElementById(
                "live-video"
            );


        if (!video) {

            this.showStatus(
                "Camera video element is missing."
            );

            this.isStarting =
                false;

            return false;
        }


        this._stopStreamOnly();


        this.isReady =
            false;


        this.showStatus(
            "Starting camera..."
        );


        let stream;


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


        try {

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {
                throw new Error(
                    "CAMERA_NOT_SUPPORTED"
                );
            }


            stream =
                await navigator.mediaDevices
                    .getUserMedia(
                        constraints
                    );

        } catch (error) {

            console.warn(
                "Primary camera request failed:",
                error
            );


            if (
                error?.name ===
                "OverconstrainedError"
            ) {

                stream =
                    await this.retryBasicCamera(
                        requestId
                    );

            } else {

                this.handleCameraError(
                    error
                );

                this.isStarting =
                    false;

                return false;
            }
        }


        /*
         * User navigated away while getUserMedia
         * was still waiting.
         */
        if (
            requestId !==
                App.State.cameraRequestId ||
            App.State.currentActiveView !==
                "camera"
        ) {

            stream
                ?.getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

            this.isStarting =
                false;

            return false;
        }


        if (!stream) {

            this.isStarting =
                false;

            return false;
        }


        this.stream =
            stream;

        App.State.mediaStream =
            stream;


        video.srcObject =
            stream;


        video.muted =
            true;

        video.playsInline =
            true;

        video.autoplay =
            true;


        try {

            await this.waitForVideoMetadata(
                video,
                6000
            );

            await video.play();

        } catch (error) {

            console.warn(
                "Video start warning:",
                error
            );
        }


        if (
            requestId !==
                App.State.cameraRequestId ||
            App.State.currentActiveView !==
                "camera"
        ) {

            this.stop(
                true
            );

            return false;
        }


        const track =
            stream.getVideoTracks()[0];


        const capabilities =
            track?.getCapabilities
                ? track.getCapabilities()
                : {};


        this.torchSupported =
            Boolean(
                capabilities?.torch
            );


        App.State.isTorchOn =
            false;


        this.isReady =
            true;

        this.isStarting =
            false;


        this.showStatus(
            "Camera ready — point at Japanese text."
        );


        setTimeout(
            () => {
                this.hideStatus();
            },
            1800
        );


        return true;
    },


    waitForVideoMetadata(
        video,
        timeoutMs
    ) {

        return new Promise(
            resolve => {

                if (
                    video.videoWidth > 0 &&
                    video.videoHeight > 0
                ) {
                    resolve();
                    return;
                }


                let finished =
                    false;


                const finish =
                    () => {

                        if (finished) {
                            return;
                        }

                        finished =
                            true;

                        video.removeEventListener(
                            "loadedmetadata",
                            finish
                        );

                        resolve();
                    };


                video.addEventListener(
                    "loadedmetadata",
                    finish,
                    {
                        once: true
                    }
                );


                setTimeout(
                    finish,
                    timeoutMs
                );
            }
        );
    },


    async retryBasicCamera(
        requestId
    ) {

        try {

            const stream =
                await navigator.mediaDevices
                    .getUserMedia({
                        video: true,
                        audio: false
                    });


            if (
                requestId !==
                    App.State.cameraRequestId ||
                App.State.currentActiveView !==
                    "camera"
            ) {

                stream
                    .getTracks()
                    .forEach(
                        track =>
                            track.stop()
                    );

                return null;
            }


            return stream;

        } catch (error) {

            this.handleCameraError(
                error
            );

            return null;
        }
    },


    stop(invalidate = true) {

        if (invalidate) {

            ++App.State.cameraRequestId;
        }


        this._stopStreamOnly();


        this.isStarting =
            false;

        this.isReady =
            false;

        this.torchSupported =
            false;

        App.State.isTorchOn =
            false;


        const video =
            document.getElementById(
                "live-video"
            );


        if (video) {

            try {
                video.pause();
            } catch {}


            video.srcObject =
                null;
        }
    },


    _stopStreamOnly() {

        const stream =
            this.stream ||
            App.State.mediaStream;


        if (stream) {

            stream
                .getTracks()
                .forEach(
                    track => {

                        try {
                            track.stop();
                        } catch {}
                    }
                );
        }


        this.stream =
            null;

        App.State.mediaStream =
            null;
    },


    async toggleFacing() {

        this.facingMode =
            this.facingMode ===
            "environment"
                ? "user"
                : "environment";


        App.State.useFacingMode =
            this.facingMode;


        this.stop(
            true
        );


        if (
            App.State.currentActiveView !==
            "camera"
        ) {
            return;
        }


        await this.init();
    },


    async toggleTorch() {

        const stream =
            this.stream ||
            App.State.mediaStream;


        const track =
            stream?.getVideoTracks?.()[0];


        if (!track) {

            this.showStatus(
                "Camera is not ready."
            );

            return;
        }


        const capabilities =
            track.getCapabilities
                ? track.getCapabilities()
                : {};


        if (!capabilities.torch) {

            this.showStatus(
                "Torch is not supported by this camera."
            );

            return;
        }


        try {

            const nextState =
                !App.State.isTorchOn;


            await track.applyConstraints({
                advanced: [
                    {
                        torch: nextState
                    }
                ]
            });


            App.State.isTorchOn =
                nextState;


            this.showStatus(
                nextState
                    ? "🔦 Torch ON"
                    : "🔦 Torch OFF"
            );


            setTimeout(
                () => {
                    this.hideStatus();
                },
                1200
            );

        } catch (error) {

            console.warn(
                "Torch error:",
                error
            );

            this.showStatus(
                "Torch could not be changed."
            );
        }
    },


    showStatus(message) {

        const status =
            document.getElementById(
                "camera-status"
            );


        if (!status) {
            return;
        }


        status.textContent =
            message;


        status.classList.remove(
            "hidden"
        );
    },


    hideStatus() {

        const status =
            document.getElementById(
                "camera-status"
            );


        if (status) {

            status.classList.add(
                "hidden"
            );
        }
    },


    handleCameraError(error) {

        console.error(
            "Camera error:",
            error
        );


        let message =
            "Unable to start camera.";


        switch (
            error?.name
        ) {

            case "NotAllowedError":
                message =
                    "📷 Camera permission was denied. Allow camera access and try again.";
                break;

            case "NotFoundError":
                message =
                    "📷 No camera was found on this device.";
                break;

            case "NotReadableError":
                message =
                    "📷 Camera is already being used by another application.";
                break;

            case "SecurityError":
                message =
                    "🔒 Camera requires a secure HTTPS connection.";
                break;

            case "CAMERA_NOT_SUPPORTED":
                message =
                    "📷 This browser does not support camera access.";
                break;
        }


        this.showStatus(
            message
        );

        App.Toast?.show?.(
            message
        );
    }
};
