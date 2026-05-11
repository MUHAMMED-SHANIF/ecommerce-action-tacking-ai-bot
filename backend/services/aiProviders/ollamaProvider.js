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
                format: 'json',  // 🔑 Forces Ollama to ALWAYS output valid JSON (engine-level, not prompt-level)
                options: {
                    temperature: modelConfig.settings?.temperature || 0.1,
                    num_predict: modelConfig.settings?.num_predict || 800
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();
        const rawContent = data.message?.content || '';
        console.log(`[Ollama] Raw response (first 300 chars): ${rawContent.slice(0, 300)}`);

        // Improved Extraction: Look for markdown JSON blocks first, then any { } block
        let jsonStr = '';
        const markdownMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        
        if (markdownMatch) {
            jsonStr = markdownMatch[1].trim();
        } else {
            const braceMatch = rawContent.match(/\{[\s\S]*\}/);
            jsonStr = braceMatch ? braceMatch[0].trim() : '';
        }

        // Graceful fallback: if no JSON found, treat the raw text as a plain reply
        if (!jsonStr) {
            console.log('[Ollama] No JSON found, using raw text as reply fallback');
            return {
                success: true,
                data: { type: 'reply', reply: rawContent.trim() || "I'm here to help! What would you like to do?" },
                provider: 'ollama',
                model: modelConfig.model,
                latency: Date.now() - start
            };
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
