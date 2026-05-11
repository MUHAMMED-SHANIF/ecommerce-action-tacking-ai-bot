require('dotenv').config();

/**
 * Call Ollama API (local or ngrok)
 * @param {Array} messages - Chat messages
 * @param {Object} modelConfig - Configuration for the call
 */
async function callOllama(messages, modelConfig) {
    try {
        const url = process.env.OLLAMA_NGROK_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
        const start = Date.now();

        const response = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelConfig.model,
                messages: messages,
                stream: false,
                options: {
                    temperature: modelConfig.settings?.temperature || 0.1,
                    num_predict: modelConfig.settings?.num_predict || 500
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();
        const rawContent = data.message?.content || '';

        // Extract JSON (handle potential markdown/text)
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in Ollama response');
        }

        let parsedData;
        try {
            parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
            // Fallback: try cleaning common AI errors
            const cleaned = jsonMatch[0]
                .replace(/,\s*\}/g, '}') // trailing commas
                .replace(/,\s*\]/g, ']');
            parsedData = JSON.parse(cleaned);
        }

        return {
            success: true,
            data: parsedData,
            provider: 'ollama',
            model: modelConfig.model,
            latency: Date.now() - start
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            provider: 'ollama'
        };
    }
}

module.exports = { callOllama };
