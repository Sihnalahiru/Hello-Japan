import { Toast } from './toast.js';

export const UI = {
    updateApiStatus() {
        const button = document.getElementById("api-key-btn-hero");
        const status = document.getElementById("api-status-hero");
        const savedKey = localStorage.getItem("gemini_api_key");

        if (button && savedKey) button.classList.add("hidden");
        if (status && savedKey) status.textContent = "AI Connected";
    },

    toggleApiKeyModal() {
        const modal = document.getElementById("apikey-modal");
        if (modal) modal.classList.toggle("hidden");
    },

    saveApiKeyModal() {
        const input = document.getElementById("gemini-key-input");
        if (input && input.value.trim() !== "") {
            localStorage.setItem("gemini_api_key", input.value.trim());
            input.value = "";
            this.toggleApiKeyModal();
            this.updateApiStatus();
            Toast.show("🔐 API Key saved successfully!");
        } else {
            Toast.show("⚠️ Please enter a valid API Key.");
        }
    },

    clearApiKeyModal() {
        const input = document.getElementById("gemini-key-input");
        if (input) input.value = "";
        localStorage.removeItem("gemini_api_key");
        Toast.show("🗑️ API key cleared.");
        
        const button = document.getElementById("api-key-btn-hero");
        const status = document.getElementById("api-status-hero");
        if (button) button.classList.remove("hidden");
        if (status) status.textContent = "API Key";
    }
};
