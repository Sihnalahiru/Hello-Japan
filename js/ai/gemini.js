window.App = window.App || {};

App.Gemini = {
    async callContent(payload, timeoutMs = App.Config.DEFAULT_TIMEOUT_MS, schema = null) {
        if (!App.State.userApiKey) throw new Error("NO_API_KEY");
        const url = `${App.Config.GEMINI_API_BASE}/${App.Config.GEMINI_MODEL}:generateContent`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const config = { responseMimeType: "application/json" };
        if (schema) config.responseSchema = schema;

        payload.generationConfig = config;

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': App.State.userApiKey
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!resp.ok) {
                if (resp.status === 401 || resp.status === 403) throw new Error("API_KEY_INVALID");
                if (resp.status === 429) throw new Error("RATE_LIMIT");
                throw new Error(`API_ERROR_${resp.status}`);
            }

            const data = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("EMPTY_GEMINI_RESPONSE");

            let cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
            return JSON.parse(cleaned);
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') throw new Error("TIMEOUT");
            throw err;
        }
    }
};
