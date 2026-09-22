import { State } from '../state.js';
import { VoiceTTS } from './voiceTTS.js';

export const VoiceRenderer = {
    setListeningState(active, labelText) {
        this.updateMicVisuals(active);
        const label = document.getElementById("mic-status-label");
        if (label && labelText) label.textContent = labelText;
    },

    updateMicVisuals(active) {
        const dot = document.getElementById("listening-badge-dot");
        const icon = document.getElementById("mic-live-icon");
        const avatar = document.getElementById("mic-avatar-btn");

        if (active) {
            if (dot) dot.classList.remove("hidden");
            if (icon) icon.className = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
            if (avatar) avatar.classList.add("ring-4", "ring-red-400/40");
        } else {
            if (dot) dot.classList.add("hidden");
            if (icon) icon.className = "w-2 h-2 rounded-full bg-gray-400";
            if (avatar) avatar.classList.remove("ring-4", "ring-red-400/40");
        }
    },

    renderConversation(data) {
        if (!data || typeof data !== "object") return;

        const jp = document.getElementById("detected-japanese");
        const romaji = document.getElementById("detected-romaji");
        const sinhala = document.getElementById("detected-sinhala");
        const english = document.getElementById("detected-english");

        if (jp) jp.textContent = data.heardJapanese || "No speech detected.";
        if (romaji) romaji.textContent = data.heardRomaji || "";
        if (sinhala) sinhala.textContent = data.heardSinhala || "";
        if (english) english.textContent = data.heardEnglish || "";

        const suggestions = [];
        if (data.responseJapanese) {
            suggestions.push({
                badge: "🤖 AI ANSWER",
                jp: data.responseJapanese,
                romaji: data.responseRomaji,
                sinhala: data.responseSinhala,
                english: data.responseEnglish,
                primary: true
            });
        }

        if (Array.isArray(data.replies)) {
            data.replies.forEach(r => {
                if (r?.jp) {
                    suggestions.push({
                        badge: r.badge || "💬 QUICK REPLY",
                        jp: r.jp, romaji: r.romaji, sinhala: r.sinhala, english: r.english, primary: false
                    });
                }
            });
        }

        this.renderSuggestions(suggestions);
    },

    renderSuggestions(replies) {
        const container = document.getElementById("suggestions-list");
        const empty = document.getElementById("voice-suggestion-empty");
        if (!container) return;

        container.innerHTML = "";
        if (!replies || !replies.length) {
            if (empty) empty.classList.remove("hidden");
            return;
        }
        if (empty) empty.classList.add("hidden");

        replies.forEach(reply => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "w-full text-left bg-white rounded-2xl p-3 border shadow-sm active:scale-[0.98] transition-all " +
                (reply.primary ? "border-brandGreen ring-1 ring-brandGreen/20" : "border-gray-100");

            card.innerHTML = `
                <div class="flex items-center justify-between gap-2 mb-1">
                    <span class="${reply.primary ? 'text-[9px] font-black text-emerald-800 bg-brandGreen/20 px-2 py-0.5 rounded-full' : 'text-[9px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full'}">${reply.badge}</span>
                    <span class="text-emerald-700 text-sm"><i class="ph ph-speaker-high"></i></span>
                </div>
                <div class="text-[15px] font-black text-gray-900 leading-snug">${reply.jp}</div>
                ${reply.romaji ? `<div class="text-[10px] text-emerald-700 font-semibold mt-1">${reply.romaji}</div>` : ''}
                ${reply.sinhala ? `<div class="text-[11px] text-gray-800 font-semibold mt-1">${reply.sinhala}</div>` : ''}
            `;

            card.addEventListener("click", () => VoiceTTS.speakReplyOption(reply.jp));
            container.appendChild(card);
        });
    },

    clearConversation() {
        const jp = document.getElementById("detected-japanese");
        if (jp) jp.textContent = "Speak when you are ready...";
        this.renderSuggestions([]);
    },

    showProcessing(transcript) {
        const jp = document.getElementById("detected-japanese");
        if (jp) jp.textContent = `Listening: "${transcript}"...`;
    },

    showError(msg) {
        this.setListeningState(false, msg);
    },

    updateSpeakerUI(lang) {
        ["ja-JP", "si-LK", "en-US"].forEach(l => {
            const code = l.split('-')[0].toLowerCase();
            const btn = document.getElementById(`btn-speaker-${code}`);
            if (btn) {
                if (l === lang) {
                    btn.className = "bg-deepCard text-white text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";
                } else {
                    btn.className = "bg-white text-gray-700 text-[10px] font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 transition-all";
                }
            }
        });
    },

    updateContextUI(context) {
        const label = document.getElementById("voice-env-display");
        if (label) label.textContent = `Context: ${context}`;

        const buttons = document.querySelectorAll("#view-voice .ctx-pill");
        buttons.forEach(btn => {
            if (btn.getAttribute("onclick")?.includes(`'${context}'`)) {
                btn.className = "ctx-pill active bg-deepCard text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm";
            } else {
                btn.className = "ctx-pill bg-white text-gray-600 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm";
            }
        });
    }
};
