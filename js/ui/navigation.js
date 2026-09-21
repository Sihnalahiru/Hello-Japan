window.App = window.App || {};

App.Navigation = {
    switchView(viewName) {
        App.State.currentActiveView = viewName;
        
        document.querySelectorAll('.screen-view').forEach(v => v.classList.remove('active'));

        const target = document.getElementById(`view-${viewName}`);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-icon-btn').forEach(btn => {
            if (btn.dataset.nav === viewName) {
                btn.classList.add('text-emerald-700');
                btn.classList.remove('text-gray-400');
            } else {
                btn.classList.remove('text-emerald-700');
                btn.classList.add('text-gray-400');
            }
        });

        if (viewName === 'camera') App.CameraEngine.init();
        else App.CameraEngine.stop();

        if (viewName === 'voice') App.VoiceEngine.start();
        else App.VoiceEngine.stop();
    },

    tickClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const c1 = document.getElementById('hero-clock');
        if (c1) c1.textContent = timeStr;
    }
};
