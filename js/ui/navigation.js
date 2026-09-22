import { State } from '../state.js';

export const Navigation = {
    switchView(viewName) {
        const validViews = ["hero", "camera", "voice"];
        if (!validViews.includes(viewName)) return;

        const previous = State.currentActiveView;

        if (previous === "voice" && viewName !== "voice") {
            if (window.App?.VoiceEngine?.stop) window.App.VoiceEngine.stop();
        }

        if (previous === "camera" && viewName !== "camera") {
            if (window.App?.CameraOCR?.cancel) window.App.CameraOCR.cancel();
            if (window.App?.CameraEngine?.stop) window.App.CameraEngine.stop(true);
        }

        State.currentActiveView = viewName;

        document.querySelectorAll(".screen-view").forEach(view => {
            view.classList.remove("active");
        });

        const target = document.getElementById(`view-${viewName}`);
        if (target) target.classList.add("active");

        document.querySelectorAll(".nav-icon-btn").forEach(button => {
            const nav = button.dataset.nav;
            button.classList.toggle("text-emerald-700", nav === viewName);
            button.classList.toggle("text-gray-400", nav !== viewName);
        });

        if (viewName === "camera") {
            if (window.App?.CameraRenderer?.clearCard) window.App.CameraRenderer.clearCard();
            if (window.App?.CameraEngine?.init) window.App.CameraEngine.init();
        }

        if (viewName === "voice") {
            if (window.App?.VoiceRenderer?.clearConversation) window.App.VoiceRenderer.clearConversation();
        }
    },

    tickClock() {
        const clock = document.getElementById("hero-clock");
        if (!clock) return;
        const now = new Date();
        clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
};
