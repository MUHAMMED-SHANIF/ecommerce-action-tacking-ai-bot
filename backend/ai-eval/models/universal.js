const { OpenAI } = require('openai');

/**
 * Universal adapter for any OpenAI-compatible API (Ollama, LMStudio, Groq, OpenAI, etc.)
 */
async function callUniversalAI(prompt, systemPrompt) {
    const startTime = Date.now();
    try {
        const baseURL = process.env.EVAL_AI_BASE_URL || 'http://localhost:11434/v1';
        const apiKey = process.env.EVAL_AI_API_KEY || 'ollama';
        const model = process.env.EVAL_AI_MODEL || 'mistral';

        const openai = new OpenAI({
            baseURL: baseURL,
            apiKey: apiKey,
        });

        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            // Only enforce json format if it's explicitly supported, but most OpenAI-compat APIs support it,
            // or just rely on the system prompt for older models.
            response_format: { type: "json_object" },
        });

        const endTime = Date.now();
        let rawContent = (response.choices[0].message.content || '').trim();

        // Strip code blocks if present
        rawContent = rawContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        return {
            raw: rawContent,
            parsed: JSON.parse(rawContent),
            latency: endTime - startTime,
            error: null
        };
    } catch (error) {
        return {
            raw: null,
            parsed: null,
            latency: Date.now() - startTime,
            error: error.message
        };
    }
}

module.exports = { callUniversalAI };
