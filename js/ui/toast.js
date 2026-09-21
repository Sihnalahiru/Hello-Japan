window.App = window.App || {};

App.Toast = {
    toastTimer: null,
    show(message) {
        const toast = document.getElementById('toast');
        const text = document.getElementById('toast-text');
        if (!toast || !text) return;
        text.textContent = message;
        toast.classList.remove('hidden');
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
    }
};
