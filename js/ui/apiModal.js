window.App = window.App || {};

App.UI = {
    updateApiStatus() {
        const connected = Boolean(App.State.userApiKey.trim());
        const heroBtn = document.getElementById('api-key-btn-hero');
        if (heroBtn) {
            if (connected) heroBtn.classList.add('hidden');
            else heroBtn.classList.remove('hidden');
        }
    },

    toggleApiKeyModal() {
        const modal = document.getElementById('apikey-modal');
        const input = document.getElementById('gemini-key-input');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
            if (input) input.value = App.State.userApiKey;
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    },

    saveApiKeyModal() {
        const input = document.getElementById('gemini-key-input');
        if (!input) return;
        const val = input.value.trim();
        App.State.userApiKey = val;
        if (val) {
            localStorage.setItem('SUHADA_GEMINI_API_KEY', val);
            App.Toast.show("API Key Connected!");
        } else {
            localStorage.removeItem('SUHADA_GEMINI_API_KEY');
            App.Toast.show("API Key cleared");
        }
        this.updateApiStatus();
        this.toggleApiKeyModal();
    },

    clearApiKeyModal() {
        localStorage.removeItem('SUHADA_GEMINI_API_KEY');
        App.State.userApiKey = '';
        const input = document.getElementById('gemini-key-input');
        if (input) input.value = '';
        App.Toast.show("API Key reset");
        this.updateApiStatus();
    }
};
