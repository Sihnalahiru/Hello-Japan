window.App = window.App || {};

App.VoiceRenderer = {

    updateMicVisuals(active) {

        const avatar =
            document.getElementById("mic-avatar-btn");

        const dot =
            document.getElementById("listening-badge-dot");

        const label =
            document.getElementById("mic-status-label");

        const icon =
            document.getElementById("mic-live-icon");


        if (!avatar) {
            return;
        }


        if (active) {

            avatar.classList.add(
                "listening-glow"
            );

            dot?.classList.remove("hidden");


            if (label) {

                label.textContent =
                    `Live Ear: Listening (${App.State.activeSpeakerLang})...`;
            }


            if (icon) {

                icon.className =
                    "w-2 h-2 rounded-full bg-red-500 animate-pulse";
            }

        } else {

            avatar.classList.remove(
                "listening-glow"
            );

            dot?.classList.add("hidden");


            if (label) {

                label.textContent =
                    App.VoiceTTS?.isSpeaking
                        ? "AI Speaking..."
                        : "Listening Paused";
            }


            if (icon) {

                icon.className =
                    App.VoiceTTS?.isSpeaking
                        ? "w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                        : "w-2 h-2 rounded-full bg-gray-400";
            }
        }
    },


    renderConversation(data) {

        if (
            !data ||
            typeof data !== "object"
        ) {

            return;
        }


        const japanese =
            typeof data.japanese === "string"
                ? data.japanese.trim()
                : "";


        const romaji =
            typeof data.romaji === "string"
                ? data.romaji.trim()
                : "";


        const sinhala =
            typeof data.sinhala === "string"
                ? data.sinhala.trim()
                : "";


        const english =
            typeof data.english === "string"
                ? data.english.trim()
                : "";


        const detectedJapanese =
            document.getElementById(
                "detected-japanese"
            );

        const detectedRomaji =
            document.getElementById(
                "detected-romaji"
            );

        const detectedSinhala =
            document.getElementById(
                "detected-sinhala"
            );

        const detectedEnglish =
            document.getElementById(
                "detected-english"
            );


        if (detectedJapanese) {

            detectedJapanese.textContent =
                japanese;
        }


        if (detectedRomaji) {

            detectedRomaji.textContent =
                romaji
                    ? `(${romaji})`
                    : "";
        }


        if (detectedSinhala) {

            detectedSinhala.textContent =
                sinhala;
        }


        if (detectedEnglish) {

            detectedEnglish.textContent =
                english;
        }


        App.State.currentVoiceJapanese =
            japanese;

        App.State.currentVoiceRomaji =
            romaji;

        App.State.currentVoiceSinhala =
            sinhala;

        App.State.currentVoiceEnglish =
            english;


        this.renderSuggestions(
            Array.isArray(data.replies)
                ? data.replies
                : []
        );
    },


    renderSuggestions(replies) {

        const list =
            document.getElementById(
                "suggestions-list"
            );


        if (!list) {
            return;
        }


        while (list.firstChild) {

            list.removeChild(
                list.firstChild
            );
        }


        if (
            !Array.isArray(replies) ||
            replies.length === 0
        ) {

            const empty =
                document.createElement("div");


            empty.className =
                "text-center text-xs text-gray-400 py-4";


            empty.textContent =
                "AI suggestions will appear after you speak.";


            list.appendChild(empty);


            App.State.currentVoiceSuggestions =
                [];


            return;
        }


        const validReplies =
            replies
                .filter(reply => {

                    return (
                        reply &&
                        typeof reply === "object" &&
                        typeof reply.jp === "string" &&
                        reply.jp.trim()
                    );
                })
                .slice(0, 3);


        App.State.currentVoiceSuggestions =
            validReplies;


        validReplies.forEach(reply => {

            const jp =
                reply.jp.trim();

            const romaji =
                typeof reply.romaji === "string"
                    ? reply.romaji.trim()
                    : "";

            const sinhala =
                typeof reply.sinhala === "string"
                    ? reply.sinhala.trim()
                    : "";

            const english =
                typeof reply.english === "string"
                    ? reply.english.trim()
                    : "";

            const badge =
                typeof reply.badge === "string" &&
                reply.badge.trim()
                    ? reply.badge.trim()
                    : "Reply";


            const card =
                document.createElement("button");


            card.type =
                "button";


            card.className =
                "w-full text-left bg-white p-2.5 rounded-2xl shadow-sm border border-emerald-100 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-between";


            card.addEventListener(
                "click",
                () => {

                    App.VoiceTTS?.speakReplyOption?.(
                        jp
                    );
                }
            );


            const left =
                document.createElement("div");


            left.className =
                "flex-1 pr-2";


            const header =
                document.createElement("div");


            header.className =
                "flex items-center gap-1.5";


            const badgeElement =
                document.createElement("span");


            badgeElement.className =
                "text-[9px] bg-brandGreen/20 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded";


            badgeElement.textContent =
                badge;


            const jpElement =
                document.createElement("span");


            jpElement.className =
                "text-xs font-black text-gray-900";


            jpElement.textContent =
                jp;


            header.appendChild(
                badgeElement
            );

            header.appendChild(
                jpElement
            );


            const romajiElement =
                document.createElement("p");


            romajiElement.className =
                "text-[10px] text-emerald-700 font-semibold mt-0.5";


            romajiElement.textContent =
                romaji
                    ? `(${romaji})`
                    : "";


            const translations =
                document.createElement("div");


            translations.className =
                "flex flex-col mt-0.5 text-[10px]";


            const sinhalaElement =
                document.createElement("p");


            sinhalaElement.className =
                "text-gray-700 font-semibold";


            sinhalaElement.textContent =
                sinhala
                    ? `🇱🇰 ${sinhala}`
                    : "";


            const englishElement =
                document.createElement("p");


            englishElement.className =
                "text-gray-500 font-medium";


            englishElement.textContent =
                english
                    ? `🇬🇧 ${english}`
                    : "";


            translations.appendChild(
                sinhalaElement
            );

            translations.appendChild(
                englishElement
            );


            left.appendChild(
                header
            );

            left.appendChild(
                romajiElement
            );

            left.appendChild(
                translations
            );


            const right =
                document.createElement("div");


            right.className =
                "w-8 h-8 rounded-full bg-brandGreen/20 text-emerald-800 flex items-center justify-center shrink-0";


            const icon =
                document.createElement("i");


            icon.className =
                "ph ph-speaker-high text-base";


            right.appendChild(icon);


            card.appendChild(left);

            card.appendChild(right);

            list.appendChild(card);
        });
    },


    clearConversation() {

        const ids = [
            "detected-japanese",
            "detected-romaji",
            "detected-sinhala",
            "detected-english"
        ];


        ids.forEach(id => {

            const element =
                document.getElementById(id);


            if (element) {
                element.textContent = "";
            }
        });


        this.renderSuggestions([]);


        App.State.currentVoiceTranscript = "";

        App.State.currentVoiceJapanese = "";

        App.State.currentVoiceRomaji = "";

        App.State.currentVoiceSinhala = "";

        App.State.currentVoiceEnglish = "";

        App.State.currentVoiceResponse = "";

        App.State.currentVoiceSuggestions = [];
    }
};
