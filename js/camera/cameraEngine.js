import { State } from '../state.js';
import { Toast } from '../ui/toast.js';
import { CameraRenderer } from './cameraRenderer.js';

export const CameraEngine = {
    stream: null,
    startPromise: null,
    isStarting: false,
    isReady: false,

    async init() {
        if (State.currentActiveView !== "camera") return false;
        if (this.isReady && this.stream) return true;
        if (this.startPromise) return this.startPromise;

        const requestId = ++State.cameraRequestId;
        this.isStarting = true;
        this.startPromise = this._start(requestId);

        try {
            return await this.startPromise;
        } finally {
            this.startPromise = null;
            this.isStarting = false;
        }
    },

    async _start(requestId) {
        const video = document.getElementById("live-video");
        if (!video) {
            this.showStatus("Camera video element is missing.");
            return false;
        }

        this._stopStream();
        this.isReady = false;
        this.showStatus("📷 Starting camera...");

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showStatus("Camera API is not supported.");
            return false;
        }

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: State.useFacingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
        } catch (error) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
            } catch (fallbackError) {
                this.handleError(fallbackError);
                return false;
            }
        }

        if (requestId !== State.cameraRequestId || State.currentActiveView !== "camera") {
            stream.getTracks().forEach(track => track.stop());
            return false;
        }

        this.stream = stream;
        State.mediaStream = stream;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        try { await video.play(); } catch (e) {}

        await this.waitForVideo(video);

        if (requestId !== State.cameraRequestId || State.currentActiveView !== "camera") {
            this._stopStream();
            return false;
        }

        this.isReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
        if (!this.isReady) {
            this.showStatus("Camera started but video is not ready.");
            return false;
        }

        this.showStatus("📷 Camera ready — point at Japanese text.");
        setTimeout(() => {
            if (State.currentActiveView === "camera") this.hideStatus();
        }, 1800);

        return true;
    },

    waitForVideo(video) {
        if (video.readyState >= 2 && video.videoWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
            let finished = false;
            const done = () => {
                if (finished) return;
                finished = true;
                video.removeEventListener("loadedmetadata", done);
                video.removeEventListener("canplay", done);
                resolve();
            };
            video.addEventListener("loadedmetadata", done, { once: true });
            video.addEventListener("canplay", done, { once: true });
            setTimeout(done, 2500);
        });
    },

    stop(clearVideo = true) {
        ++State.cameraRequestId;
        this._stopStream();
        this.isReady = false;
        this.isStarting = false;
        this.startPromise = null;
        State.isTorchOn = false;

        if (clearVideo) {
            const video = document.getElementById("live-video");
            if (video) {
                try { video.pause(); } catch {}
                video.srcObject = null;
            }
        }
    },

    _stopStream() {
        const stream = this.stream || State.mediaStream;
        if (stream) {
            stream.getTracks().forEach(track => { try { track.stop(); } catch {} });
        }
        this.stream = null;
        State.mediaStream = null;
    },

    toggleFacing() {
        if (State.currentActiveView !== "camera") return;
        State.useFacingMode = State.useFacingMode === "environment" ? "user" : "environment";
        this.stop(true);
        CameraRenderer.clearCard();
        this.init();
        Toast.show(State.useFacingMode === "environment" ? "📷 Rear camera" : "🤳 Front camera");
    },

    async toggleTorch() {
        const stream = this.stream || State.mediaStream;
        const track = stream?.getVideoTracks?.()[0];
        if (!track) {
            Toast.show("Camera is not ready.");
            return;
        }

        const capabilities = track.getCapabilities?.() || {};
        if (!capabilities.torch) {
            Toast.show("Torch not supported on this device.");
            return;
        }

        const next = !State.isTorchOn;
        try {
            await track.applyConstraints({ advanced: [{ torch: next }] });
            State.isTorchOn = next;
            Toast.show(next ? "🔦 Torch ON" : "🔦 Torch OFF");
        } catch (error) {
            Toast.show("Torch could not be changed.");
        }
    },

    showStatus(message) {
        const status = document.getElementById("camera-status");
        if (status) {
            status.textContent = message;
            status.classList.remove("hidden");
        }
    },

    hideStatus() {
        const status = document.getElementById("camera-status");
        if (status) {
            status.textContent = "";
            status.classList.add("hidden");
        }
    },

    handleError(error) {
        const name = error?.name || "";
        if (name === "NotAllowedError") {
            this.showStatus("🚫 Camera permission denied.");
        } else if (name === "NotFoundError") {
            this.showStatus("📷 No camera was found.");
        } else {
            this.showStatus("❌ Camera could not start.");
        }
    }
};
