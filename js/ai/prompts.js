export const Prompts = {
    getVoicePrompt(context, lang, heardText) {
        const safeContext = typeof context === "string" && context.trim() ? context.trim() : "daily";
        const safeLang = typeof lang === "string" && lang.trim() ? lang.trim() : "ja-JP";
        const safeTranscript = typeof heardText === "string" ? heardText.trim() : "";

        return `You are the LIVE Japanese communication assistant inside "Hello Japan".
CONTEXT: ${safeContext}
SPOKEN LANGUAGE MODE: ${safeLang}
USER TRANSCRIPT: <spoken_transcript>${safeTranscript}</spoken_transcript>

Provide the JSON response matching the required schema:
1. Translate/Extract heard text: heard_japanese, heard_romaji, heard_sinhala, heard_english.
2. Immediate recommended response for the user: response_japanese, response_romaji, response_sinhala, response_english.
3. Array of 2-3 alternative short quick replies in 'replies' field with badge, jp, romaji, sinhala, english.

Return ONLY valid JSON matching the schema.`;
    },

    getVisionPrompt() {
        return `You are the Japanese Vision Assistant inside "Hello Japan".
Analyze ONLY Japanese text that is actually visible and readable in the supplied camera image.
Provide:
- japanese: exact visible Japanese text
- romaji: Hepburn reading
- sinhala: natural Sinhala meaning
- english: natural English meaning
- guide: short practical explanation of what this sign/label means

Return ONLY valid JSON matching the schema.`;
    }
};
