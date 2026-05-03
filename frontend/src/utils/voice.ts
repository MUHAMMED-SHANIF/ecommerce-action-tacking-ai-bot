// Continuous listening voice utility with stop command detection

const STOP_COMMANDS = ['stop', 'end conversation', 'cancel assistant', 'thank you', 'thanks', 'bye', 'goodbye', 'exit', 'shut up', 'disable voice'];

let recognition: any = null;
let shouldContinue = false;
let isPaused = false;
let silenceTimer: any = null;
let lastStartTime = 0;
let restartTimer: any = null;

// Store callbacks at module level to be accessible by startInstance
let onResultCb: (text: string) => void = () => {};
let onStopCb: () => void = () => {};
let onErrorCb: (err: any) => void = () => {};
let onInterimResultCb: (text: string) => void = () => {};

export const startContinuousListening = async (
    onResult: (text: string) => void,
    onStop: () => void,
    onError?: (err: any) => void,
    onInterimResult?: (text: string) => void
) => {
    const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        onError?.('Speech recognition not supported in this browser. Try Chrome or Edge.');
        return;
    }

    try {
        // Explicitly request microphone permission first (fixes issues in Chrome/Safari)
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error("Microphone access denied:", err);
        onError?.("Microphone permission denied. Please allow microphone access in your browser settings.");
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

    // Prevent rapid double-starts by queuing them so mics never permanently die
    clearTimeout(restartTimer);
    const now = Date.now();
    if (now - lastStartTime < 200) {
        restartTimer = setTimeout(startInstance, 200);
        return;
    }
    lastStartTime = now;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Fully cleanup old instance first
    if (recognition) {
        recognition.onend = null;
        recognition.onresult = null;
        recognition.onerror = null;
        try { recognition.abort(); } catch (_) {}
    }

    console.log("Voice: Initializing new instance...");
    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Optimizing accuracy for Indian English
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
        }, 1200); // 1.2s allows natural speaking pauses without triggering Chrome's stall penalty
    };

    recognition.onerror = (event: any) => {
        if (isPaused || !shouldContinue) return;
        
        console.warn("Voice Error:", event.error);
        if (event.error === 'no-speech') return; 
        if (event.error === 'network') {
            if (shouldContinue && !isPaused) setTimeout(startInstance, 1000);
            return;
        }
        if (event.error === 'aborted') return;
        onErrorCb(event.error);
    };

    recognition.onend = () => {
        if (shouldContinue && !isPaused) {
            setTimeout(startInstance, 50);
        } else if (!shouldContinue) {
            console.log("Voice: Session ended");
            onStopCb();
        }
    };

    try {
        recognition.start();
    } catch (err) {
        console.error("Voice Start Failed:", err);
        if (shouldContinue && !isPaused) setTimeout(startInstance, 1000);
    }
};

const restart = () => {
    clearTimeout(silenceTimer);
    try { 
        if (recognition) {
            recognition.stop(); // Graceful stop prevents Web Speech API crashes
        }
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
        if (recognition) {
            recognition.onend = null; // Prevent it from trying to start again
            recognition.abort();
            recognition = null;
        }
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
    try { 
        if (recognition) recognition.abort(); 
    } catch (_) {}
};

/**
 * Resume listening after a pause
 */
export const resumeListening = () => {
    if (isPaused && shouldContinue) {
        console.log("Voice: Resumed");
        isPaused = false;
        // Start a fresh instance now that we're unpaused
        setTimeout(startInstance, 50);
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
