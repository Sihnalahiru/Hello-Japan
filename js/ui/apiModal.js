window.App = window.App || {};

App.UI = {

    updateApiStatus() {

        const heroBtn =
            document.getElementById(
                "api-key-btn-hero"
            );


        if (!heroBtn) {
            return;
        }


        /*
         * Gemini authentication is handled by
         * Cloudflare Worker.
         */

        heroBtn.classList.add(
            "hidden"
        );
    },


    toggleApiKeyModal() {

        const modal =
            document.getElementById(
                "apikey-modal"
            );


        if (!modal) {
            return;
        }


        /*
         * The old API-key input is no longer used.
         * Keep modal compatibility if old HTML still
         * contains the element.
         */

        modal.classList.toggle(
            "hidden"
        );


        const input =
            document.getElementById(
                "gemini-key-input"
            );


        if (input) {

            input.value = "";

            input.setAttribute(
                "disabled",
                "disabled"
            );

            input.placeholder =
                "Gemini API is securely configured on the server";
        }
    },


    saveApiKeyModal() {

        /*
         * NEVER save Gemini keys in localStorage.
         */

        App.Toast?.show?.(
            "Gemini API is securely handled by the Cloudflare Worker."
        );


        const modal =
            document.getElementById(
                "apikey-modal"
            );


        modal?.classList.add(
            "hidden"
        );
    },


    clearApiKeyModal() {

        /*
         * Legacy compatibility only.
         * No browser API key exists.
         */

        localStorage.removeItem(
            "SUHADA_GEMINI_API_KEY"
        );


        App.State.userApiKey =
            "";


        App.Toast?.show?.(
            "Browser API key storage is disabled."
        );


        this.updateApiStatus();
    }
};
