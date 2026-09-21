window.App = window.App || {};

App.CameraRenderer = {

    displayCard(data, autoSpeak = false) {

        const result = {

            japanese:
                typeof data?.japanese === "string"
                    ? data.japanese.trim()
                    : "",

            romaji:
                typeof data?.romaji === "string"
                    ? data.romaji.trim()
                    : "",

            sinhala:
                typeof data?.sinhala === "string"
                    ? data.sinhala.trim()
                    : "",

            english:
                typeof data?.english === "string"
                    ? data.english.trim()
                    : "",

            guide:
                typeof data?.guide === "string"
                    ? data.guide.trim()
                    : ""
        };


        const jp =
            document.getElementById("ar-jp");

        const romaji =
            document.getElementById("ar-romaji");

        const sinhala =
            document.getElementById("ar-si");

        const english =
            document.getElementById("ar-en");

        const guide =
            document.getElementById("ar-guide");


        if (jp) {

            jp.textContent =
                result.japanese ||
                "No Japanese text detected";
        }


        if (romaji) {

            romaji.textContent =
                result.romaji
                    ? `(${result.romaji})`
                    : "";
        }


        if (sinhala) {

            sinhala.textContent =
                result.sinhala ||
                "සිංහල තේරුම මෙහි පෙන්වයි.";
        }


        if (english) {

            english.textContent =
                result.english ||
                "English meaning will appear here.";
        }


        if (guide) {

            guide.textContent =
                result.guide ||
                "Point the camera at Japanese text and scan again.";
        }


        App.State.currentArJapanese =
            result.japanese;


        App.State.currentCameraResult =
            {
                ...result
            };


        if (
            autoSpeak &&
            result.japanese
        ) {

            App.VoiceTTS?.speakText?.(
                result.japanese
            );
        }
    },


    clearCard() {

        const jp =
            document.getElementById("ar-jp");

        const romaji =
            document.getElementById("ar-romaji");

        const sinhala =
            document.getElementById("ar-si");

        const english =
            document.getElementById("ar-en");

        const guide =
            document.getElementById("ar-guide");


        if (jp) {

            jp.textContent =
                "Ready to scan";
        }


        if (romaji) {

            romaji.textContent =
                "Point camera at Japanese text";
        }


        if (sinhala) {

            sinhala.textContent =
                "Japanese text එකක් camera එකට පෙන්වන්න.";
        }


        if (english) {

            english.textContent =
                "Point the camera at Japanese text and press Scan.";
        }


        if (guide) {

            guide.textContent =
                "Try a Japanese sign, hotel notice, menu, label, or workplace instruction.";
        }


        App.State.currentArJapanese =
            "";


        App.State.currentCameraResult = {

            japanese: "",
            romaji: "",
            sinhala: "",
            english: "",
            guide: ""
        };
    },


    speakArDetected() {

        const japanese =
            App.State.currentArJapanese;


        if (
            !japanese ||
            typeof japanese !== "string"
        ) {

            App.Toast?.show?.(
                "No Japanese text detected yet."
            );

            return;
        }


        if (
            App.VoiceTTS &&
            typeof App.VoiceTTS.speakText ===
                "function"
        ) {

            App.VoiceTTS.speakText(
                japanese
            );

        } else {

            App.Toast?.show?.(
                "Japanese voice engine is unavailable."
            );
        }
    }
};
