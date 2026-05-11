require('dotenv').config();

/**
 * Ollama Service (via ngrok or localhost)
 * 
 * PRIMARY for: Seller AI, Admin AI (private, unlimited, runs on your laptop)
 * FALLBACK for: Customer AI when Groq rate-limits
 * 
 * HOW TO SET UP NGROK FOR HOSTED SITE:
 * 1. Install ngrok: https://ngrok.com/download
 * 2. Sign up for free account at https://ngrok.com
 * 3. Run: ngrok config add-authtoken YOUR_TOKEN
 * 4. Start Ollama: ollama serve
 * 5. In a new terminal: ngrok http 11434
 * 6. Copy the https URL (e.g. https://abc123.ngrok-free.app)
 * 7. Add to backend/.env: OLLAMA_NGROK_URL=https://abc123.ngrok-free.app
 * 
 * FOR LOCAL DEVELOPMENT:
 * Leave OLLAMA_NGROK_URL unset — it defaults to http://localhost:11434
 */

const getOllamaBaseUrl = () => {
    return process.env.OLLAMA_NGROK_URL || 'http://localhost:11434';
};

const getOllamaModel = (role = 'user') => {
    // Different models per role (optional — you can use same model)
    if (role === 'seller' || role === 'admin') {
        return process.env.OLLAMA_SELLER_MODEL || process.env.OLLAMA_MODEL || 'mistral';
    }
    return process.env.OLLAMA_MODEL || 'mistral'; // Customer fallback model
};

/**
 * Strip markdown code blocks from AI response (Ollama sometimes wraps JSON in ```json```)
 */
const stripMarkdown = (text) => {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return cleaned.trim();
};

/**
 * Call Ollama API (local or via ngrok)
 * 
 * @param {string} userMessage - The user's message
 * @param {string} systemPrompt - The system context/instructions
 * @param {string} role - User role (affects model selection)
 * @returns {Promise<object>} Parsed JSON response from AI
 */
const callOllama = async (userMessage, systemPrompt, role = 'user') => {
    const baseUrl = getOllamaBaseUrl();
    const model = getOllamaModel(role);

    console.log(`[Ollama] Calling ${model} at ${baseUrl} (role: ${role})`);

    const requestBody = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        stream: false,
        options: {
            temperature: 0.1,
            num_predict: 1024
        }
    };

    let response;
    try {
        response = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // ngrok requires this header to bypass browser warning
                'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(60000) // 60s timeout for local model
        });
    } catch (fetchErr) {
        if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
            throw new Error('Ollama request timed out after 60s. Is Ollama running?');
        }
        throw new Error(`Cannot reach Ollama at ${baseUrl}. Is it running? Error: ${fetchErr.message}`);
    }

    if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown error');
        throw new Error(`Ollama returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data?.message?.content || '';

    if (!rawContent) {
        throw new Error('Ollama returned empty response');
    }

    console.log(`[Ollama] Raw response (${rawContent.length} chars)`);

    // First attempt: parse directly
    try {
        return JSON.parse(rawContent.trim());
    } catch (_) {}

    // Second attempt: strip markdown code blocks (Ollama quirk)
    try {
        return JSON.parse(stripMarkdown(rawContent));
    } catch (_) {}

    // Third attempt: extract first JSON object from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (_) {}
    }

    throw new Error(`Ollama response is not valid JSON: ${rawContent.substring(0, 200)}`);
};

/**
 * Check if Ollama is reachable
 */
const isOllamaReachable = async () => {
    const baseUrl = getOllamaBaseUrl();
    try {
        const res = await fetch(`${baseUrl}/api/tags`, {
            signal: AbortSignal.timeout(3000),
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        return res.ok;
    } catch {
        return false;
    }
};

module.exports = { callOllama, isOllamaReachable, getOllamaModel };
