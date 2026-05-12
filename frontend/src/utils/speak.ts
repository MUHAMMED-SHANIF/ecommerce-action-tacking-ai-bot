import { pauseListening, resumeListening } from './voice';

export const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
        console.warn("Text-to-speech not supported by this browser.");
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip emojis and icons from speech
    const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Attempt to pick a natural sounding voice (e.g., Google US English)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.lang === 'en-US' || v.lang === 'en-GB');
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    // Prevent garbage collection bug in Chromium by keeping a reference
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).utterances = (window as any).utterances || [];
    (window as any).utterances.push(utterance);

    // Pause the microphone before we start speaking
    pauseListening();

    // Resume the microphone once the AI finishes speaking
    utterance.onend = () => {
        resumeListening();
        // Cleanup reference
        const idx = (window as any).utterances.indexOf(utterance);
        if (idx !== -1) (window as any).utterances.splice(idx, 1);
    };

    // Also resume on error just in case it breaks
    utterance.onerror = () => {
        resumeListening();
        // Cleanup reference
        const idx = (window as any).utterances.indexOf(utterance);
        if (idx !== -1) (window as any).utterances.splice(idx, 1);
    };

    window.speechSynthesis.speak(utterance);
};

