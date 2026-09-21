window.App = window.App || {};

App.CameraEngine = {
    async init() {
        const currentReq = ++App.State.cameraRequestId;
        const video = document.getElementById('live-video');
        const fallback = document.getElementById('simulated-camera-bg');
        if (!video) return;

        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: App.State.useFacingMode }
                });

                if (currentReq !== App.State.cameraRequestId) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                App.State.mediaStream = stream;
                video.srcObject = App.State.mediaStream;
                video.play();
                if (fallback) fallback.classList.add('hidden');
            } else {
                throw new Error("Camera API unavailable");
            }
        } catch (err) {
            if (fallback) fallback.classList.remove('hidden');
        }
    },

    stop() {
        App.State.isTorchOn = false;
        if (App.State.mediaStream) {
            App.State.mediaStream.getTracks().forEach(t => t.stop());
            App.State.mediaStream = null;
        }
        const video = document.getElementById('live-video');
        if (video) video.srcObject = null;
    },

    toggleFacing() {
        App.State.useFacingMode = (App.State.useFacingMode === 'environment') ? 'user' : 'environment';
        this.stop();
        this.init();
        App.Toast.show(`Camera: ${App.State.useFacingMode}`);
    },

    toggleTorch() {
        if (!App.State.mediaStream) return;
        const track = App.State.mediaStream.getVideoTracks()[0];
        if (!track) return;
        const cap = track.getCapabilities ? track.getCapabilities() : {};
        if (cap.torch) {
            App.State.isTorchOn = !App.State.isTorchOn;
            track.applyConstraints({ advanced: [{ torch: App.State.isTorchOn }] }).then(() => {
                App.Toast.show(`Torch ${App.State.isTorchOn ? 'ON' : 'OFF'}`);
            }).catch(() => {
                App.State.isTorchOn = !App.State.isTorchOn;
            });
        } else {
            App.Toast.show("Torch not supported on device");
        }
    }
};
