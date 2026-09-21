export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "METHOD_NOT_ALLOWED",
          message: "Only POST requests are allowed.",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "SERVER_CONFIGURATION_ERROR",
          message: "Gemini API key is not configured on the Worker.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    try {
      const body = await request.json();

      if (!body || typeof body !== "object") {
        return new Response(
          JSON.stringify({
            error: "INVALID_REQUEST",
            message: "Request body must be a JSON object.",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const geminiUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify(body),
      });

      const responseText = await geminiResponse.text();

      return new Response(responseText, {
        status: geminiResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "WORKER_ERROR",
          message:
            error?.message || "An unexpected Worker error occurred.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  },
};
