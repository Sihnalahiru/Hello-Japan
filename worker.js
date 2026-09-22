// ============================================================
// Hello Japan AI
// worker.js
// Cloudflare Worker -> Gemini API
// ============================================================

const GEMINI_MODEL =
    'gemini-3.8-flash';

const GEMINI_API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


// ============================================================
// CORS
// ============================================================

function corsHeaders() {

    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
            'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':
            'Content-Type, x-goog-api-key',
        'Access-Control-Max-Age':
            '86400'
    };
}


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
                'Content-Type':
                    'application/json; charset=utf-8',
                ...corsHeaders(),
                ...extraHeaders
            }
        }
    );
}


// ============================================================
// OPTIONS
// ============================================================

function handleOptions() {

    return new Response(
        null,
        {
            status: 204,
            headers: corsHeaders()
        }
    );
}


// ============================================================
// GET
// ============================================================

async function handleGet(
    request,
    env
) {

    const url =
        new URL(request.url);


    if (
        url.pathname === '/api/health' ||
        url.pathname === '/health'
    ) {

        return jsonResponse(
            {
                ok: true,
                worker: 'hello-japan',
                geminiModel:
                    GEMINI_MODEL,
                apiKeyConfigured:
                    Boolean(
                        env?.GEMINI_API_KEY
                    )
            }
        );
    }


    return jsonResponse(
        {
            ok: true,
            service:
                'Hello Japan AI Gemini Worker',
            model:
                GEMINI_MODEL
        }
    );
}


// ============================================================
// POST
// ============================================================

async function handlePost(
    request,
    env
) {

    // --------------------------------------------------------
    // API key
    // --------------------------------------------------------

    const clientKey =
        request.headers.get(
            'x-goog-api-key'
        );

    const serverKey =
        env?.GEMINI_API_KEY;

    const apiKey =
        clientKey ||
        serverKey;


    if (!apiKey) {

        return jsonResponse(
            {
                error:
                    'Gemini API key is not configured.'
            },
            500
        );
    }


    // --------------------------------------------------------
    // Parse request
    // --------------------------------------------------------

    let payload;

    try {

        payload =
            await request.json();

    } catch {

        return jsonResponse(
            {
                error:
                    'Invalid JSON request.'
            },
            400
        );
    }


    if (
        !payload ||
        typeof payload !== 'object'
    ) {

        return jsonResponse(
            {
                error:
                    'Invalid request payload.'
            },
            400
        );
    }


    // --------------------------------------------------------
    // Gemini generation config
    // --------------------------------------------------------

    const incomingGenerationConfig =
        payload.generationConfig &&
        typeof payload.generationConfig ===
            'object'
            ? payload.generationConfig
            : {};


    const generationConfig = {
        ...incomingGenerationConfig,
        responseMimeType:
            'application/json'
    };


    // Gemini 3.8 migration:
    // Do not forward obsolete sampling settings.
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
    // Gemini request
    // --------------------------------------------------------

    let response;

    try {

        response =
            await fetch(
                GEMINI_API_URL,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json',
                        'x-goog-api-key':
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
            '[Worker] Gemini network error:',
            error
        );

        return jsonResponse(
            {
                error:
                    'Unable to reach Gemini API.'
            },
            502
        );
    }


    // --------------------------------------------------------
    // Read response
    // --------------------------------------------------------

    const responseText =
        await response.text();


    let responseData;

    try {

        responseData =
            JSON.parse(
                responseText
            );

    } catch {

        responseData = {
            error:
                responseText ||
                'Invalid Gemini response.'
        };
    }


    // --------------------------------------------------------
    // Map common errors
    // --------------------------------------------------------

    if (!response.ok) {

        console.error(
            '[Worker] Gemini error:',
            response.status,
            responseData
        );


        let message =
            'Gemini request failed.';


        if (
            response.status === 400
        ) {
            message =
                'Invalid Gemini request.';
        }

        if (
            response.status === 401 ||
            response.status === 403
        ) {
            message =
                'Gemini API authentication failed.';
        }

        if (
            response.status === 429
        ) {
            message =
                'Gemini API rate limit reached.';
        }

        if (
            response.status >= 500
        ) {
            message =
                'Gemini service is temporarily unavailable.';
        }


        return jsonResponse(
            {
                error: message,
                status:
                    response.status,
                details:
                    responseData
            },
            response.status
        );
    }


    // --------------------------------------------------------
    // Success
    // --------------------------------------------------------

    return new Response(
        JSON.stringify(
            responseData
        ),
        {
            status: 200,
            headers: {
                'Content-Type':
                    'application/json; charset=utf-8',
                ...corsHeaders()
            }
        }
    );
}


// ============================================================
// MAIN FETCH
// ============================================================

export default {

    async fetch(
        request,
        env
    ) {

        const url =
            new URL(request.url);


        // ----------------------------------------------------
        // CORS preflight
        // ----------------------------------------------------

        if (
            request.method ===
            'OPTIONS'
        ) {
            return handleOptions();
        }


        // ----------------------------------------------------
        // Health / GET
        // ----------------------------------------------------

        if (
            request.method ===
            'GET'
        ) {
            return handleGet(
                request,
                env
            );
        }


        // ----------------------------------------------------
        // Gemini API
        // ----------------------------------------------------

        if (
            request.method ===
            'POST'
        ) {

            return handlePost(
                request,
                env
            );
        }


        // ----------------------------------------------------
        // Unsupported method
        // ----------------------------------------------------

        return jsonResponse(
            {
                error:
                    'Method not allowed.'
            },
            405,
            {
                Allow:
                    'GET, POST, OPTIONS'
            }
        );
    }
};
