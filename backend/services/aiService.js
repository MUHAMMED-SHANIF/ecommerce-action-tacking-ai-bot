require('dotenv').config();
const { buildToolsPrompt } = require('../tools');

/**
 * Rewrites ordinal references like "the first one", "second one" into actual product names.
 * Returns the rewritten text.
 */
const resolveOrdinalRefs = (text, products) => {
    if (!products || products.length === 0) return text;

    const ordinals = [
        ['first', 0], ['second', 1], ['third', 2], ['fourth', 3],
        ['fifth', 4], ['1st', 0], ['2nd', 1], ['3rd', 2], ['4th', 3], ['5th', 4],
        ['number 1', 0], ['number 2', 1], ['number 3', 2],
        ['#1', 0], ['#2', 1], ['#3', 2]
    ];

    let result = text;
    for (const [word, index] of ordinals) {
        const product = products[index];
        if (!product) continue;
        // Replace "the first one", "first product", "first item", "first one"
        const pattern = new RegExp(`\\b(the\\s+)?${word}(\\s+(one|product|item|phone|laptop|tv|device))?\\b`, 'gi');
        result = result.replace(pattern, product.name);
    }
    return result;
};

/**
 * Extract intent and tool call from user message using Ollama/Mistral.
 * 
 * @param {string} userText - The user's message
 * @param {Array}  history  - Last N messages [{role, message}]
 * @param {object} userContext - Profile, orders, cart summary
 * @returns {object} { type, text?, tool?, params?, question?, action?, pendingParams? }
 */
const extractIntent = async (userText, history = [], userContext = null) => {
    try {
        // Build dynamic tools list from registry
        const toolsPrompt = buildToolsPrompt();

        // Pre-process: resolve ordinal references ("second one", "first item") into real product names
        const resolvedText = resolveOrdinalRefs(userText, userContext?.lastProducts);
        if (resolvedText !== userText) {
            console.log(`[AI Service] Resolved ordinal ref: "${userText}" -> "${resolvedText}"`);
        }

        // Build conversation history string
        const historyStr = history.length > 0
            ? `\nConversation History (last ${history.length} messages):\n` +
              history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.message}`).join('\n')
            : '';

        // Build user context string
        let contextStr = '';
        if (userContext) {
            const { profile, orders, cart, addresses, lastProducts } = userContext;
            const recentOrders = (orders || []).slice(0, 3).map(o =>
                `Order #${o.id?.split('-')[0]} - ${o.status} - ₹${o.total_price || o.total_amount}`
            ).join('; ');
            const cartItems = (cart || []).map(c =>
                `${c.products?.name} x${c.quantity}`
            ).join(', ');
            
            let lastProductsStr = 'None';
            if (lastProducts && lastProducts.length > 0) {
                lastProductsStr = lastProducts.map((p, i) => `${i + 1}. ${p.name} (₹${p.price})`).join('\n  ');
            }

            contextStr = `
User Context:
- Name: ${profile?.full_name || 'Customer'}
- Recent Orders: ${recentOrders || 'None'}
- Cart: ${cartItems || 'Empty'}
- Saved Addresses: ${(addresses || []).length} address(es)

Recently Shown Products (Index 1 is the 'first one'):
  ${lastProductsStr}`;
        }

        const SYSTEM_PROMPT = `You are ActionBot, a friendly and helpful AI shopping assistant for EMart, an e-commerce platform.
You help customers search products, get recommendations, compare items, track orders, cancel orders, and more.

${historyStr}
${contextStr}

You have access to the following tools:
${toolsPrompt}

RESPONSE RULES (CRITICAL):
1. You MUST respond with ONLY raw valid JSON — no markdown, no explanation, no code blocks.
2. If a tool definition contains "[REQUIRES USER CONFIRMATION]", you MUST NOT use "tool_call". You MUST use "confirmation_request" FIRST.
3. Choose ONE of these response types:

Type A — Conversational reply (no tool needed):
{"type": "reply", "text": "your friendly response here"}

Type B — Tool call (action needed, BUT NOT FOR CONFIRMATION TOOLS):
{"type": "tool_call", "tool": "tool_name_here", "params": {"param_key": "value"}, "text_on_success": "Friendly sentence if the action succeeds.", "text_on_failure": "Friendly apology if the action fails or finds nothing."}

Type C — Confirmation needed (STRICTLY REQUIRED for cancel_order, create_order, update_address, etc):
{"type": "confirmation_request", "action": "tool_name_here", "params": {"param_key": "value"}, "question": "Are you sure you want to buy [Item] for [Price]?"}

IMPORTANT RULES:
- NEVER use type "tool_call" for cancel_order, create_order, or update_address unless the user has explicitly said "yes" to your previous confirmation_request.
- If the user says "yes", "confirm", "go ahead" immediately after a Type C confirmation request: use type "tool_call" to execute it.
- If the user says "no", "cancel": use type "reply" to acknowledge cancellation.
- Keep "text" and "question" fields friendly, concise, and natural.
- Currency is Indian Rupees (₹)`;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'mistral',
                prompt: `${SYSTEM_PROMPT}\n\nUser Message: "${resolvedText}"\n\nJSON Response:`,
                stream: false,
                format: 'json',
                options: { temperature: 0.1, num_predict: 512 }
            })
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => 'unknown');
            throw new Error(`Ollama unavailable (${response.status}): ${errText}`);
        }

        const data = await response.json();
        let rawContent = (data.response || '').trim();
        
        // Strip markdown json formatting if Mistral hallucinates it
        if (rawContent.startsWith('```json')) {
            rawContent = rawContent.replace(/^```json\s*/, '');
            rawContent = rawContent.replace(/\s*```$/, '');
        } else if (rawContent.startsWith('```')) {
            rawContent = rawContent.replace(/^```\s*/, '');
            rawContent = rawContent.replace(/\s*```$/, '');
        }

        // Parse and validate
        let parsed = JSON.parse(rawContent);
        
        // --- Normalization for Mistral Quirks ---
        // 1. If it missed 'type' entirely but provided 'tool' or 'action'
        if (!parsed.type) {
            if (parsed.tool || parsed.action) parsed.type = 'tool_call';
        }
        
        // 2. If 'type' is not one of our standard 3 (e.g., 'action', 'search_products')
        if (parsed.type && !['reply', 'tool_call', 'confirmation_request'].includes(parsed.type)) {
            const actualTool = parsed.tool || parsed.action || parsed.name || parsed.type;
            parsed = {
                type: 'tool_call',
                tool: actualTool,
                params: parsed.params || {}
            };
        }
        
        // 3. Ensure 'tool' field exists for tool_calls
        if (parsed.type === 'tool_call' && !parsed.tool) {
            parsed.tool = parsed.action || parsed.name;
        }

        // 4. Fallback safety
        if (!parsed.type) throw new Error('Missing type field in AI response');
        
        return parsed;

    } catch (error) {
        console.error('[AI Service] Error:', error.message);
        // Graceful fallback — don't crash the whole request
        return {
            type: 'reply',
            text: error.message.includes('Ollama') || error.message.includes('fetch')
                ? "I'm having trouble connecting to my brain right now. Please make sure Ollama is running with the Mistral model."
                : "I'm sorry, I had trouble understanding that. Could you rephrase your request?"
        };
    }
};

module.exports = { extractIntent };
