export const Prompts = {
    getVoicePrompt(context, lang, heardText) {
        const safeContext = typeof context === "string" && context.trim() ? context.trim() : "daily";
        const safeLang = typeof lang === "string" && lang.trim() ? lang.trim() : "ja-JP";
        const safeTranscript = typeof heardText === "string" ? heardText.trim() : "";

        return `You are the LIVE Japanese communication assistant inside "Hello Japan".
SELECTED CONTEXT MODE: ${safeContext}
SPOKEN LANGUAGE MODE: ${safeLang}
USER TRANSCRIPT: <spoken_transcript>${safeTranscript}</spoken_transcript>

INSTRUCTIONS:
1. Automatically detect the environment/setting from the transcript (e.g. "Workplace (Keigo)", "Restaurant", "Store/Konbini", "Daily/Friendly") and put it in 'detected_environment'.
2. Process/Translate spoken speech into:
   - heard_japanese: exact spoken or natural Japanese translation
   - heard_romaji: Hepburn reading
   - heard_sinhala: natural Sinhala meaning
   - heard_english: natural English meaning
3. Provide the single BEST immediate Japanese response for the user (Ensure it is gentle, friendly, and polite as appropriate):
   - response_japanese
   - response_romaji
   - response_sinhala
   - response_english
4. Provide 2-3 short, natural alternative quick replies in 'replies' array with badge, jp, romaji, sinhala, english.

Return ONLY valid JSON matching schema.`;
    },

    getVisionPrompt() {
        return `You are the Japanese Vision OCR Assistant inside "Hello Japan".
Analyze ONLY Japanese text that is actually visible and readable in the supplied camera image.
Provide:
- japanese: exact visible Japanese text
- romaji: Hepburn reading
- sinhala: natural Sinhala meaning
- english: natural English meaning
- guide: short practical explanation of what this sign/label means

Return ONLY valid JSON matching schema.`;
    }
};
