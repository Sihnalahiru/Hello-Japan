window.App = window.App || {};

App.Gemini = {
    async callContent(
        payload,
        timeoutMs = App.Config?.DEFAULT_TIMEOUT_MS || 12000,
        schema = null
    ) {
        const url = App.Config?.WORKER_ENDPOINT;

        if (!url) {
            console.error("Gemini Error: WORKER_ENDPOINT is missing in config.js");
            throw new Error("WORKER_ENDPOINT_MISSING");
        }

        if (!payload || typeof payload !== "object") {
            console.error("Gemini Error: Invalid payload", payload);
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

            const responseText = await response.text();

            // --------------------------------------------------
            // HTTP ERROR
            // --------------------------------------------------

            if (!response.ok) {
                let backendError = null;

                try {
                    backendError = JSON.parse(responseText);
                } catch {
                    backendError = null;
                }

                console.error("Gemini Worker Error:", {
                    status: response.status,
                    body: backendError || responseText
                });

                if (response.status === 400) {
                    throw new Error("BAD_REQUEST");
                }

                if (response.status === 401 || response.status === 403) {
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

            // --------------------------------------------------
            // PARSE WORKER RESPONSE
            // --------------------------------------------------

            let data;

            try {
                data = JSON.parse(responseText);
            } catch (error) {
                console.error(
                    "Gemini Worker returned invalid JSON:",
                    responseText
                );

                throw new Error("INVALID_GEMINI_RESPONSE");
            }

            // --------------------------------------------------
            // EXPLICIT BACKEND ERROR
            // --------------------------------------------------

            if (data?.error) {
                console.error(
                    "Gemini Backend Error:",
                    data.error,
                    data.message || ""
                );

                throw new Error(
                    typeof data.error === "string"
                        ? data.error
                        : "SERVER_ERROR"
                );
            }

            // --------------------------------------------------
            // GEMINI CANDIDATE CHECK
            // --------------------------------------------------

            const candidate = data?.candidates?.[0];

            if (!candidate) {
                console.error("Gemini returned no candidate:", data);
                throw new Error("EMPTY_GEMINI_RESPONSE");
            }

            // --------------------------------------------------
            // COLLECT ALL TEXT PARTS
            // --------------------------------------------------

            const parts = Array.isArray(candidate?.content?.parts)
                ? candidate.content.parts
                : [];

            const textParts = parts
                .filter(part =>
                    part &&
                    typeof part.text === "string" &&
                    part.text.trim() &&
                    part.thought !== true
                )
                .map(part => part.text.trim());

            if (!textParts.length) {
                console.error(
                    "Gemini returned no usable text parts:",
                    data
                );

                throw new Error("EMPTY_GEMINI_RESPONSE");
            }

            const outputText = textParts.join("\n").trim();

            // --------------------------------------------------
            // CLEAN MARKDOWN JSON FENCES
            // --------------------------------------------------

            const cleaned = outputText
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

            if (!cleaned) {
                throw new Error("EMPTY_GEMINI_JSON");
            }

            // --------------------------------------------------
            // PARSE FINAL JSON
            // --------------------------------------------------

            let result;

            try {
                result = JSON.parse(cleaned);
            } catch (error) {
                console.error(
                    "Gemini JSON parsing failed:",
                    cleaned
                );

                throw new Error("INVALID_GEMINI_JSON");
            }

            // --------------------------------------------------
            // VALID RESULT CHECK
            // --------------------------------------------------

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result)
            ) {
                console.error(
                    "Gemini returned invalid object:",
                    result
                );

                throw new Error("INVALID_GEMINI_DATA");
            }

            return result;

        } catch (error) {

            if (error?.name === "AbortError") {
                console.error(
                    `Gemini request timed out after ${timeoutMs}ms`
                );

                throw new Error("TIMEOUT");
            }

            throw error;

        } finally {
            clearTimeout(timer);
        }
    }
};
