window.App = window.App || {};

App.VoiceRenderer = {
    updateMicVisuals(active) {
        const avatar = document.getElementById('mic-avatar-btn');
        const dot = document.getElementById('listening-badge-dot');
        const label = document.getElementById('mic-status-label');
        const icon = document.getElementById('mic-live-icon');
        if (avatar) {
            if (active) {
                avatar.classList.add('listening-glow');
                if (dot) dot.classList.remove('hidden');
                if (label) label.textContent = `Live Ear: Listening (${App.State.activeSpeakerLang})...`;
                if (icon) icon.className = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
            } else {
                avatar.classList.remove('listening-glow');
                if (dot) dot.classList.add('hidden');
                if (label) label.textContent = "Listening Paused";
                if (icon) icon.className = "w-2 h-2 rounded-full bg-gray-400";
            }
        }
    },

    renderConversation(data) {
        if (!data) return;

        document.getElementById('detected-japanese').textContent = data.japanese || '';
        document.getElementById('detected-romaji').textContent = data.romaji ? `(${data.romaji})` : '';
        document.getElementById('detected-sinhala').textContent = data.sinhala || '';
        document.getElementById('detected-english').textContent = data.english || '';

        const list = document.getElementById('suggestions-list');
        if (!list || !data.replies) return;

        list.innerHTML = '';
        data.replies.forEach((rep) => {
            const card = document.createElement('div');
            card.className = "bg-white p-2.5 rounded-2xl shadow-sm border border-emerald-100 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-between";
            card.onclick = () => App.VoiceTTS.speakReplyOption(rep.jp);

            const leftDiv = document.createElement('div');
            leftDiv.className = "flex-1 pr-2";

            const headerDiv = document.createElement('div');
            headerDiv.className = "flex items-center gap-1.5";

            const badgeSpan = App.Security.createTextElement('span', "text-[9px] bg-brandGreen/20 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded", rep.badge || 'Reply');
            const jpSpan = App.Security.createTextElement('span', "text-xs font-black text-gray-900", rep.jp || '');

            headerDiv.appendChild(badgeSpan);
            headerDiv.appendChild(jpSpan);

            const romajiP = App.Security.createTextElement('p', "text-[10px] text-emerald-700 font-semibold mt-0.5", rep.romaji ? `(${rep.romaji})` : '');

            const transDiv = document.createElement('div');
            transDiv.className = "flex flex-col mt-0.5 text-[10px]";

            const siP = App.Security.createTextElement('p', "text-gray-700 font-semibold", `🇱🇰 ${rep.sinhala || ''}`);
            const enP = App.Security.createTextElement('p', "text-gray-500 font-medium", `🇬🇧 ${rep.english || ''}`);

            transDiv.appendChild(siP);
            transDiv.appendChild(enP);

            leftDiv.appendChild(headerDiv);
            leftDiv.appendChild(romajiP);
            leftDiv.appendChild(transDiv);

            const rightIcon = document.createElement('div');
            rightIcon.className = "w-8 h-8 rounded-full bg-brandGreen/20 text-emerald-800 flex items-center justify-center shrink-0";
            
            const iconElem = document.createElement('i');
            iconElem.className = 'ph ph-speaker-high text-base';
            rightIcon.appendChild(iconElem);

            card.appendChild(leftDiv);
            card.appendChild(rightIcon);
            list.appendChild(card);
        });
    }
};
