export const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
        console.warn("Text-to-speech not supported by this browser.");
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Attempt to pick a natural sounding voice (e.g., Google US English)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.lang === 'en-US' || v.lang === 'en-GB');
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
};
