window.App = window.App || {};

App.Security = {
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    createTextElement(tag, className, textContent) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        el.textContent = textContent || '';
        return el;
    }
};
