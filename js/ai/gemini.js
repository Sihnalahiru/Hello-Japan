import { Config } from '../config.js';

export const Gemini = {
    async callContent(payload, timeoutMs = Config.DEFAULT_TIMEOUT_MS, schema = null) {
        const url = Config.WORKER_ENDPOINT;
        if (!url) throw new Error("WORKER_ENDPOINT_MISSING");

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const savedApiKey = localStorage.getItem("gemini_api_key");

        try {
            const requestPayload = {
                ...payload,
                generationConfig: {
                    ...(payload.generationConfig || {}),
                    responseMimeType: "application/json"
                }
            };

            if (schema) {
                requestPayload.generationConfig.responseSchema = schema;
            }

            const headers = {
                "Content-Type": "application/json"
            };

            if (savedApiKey) {
                headers["x-goog-api-key"] = savedApiKey;
            }

            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            const responseText = await response.text();

            if (!response.ok) {
                if (response.status === 400) throw new Error("BAD_REQUEST");
                if (response.status === 401 || response.status === 403) throw new Error("API_KEY_INVALID");
                if (response.status === 429) throw new Error("RATE_LIMIT");
                throw new Error(`API_ERROR_${response.status}`);
            }

            const data = JSON.parse(responseText);
            const candidate = data?.candidates?.[0];
            if (!candidate) throw new Error("EMPTY_GEMINI_RESPONSE");

            const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
            const textParts = parts.filter(p => p && typeof p.text === "string" && p.text.trim()).map(p => p.text.trim());
            if (!textParts.length) throw new Error("EMPTY_GEMINI_RESPONSE");

            const outputText = textParts.join("\n").trim();
            const cleaned = outputText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

            return JSON.parse(cleaned);
        } catch (error) {
            if (error?.name === "AbortError") throw new Error("TIMEOUT");
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }
};
