require('dotenv').config();
const Groq = require('groq-sdk');

let groq;
try {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
} catch (e) {
    console.error('[Groq Provider] Initialization error:', e.message);
}

/**
 * Call Groq API
 * @param {Array} messages - Chat messages
 * @param {Object} modelConfig - Configuration for the call
 */
async function callGroq(messages, modelConfig) {
    if (!groq) {
        return { success: false, error: 'GROQ_API_KEY not configured', code: 'CONFIG_ERROR' };
    }

    try {
        const start = Date.now();
        const completion = await groq.chat.completions.create({
            model: modelConfig.model,
            messages: messages,
            ...modelConfig.settings
        });

        const content = completion.choices[0].message.content;
        
        return {
            success: true,
            data: JSON.parse(content),
            provider: 'groq',
            model: modelConfig.model,
            latency: Date.now() - start
        };
    } catch (error) {
        const isRateLimit = error.status === 429 || error.message?.includes('rate limit');
        return {
            success: false,
            error: error.message,
            code: isRateLimit ? 429 : (error.status || 'ERROR'),
            provider: 'groq'
        };
    }
}

function isGroqConfigured() {
    return !!process.env.GROQ_API_KEY;
}

module.exports = { callGroq, isGroqConfigured };
