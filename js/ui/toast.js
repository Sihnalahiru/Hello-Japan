let toastTimer = null;

export const Toast = {
    show(message) {
        const toast = document.getElementById('toast');
        const text = document.getElementById('toast-text');
        if (!toast || !text) return;
        
        text.textContent = message;
        toast.classList.remove('hidden');
        
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
    }
};
