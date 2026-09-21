const GEMINI_MODEL =
    "gemini-3.8-flash";

const GEMINI_API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type",
    "Cache-Control":
        "no-store"
};

function jsonResponse(
    data,
    status = 200,
    extraHeaders = {}
) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                ...CORS_HEADERS,
                "Content-Type":
                    "application/json; charset=utf-8",
                ...extraHeaders
            }
        }
    );
}

export default {

    async fetch(request, env) {

        const url =
            new URL(request.url);

        /*
         * --------------------------------
         * CORS
         * --------------------------------
         */

        if (
            request.method ===
            "OPTIONS"
        ) {
            return new Response(
                null,
                {
                    status: 204,
                    headers:
                        CORS_HEADERS
                }
            );
        }

        /*
         * --------------------------------
         * HEALTH CHECK
         * --------------------------------
         */

        if (
            request.method === "GET" &&
            url.pathname ===
                "/api/health"
        ) {

            return jsonResponse({
                ok: true,
                worker: "hello-japan",
                geminiModel:
                    GEMINI_MODEL,
                apiKeyConfigured:
                    Boolean(
                        env.GEMINI_API_KEY
                    )
            });
        }

        /*
         * --------------------------------
         * GEMINI PROXY
         * --------------------------------
         */

        if (
            request.method === "POST"
        ) {

            if (
                !env.GEMINI_API_KEY
            ) {

                return jsonResponse(
                    {
                        ok: false,
                        error:
                            "SERVER_CONFIGURATION_ERROR",
                        message:
                            "GEMINI_API_KEY is not configured on the Cloudflare Worker."
                    },
                    500
                );
            }

            let body;

            try {

                body =
                    await request.json();

            } catch {

                return jsonResponse(
                    {
                        ok: false,
                        error:
                            "INVALID_JSON",
                        message:
                            "Request body is not valid JSON."
                    },
                    400
                );
            }

            if (
                !body ||
                typeof body !==
                    "object" ||
                Array.isArray(body)
            ) {

                return jsonResponse(
                    {
                        ok: false,
                        error:
                            "INVALID_REQUEST",
                        message:
                            "Request body must be a JSON object."
                    },
                    400
                );
            }

            /*
             * Ensure JSON output.
             */
            body.generationConfig =
                {
                    ...(body.generationConfig ||
                        {}),
                    responseMimeType:
                        "application/json"
                };

            try {

                const geminiResponse =
                    await fetch(
                        GEMINI_API_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",
                                "x-goog-api-key":
                                    env.GEMINI_API_KEY
                            },

                            body:
                                JSON.stringify(
                                    body
                                )
                        }
                    );

                const responseText =
                    await geminiResponse.text();

                /*
                 * Forward Gemini response.
                 *
                 * IMPORTANT:
                 * Never return the API key.
                 */
                return new Response(
                    responseText,
                    {
                        status:
                            geminiResponse.status,

                        headers: {
                            ...CORS_HEADERS,
                            "Content-Type":
                                "application/json; charset=utf-8"
                        }
                    }
                );

            } catch (error) {

                return jsonResponse(
                    {
                        ok: false,
                        error:
                            "WORKER_GEMINI_FETCH_ERROR",
                        message:
                            error?.message ||
                            "Worker could not contact Gemini."
                    },
                    502
                );
            }
        }

        /*
         * --------------------------------
         * STATIC PWA
         * --------------------------------
         */

        if (env.ASSETS) {

            return env.ASSETS.fetch(
                request
            );
        }

        return jsonResponse(
            {
                ok: false,
                error:
                    "ASSETS_BINDING_MISSING",
                message:
                    "Cloudflare ASSETS binding is missing."
            },
            500
        );
    }
};
