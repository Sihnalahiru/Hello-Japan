// ============================================================
// Hello Japan AI
// worker.js
// Cloudflare Worker -> Gemini API
// ============================================================

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

function corsHeaders(origin = null) {

    const headers = {
        "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type",

        "Access-Control-Max-Age":
            "86400",

        "Vary":
            "Origin"
    };


    if (
        origin === APP_ORIGIN
    ) {

        headers[
            "Access-Control-Allow-Origin"
        ] = APP_ORIGIN;
    }


    return headers;
}


// ============================================================
// JSON RESPONSE
// ============================================================

function jsonResponse(
    data,
    status = 200,
    origin = null
) {

    return new Response(
        JSON.stringify(data),
        {
            status,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                ...corsHeaders(
                    origin
                )
            }
        }
    );
}


// ============================================================
// OPTIONS
// ============================================================

function handleOptions(
    origin
) {

    if (
        origin !== APP_ORIGIN
    ) {

        return new Response(
            null,
            {
                status: 403
            }
        );
    }


    return new Response(
        null,
        {
            status: 204,

            headers:
                corsHeaders(
                    origin
                )
        }
    );
}


// ============================================================
// HEALTH
// ============================================================

function handleHealth(
    origin
) {

    return jsonResponse(
        {
            ok: true
        },
        200,
        origin
    );
}


// ============================================================
// REQUEST BODY SIZE
// ============================================================

function getContentLength(
    request
) {

    const raw =
        request.headers.get(
            "content-length"
        );


    if (!raw) {
        return null;
    }


    const size =
        Number(raw);


    if (
        !Number.isFinite(size) ||
        size < 0
    ) {

        return null;
    }


    return size;
}


// ============================================================
// GEMINI POST
// ============================================================

async function handlePost(
    request,
    env,
    origin
) {

    const serverKey =
        env?.GEMINI_API_KEY;


    if (!serverKey) {

        console.error(
            "[Worker] GEMINI_API_KEY is not configured."
        );


        return jsonResponse(
            {
                error:
                    "AI service is not configured."
            },
            500,
            origin
        );
    }


    const contentLength =
        getContentLength(
            request
        );


    if (
        contentLength !== null &&
        contentLength >
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


    let payload;


    try {

        payload =
            await request.json();

    } catch {

        return jsonResponse(
            {
                error:
                    "Invalid JSON request."
            },
            400,
            origin
        );
    }


    if (
        !payload ||
        typeof payload !==
            "object" ||
        Array.isArray(payload)
    ) {

        return jsonResponse(
            {
                error:
                    "Invalid request payload."
            },
            400,
            origin
        );
    }


    if (
        !Array.isArray(
            payload.contents
        ) ||
        payload.contents.length ===
            0
    ) {

        return jsonResponse(
            {
                error:
                    "Missing Gemini contents."
            },
            400,
            origin
        );
    }


    const incomingGenerationConfig =
        payload.generationConfig &&
        typeof payload.generationConfig ===
            "object" &&
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


    // Gemini 3.8 compatibility cleanup.
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
                            serverKey
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
                    "Unable to reach Gemini API."
            },
            502,
            origin
        );
    }


    const responseText =
        await response.text();


    let responseData;


    try {

        responseData =
            JSON.parse(
                responseText
            );

    } catch {

        responseData = null;
    }


    if (!response.ok) {

        console.error(
            "[Worker] Gemini error:",
            response.status,
            responseData
        );


        let clientMessage =
            "Gemini request failed.";


        if (
            response.status ===
            400
        ) {

            clientMessage =
                "Invalid Gemini request.";
        }


        if (
            response.status ===
                401 ||
            response.status ===
                403
        ) {

            clientMessage =
                "Gemini API authentication failed.";
        }


        if (
            response.status ===
            429
        ) {

            clientMessage =
                "Gemini API rate limit reached.";
        }


        if (
            response.status >=
            500
        ) {

            clientMessage =
                "Gemini service is temporarily unavailable.";
        }


        return jsonResponse(
            {
                error:
                    clientMessage
            },
            response.status,
            origin
        );
    }


    if (!responseData) {

        return jsonResponse(
            {
                error:
                    "Invalid Gemini response."
            },
            502,
            origin
        );
    }


    return new Response(
        JSON.stringify(
            responseData
        ),
        {
            status: 200,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                ...corsHeaders(
                    origin
                )
            }
        }
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
            );


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
        // API HEALTH
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
        // GEMINI API
        // ----------------------------------------------------

        if (
            request.method ===
                "POST" &&
            url.pathname ===
                "/api/gemini"
        ) {

            return handlePost(
                request,
                env,
                origin
            );
        }


        // ----------------------------------------------------
        // STATIC ASSETS
        // ----------------------------------------------------

        if (
            request.method ===
            "GET"
        ) {

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
                        "Cloudflare ASSETS binding is unavailable."
                },
                503,
                origin
            );
        }


        // ----------------------------------------------------
        // OTHER METHODS
        // ----------------------------------------------------

        return jsonResponse(
            {
                error:
                    "Not found."
            },
            404,
            origin
        );
    }
};
