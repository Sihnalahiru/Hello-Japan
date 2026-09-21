export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // Pass non-POST requests to static assets
    if (request.method !== "POST") {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not Found", { status: 404 });
    }

    try {
      // Check if API Key secret exists on Worker
      if (!env.GEMINI_API_KEY) {
        return new Response(
          JSON.stringify({ error: "SERVER_CONFIGURATION_ERROR: GEMINI_API_KEY secret missing on Cloudflare Worker." }),
          { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      const body = await request.json();
      
      // Valid Google AI Studio Model: gemini-1.5-flash
      const geminiModel = "gemini-1.5-flash";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${env.GEMINI_API_KEY}`;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }
  }
};
