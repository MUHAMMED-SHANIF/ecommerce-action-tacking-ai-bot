require('dotenv').config();

/**
 * Call Ollama API (local or ngrok)
 * @param {Array} messages - Chat messages
 * @param {Object} modelConfig - Configuration for the call
 */
async function callOllama(messages, modelConfig) {
    try {
        const url = process.env.OLLAMA_NGROK_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
        console.log(`[Ollama] Connecting to: ${url}`);
        const start = Date.now();

        const response = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '69420',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cache-Control': 'no-cache'
            },
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

        // Improved Extraction: Look for markdown JSON blocks first, then any { } block
        let jsonStr = '';
        const markdownMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        
        if (markdownMatch) {
            jsonStr = markdownMatch[1].trim();
        } else {
            const braceMatch = rawContent.match(/\{[\s\S]*\}/);
            jsonStr = braceMatch ? braceMatch[0].trim() : '';
        }

        if (!jsonStr) {
            throw new Error('No JSON structure found in AI response');
        }

        let parsedData;
        try {
            parsedData = JSON.parse(jsonStr);
        } catch (e) {
            // Last resort: Clean common errors (trailing commas, etc)
            const cleaned = jsonStr
                .replace(/,\s*\}/g, '}') 
                .replace(/,\s*\]/g, ']')
                .replace(/\\n/g, ' ')
                .trim();
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
