window.App = window.App || {};

App.VoiceRenderer = {

    updateMicVisuals(active) {

        const dot =
            document.getElementById("listening-badge-dot");

        const icon =
            document.getElementById("mic-live-icon");

        const label =
            document.getElementById("mic-status-label");

        const avatar =
            document.getElementById("mic-avatar-btn");

        if (active) {

            if (dot) {
                dot.classList.remove("hidden");
            }

            if (icon) {
                icon.className =
                    "w-2 h-2 rounded-full bg-red-500 animate-pulse";
            }

            if (label) {
                label.textContent =
                    "Listening...";
            }

            if (avatar) {
                avatar.classList.add(
                    "ring-4",
                    "ring-red-400/40"
                );
            }

        } else {

            if (dot) {
                dot.classList.add("hidden");
            }

            if (icon) {
                icon.className =
                    "w-2 h-2 rounded-full bg-gray-400";
            }

            if (label) {
                label.textContent =
                    "Listening Paused";
            }

            if (avatar) {
                avatar.classList.remove(
                    "ring-4",
                    "ring-red-400/40"
                );
            }
        }
    },


    renderConversation(data) {

        if (!data || typeof data !== "object") {
            return;
        }

        const heardJapanese =
            typeof data.heard_japanese === "string"
                ? data.heard_japanese.trim()
                : "";

        const heardRomaji =
            typeof data.heard_romaji === "string"
                ? data.heard_romaji.trim()
                : "";

        const heardSinhala =
            typeof data.heard_sinhala === "string"
                ? data.heard_sinhala.trim()
                : "";

        const heardEnglish =
            typeof data.heard_english === "string"
                ? data.heard_english.trim()
                : "";

        const responseJapanese =
            typeof data.response_japanese === "string"
                ? data.response_japanese.trim()
                : "";

        const responseRomaji =
            typeof data.response_romaji === "string"
                ? data.response_romaji.trim()
                : "";

        const responseSinhala =
            typeof data.response_sinhala === "string"
                ? data.response_sinhala.trim()
                : "";

        const responseEnglish =
            typeof data.response_english === "string"
                ? data.response_english.trim()
                : "";

        const transcript =
            App.State.currentVoiceTranscript || "";

        const finalJapanese =
            heardJapanese ||
            transcript ||
            "No speech detected.";

        const jp =
            document.getElementById("detected-japanese");

        const romaji =
            document.getElementById("detected-romaji");

        const sinhala =
            document.getElementById("detected-sinhala");

        const english =
            document.getElementById("detected-english");

        if (jp) {

            jp.textContent = finalJapanese;

            jp.style.fontSize = "1.15rem";
            jp.style.lineHeight = "1.45";
            jp.style.fontWeight = "900";
            jp.style.display = "block";
            jp.style.whiteSpace = "normal";
            jp.style.wordBreak = "break-word";
        }

        if (romaji) {

            romaji.textContent =
                heardRomaji ||
                "Romaji will appear here.";

            romaji.style.fontSize = "0.75rem";
            romaji.style.lineHeight = "1.45";
            romaji.style.display = "block";
        }

        if (sinhala) {

            sinhala.textContent =
                heardSinhala ||
                "සිංහල තේරුම ලබාගනිමින්...";

            sinhala.style.fontSize = "0.8rem";
            sinhala.style.lineHeight = "1.5";
            sinhala.style.display = "block";
        }

        if (english) {

            english.textContent =
                heardEnglish ||
                "English meaning is being generated...";

            english.style.fontSize = "0.75rem";
            english.style.lineHeight = "1.5";
            english.style.display = "block";
        }


        App.State.currentVoiceJapanese =
            finalJapanese;

        App.State.currentVoiceRomaji =
            heardRomaji;

        App.State.currentVoiceSinhala =
            heardSinhala;

        App.State.currentVoiceEnglish =
            heardEnglish;

        App.State.currentVoiceResponseJapanese =
            responseJapanese;

        App.State.currentVoiceResponseRomaji =
            responseRomaji;

        App.State.currentVoiceResponseSinhala =
            responseSinhala;

        App.State.currentVoiceResponseEnglish =
            responseEnglish;


        /*
         * PRIMARY AI ANSWER
         *
         * Put this BEFORE the alternative replies.
         */
        const suggestions = [];

        if (responseJapanese) {

            suggestions.push({
                badge: "🤖 AI ANSWER",
                jp: responseJapanese,
                romaji: responseRomaji,
                sinhala: responseSinhala,
                english: responseEnglish,
                primary: true
            });
        }


        const replies =
            Array.isArray(data.replies)
                ? data.replies
                : [];

        replies.forEach(reply => {

            if (
                !reply ||
                typeof reply !== "object"
            ) {
                return;
            }

            const jpText =
                typeof reply.jp === "string"
                    ? reply.jp.trim()
                    : "";

            if (!jpText) {
                return;
            }

            suggestions.push({
                badge:
                    typeof reply.badge === "string" &&
                    reply.badge.trim()
                        ? reply.badge.trim()
                        : "💬 QUICK REPLY",

                jp: jpText,

                romaji:
                    typeof reply.romaji === "string"
                        ? reply.romaji.trim()
                        : "",

                sinhala:
                    typeof reply.sinhala === "string"
                        ? reply.sinhala.trim()
                        : "",

                english:
                    typeof reply.english === "string"
                        ? reply.english.trim()
                        : "",

                primary: false
            });
        });


        App.State.currentVoiceSuggestions =
            suggestions;

        this.renderSuggestions(suggestions);
    },


    renderSuggestions(replies) {

        const container =
            document.getElementById("suggestions-list");

        const empty =
            document.getElementById("voice-suggestion-empty");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        const validReplies =
            Array.isArray(replies)
                ? replies.filter(
                    item =>
                        item &&
                        typeof item.jp === "string" &&
                        item.jp.trim()
                )
                : [];

        if (!validReplies.length) {

            if (empty) {
                empty.classList.remove("hidden");
                empty.textContent =
                    "No reply suggestion was generated. Please speak again.";
            }

            return;
        }

        if (empty) {
            empty.classList.add("hidden");
        }


        validReplies.slice(0, 4).forEach((reply, index) => {

            const card =
                document.createElement("button");

            card.type = "button";

            card.className =
                "w-full text-left bg-white rounded-2xl p-3 border shadow-sm active:scale-[0.98] transition-all";

            if (reply.primary) {

                card.classList.add(
                    "border-brandGreen",
                    "ring-1",
                    "ring-brandGreen/20"
                );

            } else {

                card.classList.add(
                    "border-gray-100"
                );
            }


            const header =
                document.createElement("div");

            header.className =
                "flex items-center justify-between gap-2 mb-1";


            const badge =
                document.createElement("span");

            badge.className =
                reply.primary
                    ? "text-[9px] font-black text-emerald-800 bg-brandGreen/20 px-2 py-0.5 rounded-full"
                    : "text-[9px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full";

            badge.textContent =
                reply.badge ||
                (index === 0
                    ? "🤖 AI ANSWER"
                    : "💬 QUICK REPLY");


            const speakIcon =
                document.createElement("span");

            speakIcon.className =
                "text-emerald-700 text-sm";

            speakIcon.innerHTML =
                '<i class="ph ph-speaker-high"></i>';


            header.appendChild(badge);
            header.appendChild(speakIcon);


            const jp =
                document.createElement("div");

            jp.className =
                "text-[15px] font-black text-gray-900 leading-snug";

            jp.textContent =
                reply.jp;


            const romaji =
                document.createElement("div");

            romaji.className =
                "text-[10px] text-emerald-700 font-semibold mt-1 leading-snug";

            romaji.textContent =
                reply.romaji || "";


            const sinhala =
                document.createElement("div");

            sinhala.className =
                "text-[11px] text-gray-800 font-semibold mt-1 leading-snug";

            sinhala.textContent =
                reply.sinhala || "";


            const english =
                document.createElement("div");

            english.className =
                "text-[10px] text-gray-500 mt-0.5 leading-snug";

            english.textContent =
                reply.english || "";


            card.appendChild(header);
            card.appendChild(jp);

            if (reply.romaji) {
                card.appendChild(romaji);
            }

            if (reply.sinhala) {
                card.appendChild(sinhala);
            }

            if (reply.english) {
                card.appendChild(english);
            }


            card.addEventListener(
                "click",
                () => {

                    if (
                        App.VoiceTTS &&
                        typeof App.VoiceTTS.speakReplyOption === "function"
                    ) {
                        App.VoiceTTS.speakReplyOption(
                            reply.jp
                        );
                    }
                }
            );

            container.appendChild(card);
        });
    },


    clearConversation() {

        const jp =
            document.getElementById("detected-japanese");

        const romaji =
            document.getElementById("detected-romaji");

        const sinhala =
            document.getElementById("detected-sinhala");

        const english =
            document.getElementById("detected-english");

        if (jp) {
            jp.textContent =
                "Speak when you are ready...";
        }

        if (romaji) {
            romaji.textContent =
                "Your Japanese speech will appear here.";
        }

        if (sinhala) {
            sinhala.textContent =
                "ඔබ කතා කරන වාක්‍යයේ තේරුම මෙහි පෙන්වයි.";
        }

        if (english) {
            english.textContent =
                "Your recognized speech will be translated here.";
        }

        this.renderSuggestions([]);
    }
};
