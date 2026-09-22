const GEMINI_MODEL = "gemini-1.5-flash";

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-goog-api-key",
    "Cache-Control": "no-store"
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json; charset=utf-8",
            ...extraHeaders
        }
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: CORS_HEADERS
            });
        }

        if (request.method === "GET" && url.pathname === "/api/health") {
            return jsonResponse({
                ok: true,
                worker: "hello-japan",
                geminiModel: GEMINI_MODEL,
                apiKeyConfigured: Boolean(env.GEMINI_API_KEY || request.headers.get("x-goog-api-key"))
            });
        }

        if (request.method === "POST") {
            const apiKey = request.headers.get("x-goog-api-key") || env.GEMINI_API_KEY;

            if (!apiKey) {
                return jsonResponse(
                    {
                        ok: false,
                        error: "SERVER_CONFIGURATION_ERROR",
                        message: "GEMINI_API_KEY is missing from Cloudflare Worker and request headers."
                    },
                    401
                );
            }

            let body;
            try {
                body = await request.json();
            } catch {
                return jsonResponse(
                    {
                        ok: false,
                        error: "INVALID_JSON",
                        message: "Request body is not valid JSON."
                    },
                    400
                );
            }

            if (!body || typeof body !== "object" || Array.isArray(body)) {
                return jsonResponse(
                    {
                        ok: false,
                        error: "INVALID_REQUEST",
                        message: "Request body must be a JSON object."
                    },
                    400
                );
            }

            body.generationConfig = {
                ...(body.generationConfig || {}),
                responseMimeType: "application/json"
            };

            try {
                const geminiResponse = await fetch(GEMINI_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey
                    },
                    body: JSON.stringify(body)
                });

                const responseText = await geminiResponse.text();

                return new Response(responseText, {
                    status: geminiResponse.status,
                    headers: {
                        ...CORS_HEADERS,
                        "Content-Type": "application/json; charset=utf-8"
                    }
                });
            } catch (error) {
                return jsonResponse(
                    {
                        ok: false,
                        error: "WORKER_GEMINI_FETCH_ERROR",
                        message: error?.message || "Worker could not contact Gemini."
                    },
                    502
                );
            }
        }

        if (env.ASSETS) {
            return env.ASSETS.fetch(request);
        }

        return jsonResponse(
            {
                ok: false,
                error: "ASSETS_BINDING_MISSING",
                message: "Cloudflare ASSETS binding is missing."
            },
            500
        );
    }
};
