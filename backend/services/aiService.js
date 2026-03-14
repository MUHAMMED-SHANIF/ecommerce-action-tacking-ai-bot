require('dotenv').config();
const { buildToolsPrompt } = require('../tools');

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

        // Build conversation history string
        const historyStr = history.length > 0
            ? `\nConversation History (last ${history.length} messages):\n` +
              history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.message}`).join('\n')
            : '';

        // Build user context string
        let contextStr = '';
        if (userContext) {
            const { profile, orders, cart, addresses } = userContext;
            const recentOrders = (orders || []).slice(0, 3).map(o =>
                `Order #${o.id?.split('-')[0]} - ${o.status} - ₹${o.total_price || o.total_amount}`
            ).join('; ');
            const cartItems = (cart || []).map(c =>
                `${c.products?.name} x${c.quantity}`
            ).join(', ');
            contextStr = `
User Context:
- Name: ${profile?.full_name || 'Customer'}
- Recent Orders: ${recentOrders || 'None'}
- Cart: ${cartItems || 'Empty'}
- Saved Addresses: ${(addresses || []).length} address(es)`;
        }

        const SYSTEM_PROMPT = `You are ActionBot, a friendly and helpful AI shopping assistant for EMart, an e-commerce platform.
You help customers search products, get recommendations, compare items, track orders, cancel orders, and more.

${historyStr}
${contextStr}

You have access to the following tools:
${toolsPrompt}

RESPONSE RULES (CRITICAL):
1. You MUST respond with ONLY raw valid JSON — no markdown, no explanation, no code blocks.
2. Choose ONE of these response types:

Type A — Conversational reply (no tool needed):
{"type": "reply", "text": "your friendly response here"}

Type B — Tool call (action needed):
{"type": "tool_call", "tool": "tool_name_here", "params": {"param_key": "value"}}

Type C — Confirmation needed (for tools marked REQUIRES USER CONFIRMATION):
{"type": "confirmation_request", "action": "tool_name_here", "params": {...}, "question": "Human-readable confirmation question?"}

IMPORTANT RULES:
- For cancel_order, create_order, update_address: ALWAYS use type "confirmation_request" first
- Only use type "tool_call" for tools that do NOT require confirmation
- If the user says "yes", "confirm", "go ahead", "proceed" after a confirmation request: use type "tool_call"
- If the user says "no", "cancel", "nevermind": use type "reply" to acknowledge
- Keep "text" and "question" fields friendly, concise, and natural
- Never reveal internal logic or mention "tool_call" to users
- Currency is Indian Rupees (₹)`;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'mistral',
                prompt: `${SYSTEM_PROMPT}\n\nUser Message: "${userText}"\n\nJSON Response:`,
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
        const rawContent = (data.response || '').trim();

        // Parse and validate
        const parsed = JSON.parse(rawContent);
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
