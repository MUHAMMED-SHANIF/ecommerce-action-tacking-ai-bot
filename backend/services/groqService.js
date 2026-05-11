require('dotenv').config();
const Groq = require('groq-sdk');

/**
 * Groq Cloud API Service
 * Model: llama-3.1-8b-instant (fast, free 14,400 req/day)
 * Used as PRIMARY model for customer AI.
 * 
 * HOW TO GET YOUR KEY:
 * 1. Go to https://console.groq.com
 * 2. Create account (free)
 * 3. API Keys → Create key
 * 4. Add to backend/.env as GROQ_API_KEY=gsk_xxxxx
 */

let groqClient = null;

const getGroqClient = () => {
    if (!groqClient) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('GROQ_API_KEY is not set in environment variables');
        }
        groqClient = new Groq({ apiKey });
    }
    return groqClient;
};

/**
 * Call Groq API with a system prompt + user message.
 * Returns parsed JSON object or throws on error.
 * 
 * @param {string} userMessage - The user's message
 * @param {string} systemPrompt - The system context/instructions
 * @returns {Promise<object>} Parsed JSON response from AI
 * @throws {Error} with code 'GROQ_RATE_LIMIT' on 429, or generic error
 */
const callGroq = async (userMessage, systemPrompt) => {
    const client = getGroqClient();
    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    try {
        console.log(`[Groq] Calling model: ${model}`);

        const response = await client.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.1,
            max_tokens: 1024,
            response_format: { type: 'json_object' }, // Guaranteed valid JSON
        });

        const rawContent = (response.choices[0]?.message?.content || '').trim();
        console.log(`[Groq] Raw response (${rawContent.length} chars)`);

        const parsed = JSON.parse(rawContent);
        return parsed;

    } catch (err) {
        // Detect rate limit error (429)
        if (err?.status === 429 || err?.message?.includes('rate_limit') || err?.message?.includes('Rate limit')) {
            console.warn('[Groq] Rate limit hit (429) — triggering Ollama fallback');
            const rateLimitErr = new Error('Groq rate limit exceeded');
            rateLimitErr.code = 'GROQ_RATE_LIMIT';
            throw rateLimitErr;
        }

        // Detect API key error
        if (err?.status === 401) {
            console.error('[Groq] Invalid API key — check GROQ_API_KEY in .env');
            const authErr = new Error('Groq authentication failed — check GROQ_API_KEY');
            authErr.code = 'GROQ_AUTH_ERROR';
            throw authErr;
        }

        console.error('[Groq] Error:', err.message);
        throw err;
    }
};

/**
 * Check if Groq is configured (API key present)
 */
const isGroqConfigured = () => {
    return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'));
};

module.exports = { callGroq, isGroqConfigured };
