window.App = window.App || {};

App.Gemini = {

    async callContent(
        payload,
        timeoutMs = App.Config?.DEFAULT_TIMEOUT_MS || 12000,
        schema = null
    ) {

        const url =
            App.Config?.WORKER_ENDPOINT;

        if (!url) {
            throw new Error(
                "WORKER_ENDPOINT_MISSING"
            );
        }

        if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload)
        ) {
            throw new Error(
                "INVALID_GEMINI_PAYLOAD"
            );
        }

        const controller =
            new AbortController();

        const timer = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {

            const generationConfig = {
                ...(payload.generationConfig || {}),
                responseMimeType:
                    "application/json"
            };

            if (schema) {
                generationConfig.responseSchema =
                    schema;
            }

            const requestPayload = {
                ...payload,
                generationConfig
            };

            const response = await fetch(
                url,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            requestPayload
                        ),

                    signal:
                        controller.signal
                }
            );

            const responseText =
                await response.text();

            let responseData = null;

            try {
                responseData =
                    responseText
                        ? JSON.parse(
                            responseText
                        )
                        : null;
            } catch {
                responseData = null;
            }

            if (!response.ok) {

                console.error(
                    "Gemini Worker error:",
                    response.status,
                    responseData ||
                        responseText
                );

                if (
                    response.status === 400
                ) {
                    throw new Error(
                        responseData?.message ||
                        "BAD_REQUEST"
                    );
                }

                if (
                    response.status === 401 ||
                    response.status === 403
                ) {
                    throw new Error(
                        "API_KEY_INVALID"
                    );
                }

                if (
                    response.status === 429
                ) {
                    throw new Error(
                        "RATE_LIMIT"
                    );
                }

                if (
                    response.status >= 500
                ) {
                    throw new Error(
                        responseData?.message ||
                        "SERVER_ERROR"
                    );
                }

                throw new Error(
                    `API_ERROR_${response.status}`
                );
            }

            if (!responseData) {
                throw new Error(
                    "INVALID_GEMINI_RESPONSE"
                );
            }

            /*
             * Gemini response may contain
             * multiple parts.
             *
             * DO NOT assume parts[0] is
             * the final answer.
             */
            const parts =
                Array.isArray(
                    responseData
                        ?.candidates?.[0]
                        ?.content?.parts
                )
                    ? responseData
                        .candidates[0]
                        .content
                        .parts
                    : [];

            const textParts =
                parts
                    .filter(
                        part =>
                            part &&
                            typeof part.text ===
                                "string" &&
                            part.text.trim()
                    )
                    .filter(
                        part =>
                            part.thought !== true
                    );

            let outputText =
                textParts
                    .map(
                        part =>
                            part.text.trim()
                    )
                    .join("\n")
                    .trim();

            /*
             * Fallback:
             * if the API returns text but does
             * not expose thought metadata.
             */
            if (!outputText) {

                outputText =
                    parts
                        .filter(
                            part =>
                                part &&
                                typeof part.text ===
                                    "string" &&
                                part.text.trim()
                        )
                        .map(
                            part =>
                                part.text.trim()
                        )
                        .join("\n")
                        .trim();
            }

            if (!outputText) {

                console.error(
                    "Gemini returned no usable text:",
                    responseData
                );

                throw new Error(
                    "EMPTY_GEMINI_RESPONSE"
                );
            }

            let cleaned =
                outputText
                    .replace(
                        /^```json\s*/i,
                        ""
                    )
                    .replace(
                        /^```\s*/i,
                        ""
                    )
                    .replace(
                        /\s*```$/i,
                        ""
                    )
                    .trim();

            if (!cleaned) {
                throw new Error(
                    "EMPTY_GEMINI_JSON"
                );
            }

            let result;

            try {

                result =
                    JSON.parse(cleaned);

            } catch (error) {

                console.error(
                    "Gemini JSON parse failed:",
                    cleaned
                );

                throw new Error(
                    "INVALID_GEMINI_JSON"
                );
            }

            if (
                !result ||
                typeof result !== "object" ||
                Array.isArray(result)
            ) {
                throw new Error(
                    "INVALID_GEMINI_DATA"
                );
            }

            return result;

        } catch (error) {

            if (
                error?.name ===
                "AbortError"
            ) {
                throw new Error(
                    "TIMEOUT"
                );
            }

            throw error;

        } finally {

            clearTimeout(timer);
        }
    }
};
