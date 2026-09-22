export const Prompts = {
    getVoicePrompt(context, lang, heardText) {
        const safeContext = typeof context === "string" && context.trim() ? context.trim() : "daily";
        const safeLang = typeof lang === "string" && lang.trim() ? lang.trim() : "ja-JP";
        const safeTranscript = typeof heardText === "string" ? heardText.trim() : "";

        return `You are the LIVE Japanese communication assistant inside "Hello Japan".
CONTEXT: ${safeContext}
SPOKEN LANGUAGE MODE: ${safeLang}
USER TRANSCRIPT: <spoken_transcript>${safeTranscript}</spoken_transcript>
Return ONLY valid JSON matching schema.`;
    },

    getVisionPrompt() {
        return `Analyze ONLY Japanese text that is actually visible and readable in the image.
Return ONLY valid JSON matching schema.`;
    }
};
