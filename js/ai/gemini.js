import { Config } from '../config.js';

export const Gemini = {

    async callContent(
        payload,
        timeoutMs = Config.DEFAULT_TIMEOUT_MS,
        schema = null
    ) {

        const url =
            Config.WORKER_ENDPOINT;

        if (!url) {
            throw new Error(
                "WORKER_ENDPOINT_MISSING"
            );
        }

        const controller =
            new AbortController();

        const timer =
            setTimeout(
                () => controller.abort(),
                timeoutMs
            );

        try {

            const requestPayload = {
                ...payload,

                generationConfig: {
                    ...(payload?.generationConfig || {}),

                    responseMimeType:
                        "application/json"
                }
            };

            if (schema) {

                requestPayload
                    .generationConfig
                    .responseSchema =
                    schema;
            }

            const response =
                await fetch(
                    url,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
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

            if (!response.ok) {

                if (
                    response.status ===
                    400
                ) {
                    throw new Error(
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
                    response.status === 413
                ) {
                    throw new Error(
                        "REQUEST_TOO_LARGE"
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
                        `API_ERROR_${response.status}`
                    );
                }

                throw new Error(
                    `API_ERROR_${response.status}`
                );
            }

            let data;

            try {

                data =
                    JSON.parse(
                        responseText
                    );

            } catch {

                throw new Error(
                    "INVALID_GEMINI_RESPONSE"
                );
            }

            const candidate =
                data?.candidates?.[0];

            if (!candidate) {

                throw new Error(
                    "EMPTY_GEMINI_RESPONSE"
                );
            }

            const parts =
                Array.isArray(
                    candidate?.content?.parts
                )
                    ? candidate.content.parts
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
                    .map(
                        part =>
                            part.text.trim()
                    );

            if (
                textParts.length ===
                0
            ) {

                throw new Error(
                    "EMPTY_GEMINI_RESPONSE"
                );
            }

            const outputText =
                textParts
                    .join("\n")
                    .trim();

            const cleaned =
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

            try {

                return JSON.parse(
                    cleaned
                );

            } catch {

                throw new Error(
                    "INVALID_GEMINI_JSON"
                );
            }

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

            clearTimeout(
                timer
            );
        }
    }
};
