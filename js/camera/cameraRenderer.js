window.App = window.App || {};

App.CameraRenderer = {

    displayCard(
        data,
        autoSpeak = false
    ) {

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
            document.getElementById(
                "ar-jp"
            );

        const romaji =
            document.getElementById(
                "ar-romaji"
            );

        const sinhala =
            document.getElementById(
                "ar-si"
            );

        const english =
            document.getElementById(
                "ar-en"
            );

        const guide =
            document.getElementById(
                "ar-guide"
            );


        if (jp) {

            jp.textContent =
                result.japanese ||
                "No Japanese text detected";

            jp.style.fontWeight =
                "900";
        }


        if (romaji) {

            romaji.textContent =
                result.romaji ||
                "";
        }


        if (sinhala) {

            sinhala.textContent =
                result.sinhala ||
                "සිංහල තේරුම නොලැබුණි.";
        }


        if (english) {

            english.textContent =
                result.english ||
                "English meaning was not detected.";
        }


        if (guide) {

            guide.textContent =
                result.guide ||
                "Point the camera at readable Japanese text and scan again.";
        }


        App.State.currentArJapanese =
            result.japanese;


        App.State.currentCameraResult =
            {
                ...result
            };


        if (
            autoSpeak &&
            result.japanese &&
            App.VoiceTTS &&
            typeof App.VoiceTTS.speakText ===
                "function"
        ) {

            App.VoiceTTS.speakText(
                result.japanese
            );
        }
    },


    clearCard() {

        const jp =
            document.getElementById(
                "ar-jp"
            );

        const romaji =
            document.getElementById(
                "ar-romaji"
            );

        const sinhala =
            document.getElementById(
                "ar-si"
            );

        const english =
            document.getElementById(
                "ar-en"
            );

        const guide =
            document.getElementById(
                "ar-guide"
            );


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
                "The AI will explain visible Japanese signs, menus, notices, labels and workplace instructions.";
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

        const text =
            App.State.currentArJapanese;


        if (!text) {

            App.Toast?.show?.(
                "No Japanese text has been detected yet."
            );

            return;
        }


        App.VoiceTTS?.speakText?.(
            text
        );
    }
};
