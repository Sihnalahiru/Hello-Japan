import { State } from '../state.js';
import { Config } from '../config.js';
import { Prompts } from '../ai/prompts.js';
import { Schemas } from '../ai/schemas.js';
import { Gemini } from '../ai/gemini.js';
import { VoiceRenderer } from './voiceRenderer.js';
import { VoiceTTS } from './voiceTTS.js';
import { Toast } from '../ui/toast.js';

export const VoiceAI = {
    async handleSpokenVoice(heardText) {
        const transcript = typeof heardText === "string" ? heardText.trim() : "";
        if (!transcript) return;

        const requestId = ++State.voiceRequestId;
        VoiceRenderer.showProcessing(transcript);

        try {
            const prompt = Prompts.getVoicePrompt(
                State.activeVoiceContext,
                State.activeSpeakerLang,
                transcript
            );

            const result = await Gemini.callContent(
                { contents: [{ parts: [{ text: prompt }] }] },
                Config.DEFAULT_TIMEOUT_MS || 12000,
                Schemas.VOICE_RESPONSE_SCHEMA
            );

            if (requestId !== State.voiceRequestId) return;

            const validated = this.validateResponse(result);
            if (!validated) throw new Error("INVALID_VOICE_RESPONSE");

            VoiceRenderer.renderConversation(validated);

            if (validated.responseJapanese) {
                VoiceTTS.speakText(validated.responseJapanese);
            }

        } catch (error) {
            if (requestId !== State.voiceRequestId) return;
            this.showError(error);
        }
    },

    validateResponse(data) {
        if (!data || typeof data !== "object") return null;
        const text = (k) => typeof data[k] === "string" ? data[k].trim() : "";

        return {
            heardJapanese: text("heard_japanese"),
            heardRomaji: text("heard_romaji"),
            heardSinhala: text("heard_sinhala"),
            heardEnglish: text("heard_english"),
            responseJapanese: text("response_japanese"),
            responseRomaji: text("response_romaji"),
            responseSinhala: text("response_sinhala"),
            responseEnglish: text("response_english"),
            replies: Array.isArray(data.replies) ? data.replies : []
        };
    },

    showError(error) {
        const message = "❌ Voice AI failed. Speak again.";
        Toast.show(message);
        VoiceRenderer.showError(message);
    }
};
