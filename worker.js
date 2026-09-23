const GEMINI_MODEL =
    "gemini-3.8-flash";

const GEMINI_API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const APP_ORIGIN =
    "https://hello-japan.madusanka-lahiru.workers.dev";

const MAX_REQUEST_BYTES =
    1024 * 1024;


// ============================================================
// CORS
// ============================================================

function corsHeaders(origin = "") {

    const headers = {
        "Access-Control-Allow-Methods":
            "POST, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type",

        "Access-Control-Max-Age":
            "86400",

        "Vary":
            "Origin"
    };

    if (origin === APP_ORIGIN) {
        headers["Access-Control-Allow-Origin"] =
            APP_ORIGIN;
    }

    return headers;
}


// ============================================================
// JSON RESPONSE
// ============================================================

function jsonResponse(
    data,
    status = 200,
    origin = ""
) {

    return new Response(
        JSON.stringify(data),
        {
            status,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                ...corsHeaders(origin)
            }
        }
    );
}


// ============================================================
// OPTIONS
// ============================================================

function handleOptions(origin) {

    if (origin && origin !== APP_ORIGIN) {

        return new Response(
            null,
            {
                status: 403,
                headers: corsHeaders(origin)
            }
        );
    }

    return new Response(
        null,
        {
            status: 204,
            headers: corsHeaders(origin)
        }
    );
}


// ============================================================
// HEALTH
// ============================================================

function handleHealth(origin) {

    return jsonResponse(
        {
            ok: true
        },
        200,
        origin
    );
}


// ============================================================
// REQUEST SIZE
// ============================================================

function getContentLength(request) {

    const value =
        request.headers.get(
            "content-length"
        );

    if (!value) {
        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number) ||
        number < 0
    ) {
        return null;
    }

    return number;
}


// ============================================================
// GEMINI REQUEST
// ============================================================

async function handleGemini(
    request,
    env,
    origin
) {

    // --------------------------------------------------------
    // Server-side API key ONLY.
    // Never accept an API key from the browser.
    // --------------------------------------------------------

    const apiKey =
        env?.GEMINI_API_KEY;

    if (!apiKey) {

        console.error(
            "[Worker] GEMINI_API_KEY is not configured."
        );

        return jsonResponse(
            {
                error:
                    "API_NOT_CONFIGURED"
            },
            500,
            origin
        );
    }


    // --------------------------------------------------------
    // Content-Length protection
    // --------------------------------------------------------

    const contentLength =
        getContentLength(request);

    if (
        contentLength !== null &&
        contentLength > MAX_REQUEST_BYTES
    ) {

        return jsonResponse(
            {
                error:
                    "REQUEST_TOO_LARGE"
            },
            413,
            origin
        );
    }


    // --------------------------------------------------------
    // Read request body
    // --------------------------------------------------------

    let rawBody;

    try {

        rawBody =
            await request.text();

    } catch {

        return jsonResponse(
            {
                error:
                    "INVALID_REQUEST"
            },
            400,
            origin
        );
    }


    // --------------------------------------------------------
    // Body size protection even when Content-Length
    // is unavailable.
    // --------------------------------------------------------

    if (
        new TextEncoder()
            .encode(rawBody)
            .byteLength >
        MAX_REQUEST_BYTES
    ) {

        return jsonResponse(
            {
                error:
                    "REQUEST_TOO_LARGE"
            },
            413,
            origin
        );
    }


    // --------------------------------------------------------
    // Parse JSON
    // --------------------------------------------------------

    let payload;

    try {

        payload =
            JSON.parse(rawBody);

    } catch {

        return jsonResponse(
            {
                error:
                    "BAD_REQUEST"
            },
            400,
            origin
        );
    }


    // --------------------------------------------------------
    // Validate payload
    // --------------------------------------------------------

    if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload)
    ) {

        return jsonResponse(
            {
                error:
                    "BAD_REQUEST"
            },
            400,
            origin
        );
    }


    if (
        !Array.isArray(
            payload.contents
        )
    ) {

        return jsonResponse(
            {
                error:
                    "BAD_REQUEST"
            },
            400,
            origin
        );
    }


    // --------------------------------------------------------
    // Generation config
    // --------------------------------------------------------

    const incomingGenerationConfig =
        payload.generationConfig &&
        typeof payload.generationConfig === "object" &&
        !Array.isArray(
            payload.generationConfig
        )
            ? payload.generationConfig
            : {};


    const generationConfig = {
        ...incomingGenerationConfig,

        responseMimeType:
            "application/json"
    };


    // Gemini settings controlled by the Worker.
    delete generationConfig.temperature;
    delete generationConfig.topP;
    delete generationConfig.topK;
    delete generationConfig.candidateCount;
    delete generationConfig.candidate_count;
    delete generationConfig.thinking_budget;


    const requestBody = {
        ...payload,

        generationConfig
    };


    // --------------------------------------------------------
    // Gemini API
    // --------------------------------------------------------

    let response;

    try {

        response =
            await fetch(
                GEMINI_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            apiKey
                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )
                }
            );

    } catch (error) {

        console.error(
            "[Worker] Gemini network error:",
            error
        );

        return jsonResponse(
            {
                error:
                    "GEMINI_UNAVAILABLE"
            },
            502,
            origin
        );
    }


    // --------------------------------------------------------
    // Success
    // --------------------------------------------------------

    if (response.ok) {

        const responseText =
            await response.text();

        try {

            const responseData =
                JSON.parse(
                    responseText
                );

            return jsonResponse(
                responseData,
                200,
                origin
            );

        } catch {

            console.error(
                "[Worker] Gemini returned invalid JSON."
            );

            return jsonResponse(
                {
                    error:
                        "INVALID_GEMINI_RESPONSE"
                },
                502,
                origin
            );
        }
    }


    // --------------------------------------------------------
    // Gemini error
    //
    // Full provider response stays server-side.
    // Browser receives only a safe error code.
    // --------------------------------------------------------

    let providerDetails = "";

    try {

        providerDetails =
            await response.text();

    } catch {
        providerDetails = "";
    }

    console.error(
        "[Worker] Gemini API error:",
        response.status,
        providerDetails
    );


    if (
        response.status === 400
    ) {

        return jsonResponse(
            {
                error:
                    "BAD_REQUEST"
            },
            400,
            origin
        );
    }


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        return jsonResponse(
            {
                error:
                    "API_KEY_INVALID"
            },
            response.status,
            origin
        );
    }


    if (
        response.status === 429
    ) {

        return jsonResponse(
            {
                error:
                    "RATE_LIMIT"
            },
            429,
            origin
        );
    }


    if (
        response.status >= 500
    ) {

        return jsonResponse(
            {
                error:
                    "GEMINI_UNAVAILABLE"
            },
            502,
            origin
        );
    }


    return jsonResponse(
        {
            error:
                "GEMINI_REQUEST_FAILED"
        },
        502,
        origin
    );
}


