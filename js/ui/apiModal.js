window.App = window.App || {};

App.UI = {
    updateApiStatus() {
        const button =
            document.getElementById(
                "api-key-btn-hero"
            );

        const status =
            document.getElementById(
                "api-status-hero"
            );

        if (button) {
            button.classList.add(
                "hidden"
            );
        }

        if (status) {
            status.textContent =
                "AI Connected";
        }
    },

    toggleApiKeyModal() {
        const modal =
            document.getElementById(
                "apikey-modal"
            );

        if (modal) {
            modal.classList.add(
                "hidden"
            );
        }

        App.Toast?.show?.(
            "🔐 AI is securely connected through Cloudflare."
        );
    },

    saveApiKeyModal() {
        const input =
            document.getElementById(
                "gemini-key-input"
            );

        if (input) {
            input.value = "";
        }

        this.toggleApiKeyModal();
    },

    clearApiKeyModal() {
        const input =
            document.getElementById(
                "gemini-key-input"
            );

        if (input) {
            input.value = "";
        }

        App.Toast?.show?.(
            "🔐 API key is managed securely on the server."
        );
    }
};
