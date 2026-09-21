window.App = window.App || {};

App.Gemini = {
    async callContent(
        payload,
        timeoutMs = App.Config?.DEFAULT_TIMEOUT_MS || 12000,
        schema = null
    ) {
        const url = App.Config?.WORKER_ENDPOINT;

        if (!url) {
            throw new Error("WORKER_ENDPOINT_MISSING");
        }

        if (!payload || typeof payload !== "object") {
            throw new Error("INVALID_GEMINI_PAYLOAD");
        }

        const controller = new AbortController();

        const timer = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

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

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            const text = await response.text();

            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error("BAD_REQUEST");
                }

                if (response.status === 401 ||
                    response.status === 403) {
                    throw new Error("API_KEY_INVALID");
                }

                if (response.status === 429) {
                    throw new Error("RATE_LIMIT");
                }

                if (response.status >= 500) {
                    throw new Error("SERVER_ERROR");
                }

                throw new Error(`API_ERROR_${response.status}`);
            }

            let data;

            try {
                data = JSON.parse(text);
            } catch {
                throw new Error("INVALID_GEMINI_RESPONSE");
            }

            const outputText =
                data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!outputText || typeof outputText !== "string") {
                throw new Error("EMPTY_GEMINI_RESPONSE");
            }

            const cleaned = outputText
                .trim()
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

            if (!cleaned) {
                throw new Error("EMPTY_GEMINI_JSON");
            }

            let result;

            try {
                result = JSON.parse(cleaned);
            } catch {
                throw new Error("INVALID_GEMINI_JSON");
            }

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result)
            ) {
                throw new Error("INVALID_GEMINI_DATA");
            }

            return result;

        } catch (error) {
            if (error?.name === "AbortError") {
                throw new Error("TIMEOUT");
            }

            throw error;

        } finally {
            clearTimeout(timer);
        }
    }
};
