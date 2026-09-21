window.App = window.App || {};

App.CameraEngine = {
    stream: null,
    startPromise: null,
    isStarting: false,
    isReady: false,

    async init() {
        if (
            App.State.currentActiveView !==
            "camera"
        ) {
            return false;
        }

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

        this.isStarting = true;

        this.startPromise =
            this._start(requestId);

        try {
            return await this.startPromise;
        } finally {
            this.startPromise = null;
            this.isStarting = false;
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

            return false;
        }

        this._stopStream();

        this.isReady = false;

        this.showStatus(
            "📷 Starting camera..."
        );

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            this.showStatus(
                "Camera API is not supported."
            );

            return false;
        }

        let stream;

        try {
            stream =
                await navigator.mediaDevices
                    .getUserMedia({
                        audio: false,
                        video: {
                            facingMode: {
                                ideal:
                                    App.State.useFacingMode
                            },
                            width: {
                                ideal: 1280
                            },
                            height: {
                                ideal: 720
                            }
                        }
                    });
        } catch (error) {
            console.error(
                "Camera error:",
                error
            );

            try {
                stream =
                    await navigator.mediaDevices
                        .getUserMedia({
                            audio: false,
                            video: true
                        });
            } catch (fallbackError) {
                this.handleError(
                    fallbackError
                );

                return false;
            }
        }

        if (
            requestId !==
                App.State.cameraRequestId ||
            App.State.currentActiveView !==
                "camera"
        ) {
            stream
                .getTracks()
                .forEach(track =>
                    track.stop()
                );

            return false;
        }

        this.stream = stream;

        App.State.mediaStream =
            stream;

        video.srcObject =
            stream;

        video.muted = true;
        video.playsInline = true;

        try {
            await video.play();
        } catch (error) {
            console.warn(
                "Video play:",
                error
            );
        }

        await this.waitForVideo(video);

        if (
            requestId !==
                App.State.cameraRequestId ||
            App.State.currentActiveView !==
                "camera"
        ) {
            this._stopStream();
            return false;
        }

        this.isReady =
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0;

        if (!this.isReady) {
            this.showStatus(
                "Camera started but video is not ready."
            );

            return false;
        }

        const track =
            stream.getVideoTracks()[0];

        const capabilities =
            track?.getCapabilities?.() || {};

        this.torchSupported =
            Boolean(capabilities.torch);

        this.showStatus(
            "📷 Camera ready — point at Japanese text."
        );

        setTimeout(() => {
            if (
                App.State.currentActiveView ===
                "camera"
            ) {
                this.hideStatus();
            }
        }, 1800);

        return true;
    },

    waitForVideo(video) {
        if (
            video.readyState >= 2 &&
            video.videoWidth > 0
        ) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            let finished = false;

            const done = () => {
                if (finished) return;

                finished = true;

                video.removeEventListener(
                    "loadedmetadata",
                    done
                );

                video.removeEventListener(
                    "canplay",
                    done
                );

                resolve();
            };

            video.addEventListener(
                "loadedmetadata",
                done,
                { once: true }
            );

            video.addEventListener(
                "canplay",
                done,
                { once: true }
            );

            setTimeout(done, 2500);
        });
    },

    stop(clearVideo = true) {
        ++App.State.cameraRequestId;

        if (
            App.CameraOCR &&
            typeof App.CameraOCR.cancel ===
                "function"
        ) {
            App.CameraOCR.cancel();
        }

        this._stopStream();

        this.isReady = false;
        this.isStarting = false;
        this.startPromise = null;

        App.State.isTorchOn = false;

        if (clearVideo) {
            const video =
                document.getElementById(
                    "live-video"
                );

            if (video) {
                try {
                    video.pause();
                } catch {}

                video.srcObject = null;
            }
        }
    },

    _stopStream() {
        const stream =
            this.stream ||
            App.State.mediaStream;

        if (stream) {
            stream
                .getTracks()
                .forEach(track => {
                    try {
                        track.stop();
                    } catch {}
                });
        }

        this.stream = null;
        App.State.mediaStream = null;
    },

    toggleFacing() {
        if (
            App.State.currentActiveView !==
            "camera"
        ) {
            return;
        }

        App.State.useFacingMode =
            App.State.useFacingMode ===
            "environment"
                ? "user"
                : "environment";

        this.stop(true);

        App.CameraRenderer?.clearCard?.();

        this.init();

        App.Toast?.show?.(
            App.State.useFacingMode ===
                "environment"
                ? "📷 Rear camera"
                : "🤳 Front camera"
        );
    },

    async toggleTorch() {
        const stream =
            this.stream ||
            App.State.mediaStream;

        const track =
            stream?.getVideoTracks?.()[0];

        if (!track) {
            App.Toast?.show?.(
                "Camera is not ready."
            );
            return;
        }

        const capabilities =
            track.getCapabilities?.() || {};

        if (!capabilities.torch) {
            App.Toast?.show?.(
                "Torch not supported on this device."
            );
            return;
        }

        const next =
            !App.State.isTorchOn;

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
                    ? "🔦 Torch ON"
                    : "🔦 Torch OFF"
            );
        } catch (error) {
            console.warn(
                "Torch:",
                error
            );

            App.Toast?.show?.(
                "Torch could not be changed."
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
        }
    },

    hideStatus() {
        const status =
            document.getElementById(
                "camera-status"
            );

        if (status) {
            status.textContent = "";
            status.classList.add(
                "hidden"
            );
        }
    },

    handleError(error) {
        console.error(
            "Camera start failed:",
            error
        );

        const name =
            error?.name || "";

        if (
            name ===
            "NotAllowedError"
        ) {
            this.showStatus(
                "🚫 Camera permission denied. Allow Camera in Safari Settings."
            );
        } else if (
            name ===
            "NotFoundError"
        ) {
            this.showStatus(
                "📷 No camera was found."
            );
        } else if (
            name ===
            "NotReadableError"
        ) {
            this.showStatus(
                "📷 Camera is being used by another app."
            );
        } else {
            this.showStatus(
                "❌ Camera could not start."
            );
        }
    }
};
