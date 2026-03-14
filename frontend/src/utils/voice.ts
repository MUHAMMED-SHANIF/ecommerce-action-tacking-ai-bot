// Continuous listening voice utility with stop command detection

const STOP_COMMANDS = ['stop', 'end conversation', 'cancel assistant', 'thank you', 'thanks', 'bye', 'goodbye', 'exit', 'shut up', 'disable voice'];

let recognition: any = null;
let shouldContinue = false;
let isPaused = false;
let silenceTimer: any = null;

// Store callbacks at module level to be accessible by startInstance
let onResultCb: (text: string) => void = () => {};
let onStopCb: () => void = () => {};
let onErrorCb: (err: any) => void = () => {};
let onInterimResultCb: (text: string) => void = () => {};

export const startContinuousListening = (
    onResult: (text: string) => void,
    onStop: () => void,
    onError?: (err: any) => void,
    onInterimResult?: (text: string) => void
) => {
    const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        onError?.('Speech recognition not supported in this browser. Try Chrome.');
        return;
    }

    onResultCb = onResult;
    onStopCb = onStop;
    if (onError) onErrorCb = onError;
    if (onInterimResult) onInterimResultCb = onInterimResult;

    shouldContinue = true;
    isPaused = false;

    startInstance();
};

const startInstance = () => {
    if (!shouldContinue || isPaused) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    console.log("Voice: Initializing new instance...");
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true; 
    recognition.continuous = false; 
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        console.log("Voice: Microphone active");
    };

    recognition.onresult = (event: any) => {
        if (isPaused) return;

        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }

        const currentText = transcript.trim();
        if (!currentText) return;

        onInterimResultCb(currentText);

        const lower = currentText.toLowerCase();
        if (STOP_COMMANDS.some(cmd => lower.includes(cmd))) {
            console.log("Voice: Stop command detected");
            stopListening();
            return;
        }

        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
            if (shouldContinue && !isPaused && currentText.length > 0) {
                console.log("Voice: Phrase final, processing:", currentText);
                onResultCb(currentText);
                restart(); 
            }
        }, 2000);
    };

    recognition.onerror = (event: any) => {
        if (isPaused || !shouldContinue) return;
        
        console.warn("Voice Error:", event.error);
        if (event.error === 'no-speech') return; 
        if (event.error === 'network') {
            if (shouldContinue && !isPaused) setTimeout(restart, 2000);
            return;
        }
        if (event.error === 'aborted') return;
        onErrorCb(event.error);
    };

    recognition.onend = () => {
        if (shouldContinue && !isPaused) {
            setTimeout(startInstance, 100);
        } else if (!shouldContinue) {
            console.log("Voice: Session ended");
            onStopCb();
        }
    };

    try {
        recognition.start();
    } catch (err) {
        console.error("Voice Start Failed:", err);
        if (shouldContinue && !isPaused) setTimeout(restart, 1000);
    }
};

const restart = () => {
    clearTimeout(silenceTimer);
    try { 
        recognition?.abort(); 
    } catch (_) {}
};

/**
 * Stop the current listening session completely
 */
export const stopListening = () => {
    shouldContinue = false;
    isPaused = false;
    clearTimeout(silenceTimer);
    try {
        recognition?.abort();
        recognition = null;
    } catch (_) {}
    onStopCb();
};

/**
 * Temporarily pause listening (e.g. while AI is speaking)
 */
export const pauseListening = () => {
    if (!shouldContinue) return;
    isPaused = true;
    console.log("Voice: Paused");
    clearTimeout(silenceTimer);
    try { recognition?.abort(); } catch (_) {}
};

/**
 * Resume listening after a pause
 */
export const resumeListening = () => {
    if (isPaused && shouldContinue) {
        console.log("Voice: Resumed");
        isPaused = false;
        // Start a fresh instance now that we're unpaused
        setTimeout(startInstance, 100);
    } else {
        isPaused = false;
    }
};


/**
 * Check if listening is currently active (and not paused)
 */
export const isListeningActive = () => shouldContinue && !isPaused;

// ----- Single-shot listener (kept for compatibility) -----
export const startListening = (
    onResult: (text: string) => void,
    onError?: (err: any) => void
) => {
    const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        onError?.('Speech recognition not supported.');
        return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
        onResult(event.results[0][0].transcript.trim());
    };
    rec.onerror = (event: any) => onError?.(event.error);
    rec.start();
};
