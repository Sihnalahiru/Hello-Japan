window.App = window.App || {};

App.UI = {

    updateApiStatus() {

        const heroButton =
            document.getElementById(
                "api-key-btn-hero"
            );

        const heroStatus =
            document.getElementById(
                "api-status-hero"
            );


        if (heroButton) {
            heroButton.classList.add(
                "hidden"
            );
        }


        if (heroStatus) {
            heroStatus.textContent =
                "AI Secure";
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
            "🔐 Gemini AI is securely connected through Cloudflare."
        );
    },


    saveApiKeyModal() {

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
            "🔐 API keys are managed securely by the server."
        );
    },


    clearApiKeyModal() {

        const input =
            document.getElementById(
                "gemini-key-input"
            );


        if (input) {
            input.value = "";
        }


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
            "🔐 Browser API key storage is disabled."
        );
    }
};
