window.App = window.App || {};

App.Gemini = {
    async callContent(
        payload,
        timeoutMs = App.Config.DEFAULT_TIMEOUT_MS,
        schema = null
    ) {
        const url = App.Config.WORKER_ENDPOINT;

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
            // -----------------------------------------
            // Clone payload so the original object
            // is not unexpectedly modified.
            // -----------------------------------------
            const requestPayload = {
                ...payload,
                generationConfig: {
                    ...(payload.generationConfig || {}),
                    responseMimeType: "application/json"
                }
            };

            // -----------------------------------------
            // Optional Gemini response schema
            // -----------------------------------------
            if (schema) {
                requestPayload.generationConfig.responseSchema = schema;
            }

            // -----------------------------------------
            // Send request to Cloudflare Worker
            // -----------------------------------------
            const resp = await fetch(url, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(requestPayload),

                signal: controller.signal
            });

            // -----------------------------------------
            // Read response safely
            // -----------------------------------------
            const responseText = await resp.text();

            // -----------------------------------------
            // HTTP ERROR HANDLING
            // -----------------------------------------
            if (!resp.ok) {

                if (resp.status === 400) {
                    throw new Error("BAD_REQUEST");
                }

                if (resp.status === 401 || resp.status === 403) {
                    throw new Error("API_KEY_INVALID");
                }

                if (resp.status === 429) {
                    throw new Error("RATE_LIMIT");
                }

                if (resp.status >= 500) {
                    throw new Error("SERVER_ERROR");
                }

                throw new Error(`API_ERROR_${resp.status}`);
            }

            // -----------------------------------------
            // Parse Worker/Gemini JSON response
            // -----------------------------------------
            let data;

            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error("INVALID_GEMINI_RESPONSE");
            }

            // -----------------------------------------
            // Extract Gemini generated text
            // -----------------------------------------
            const text =
                data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text || typeof text !== "string") {
                throw new Error("EMPTY_GEMINI_RESPONSE");
            }

            // -----------------------------------------
            // Clean accidental Markdown JSON fences
            // -----------------------------------------
            let cleaned = text.trim();

            cleaned = cleaned
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

            if (!cleaned) {
                throw new Error("EMPTY_GEMINI_JSON");
            }

            // -----------------------------------------
            // Parse generated JSON
            // -----------------------------------------
            let result;

            try {
                result = JSON.parse(cleaned);
            } catch (jsonError) {
                throw new Error("INVALID_GEMINI_JSON");
            }

            // -----------------------------------------
            // Basic response validation
            // -----------------------------------------
            if (
                result === null ||
                typeof result !== "object" ||
                Array.isArray(result)
            ) {
                throw new Error("INVALID_GEMINI_DATA");
            }

            return result;

        } catch (err) {

            // -----------------------------------------
            // Timeout
            // -----------------------------------------
            if (err?.name === "AbortError") {
                throw new Error("TIMEOUT");
            }

            throw err;

        } finally {

            // -----------------------------------------
            // Always clear timeout
            // -----------------------------------------
            clearTimeout(timer);
        }
    }
};
