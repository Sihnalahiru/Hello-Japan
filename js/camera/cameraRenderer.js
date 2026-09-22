// ============================================================
// Hello Japan AI
// js/camera/cameraRenderer.js
// Camera / AR Result Renderer
// ============================================================

import { State } from '../state.js';
import { Toast } from '../ui/toast.js';


function safeText(value) {

    return typeof value === 'string'
        ? value.trim()
        : '';
}


function speakJapaneseSafely(text) {

    const japanese =
        safeText(text);

    if (!japanese) {

        Toast.show(
            'No Japanese text is available.'
        );

        return false;
    }


    const engine =
        window.App?.VoiceEngine;


    if (
        engine &&
        typeof engine.speakWithProtection ===
            'function'
    ) {

        return engine.speakWithProtection(
            japanese,
            {
                lang: 'ja-JP'
            }
        );
    }


    Toast.show(
        'Voice output is not ready.'
    );

    return false;
}


export const CameraRenderer = {

    // ========================================================
    // DISPLAY OCR RESULT
    // ========================================================

    displayCard(
        data,
        autoSpeak = false
    ) {

        const result = {

            japanese:
                safeText(data?.japanese),

            romaji:
                safeText(data?.romaji),

            sinhala:
                safeText(data?.sinhala),

            english:
                safeText(data?.english),

            guide:
                safeText(data?.guide)
        };


        const jp =
            document.getElementById(
                'ar-jp'
            );

        const romaji =
            document.getElementById(
                'ar-romaji'
            );

        const sinhala =
            document.getElementById(
                'ar-si'
            );

        const english =
            document.getElementById(
                'ar-en'
            );

        const guide =
            document.getElementById(
                'ar-guide'
            );


        if (jp) {

            jp.textContent =
                result.japanese ||
                'No Japanese text detected';

            jp.style.fontWeight =
                '900';
        }


        if (romaji) {
            romaji.textContent =
                result.romaji;
        }


        if (sinhala) {

            sinhala.textContent =
                result.sinhala ||
                'සිංහල තේරුම නොලැබුණි.';
        }


        if (english) {

            english.textContent =
                result.english ||
                'English meaning was not detected.';
        }


        if (guide) {

            guide.textContent =
                result.guide ||
                'Point the camera at readable Japanese text and scan again.';
        }


        State.currentArJapanese =
            result.japanese;

        State.currentCameraResult =
            {
                ...result
            };


        if (
            autoSpeak &&
            result.japanese
        ) {

            speakJapaneseSafely(
                result.japanese
            );
        }
    },


    // ========================================================
    // CLEAR
    // ========================================================

    clearCard() {

        const jp =
            document.getElementById(
                'ar-jp'
            );

        const romaji =
            document.getElementById(
                'ar-romaji'
            );

        const sinhala =
            document.getElementById(
                'ar-si'
            );

        const english =
            document.getElementById(
                'ar-en'
            );

        const guide =
            document.getElementById(
                'ar-guide'
            );


        if (jp) {
            jp.textContent =
                'Ready to scan';
        }

        if (romaji) {
            romaji.textContent =
                'Point camera at Japanese text';
        }

        if (sinhala) {
            sinhala.textContent =
                'Japanese text එකක් camera එකට පෙන්වන්න.';
        }

        if (english) {
            english.textContent =
                'Point the camera at Japanese text and press Scan.';
        }

        if (guide) {
            guide.textContent =
                'The AI will explain visible Japanese signs, menus, notices, labels and workplace instructions.';
        }


        State.currentArJapanese =
            '';

        State.currentCameraResult = {
            japanese: '',
            romaji: '',
            sinhala: '',
            english: '',
            guide: ''
        };
    },


    // ========================================================
    // AR PRONUNCIATION
    // ========================================================

    speakArDetected() {

        const text =
            State.currentArJapanese;

        if (!text) {

            Toast.show(
                'No Japanese text has been detected yet.'
            );

            return false;
        }


        return speakJapaneseSafely(
            text
        );
    }
};