// ============================================================
// MAIN WORKER
// ============================================================

export default {

    async fetch(
        request,
        env
    ) {

        const url =
            new URL(
                request.url
            );

        const origin =
            request.headers.get(
                "Origin"
            ) || "";


        // ----------------------------------------------------
        // CORS preflight
        // ----------------------------------------------------

        if (
            request.method ===
            "OPTIONS"
        ) {

            return handleOptions(
                origin
            );
        }


        // ----------------------------------------------------
        // Health
        // ----------------------------------------------------

        if (
            request.method ===
                "GET" &&
            url.pathname ===
                "/api/health"
        ) {

            return handleHealth(
                origin
            );
        }


        // ----------------------------------------------------
        // Gemini API
        //
        // IMPORTANT:
        // Only this exact endpoint can receive POST.
        // ----------------------------------------------------

        if (
            request.method ===
                "POST" &&
            url.pathname ===
                "/api/gemini"
        ) {

            if (
                origin &&
                origin !== APP_ORIGIN
            ) {

                return jsonResponse(
                    {
                        error:
                            "FORBIDDEN_ORIGIN"
                    },
                    403,
                    origin
                );
            }

            return handleGemini(
                request,
                env,
                origin
            );
        }


        // ----------------------------------------------------
        // Static assets
        // ----------------------------------------------------

        if (
            request.method ===
            "GET"
        ) {

            if (
                url.pathname.startsWith(
                    "/api/"
                )
            ) {

                return jsonResponse(
                    {
                        error:
                            "NOT_FOUND"
                    },
                    404,
                    origin
                );
            }

            if (
                env?.ASSETS &&
                typeof env.ASSETS.fetch ===
                    "function"
            ) {

                return env.ASSETS.fetch(
                    request
                );
            }

            return jsonResponse(
                {
                    error:
                        "ASSETS_UNAVAILABLE"
                },
                503,
                origin
            );
        }


        // ----------------------------------------------------
        // Everything else
        // ----------------------------------------------------

        return jsonResponse(
            {
                error:
                    "METHOD_NOT_ALLOWED"
            },
            405,
            origin
        );
    }
};
