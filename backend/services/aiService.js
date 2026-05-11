require('dotenv').config();
const { buildToolsPromptForRole } = require('../tools');
const { callGroq, isGroqConfigured } = require('./groqService');
const { callOllama } = require('./ollamaService');

// ─────────────────────────────────────────────────────────────────
// PERSONAS per role
// ─────────────────────────────────────────────────────────────────
const PERSONAS = {
    user: `You are Aria, a friendly and enthusiastic shopping assistant for EMart, an Indian e-commerce platform.
You help customers search products, get recommendations, compare items, track orders, cancel orders, and more.
You are warm, helpful, and speak naturally like a knowledgeable salesperson. Use ₹ for prices.`,

    seller: `You are a professional business intelligence assistant for sellers on E-Mart.
You are data-driven, concise, and focus on actionable insights.
When showing reports, always highlight the most important insight first.
Use business language: "Your top performer this month is...", "Revenue is up 15% vs last week"
End with a question like: "Want me to download the full breakdown as CSV?" or "Should I check your pending orders too?"`,

    admin: `You are the EMart platform operations assistant for the admin team.
You help administrators monitor platform health, manage users and sellers, review products, and track revenue.
You are formal, precise, and metrics-focused. Use exact numbers. Flag urgent items clearly.
When multiple things need attention, prioritize: 1) Pending approvals 2) Urgent orders 3) Revenue anomalies.`
};

// ─────────────────────────────────────────────────────────────────
// RESPONSE RULES — injected into every system prompt
// ─────────────────────────────────────────────────────────────────
const RESPONSE_RULES = `
RESPONSE RULES (CRITICAL — NEVER BREAK THESE):
1. You MUST respond with ONLY raw valid JSON — no markdown, no explanation, no code blocks.
2. If a tool definition contains "[REQUIRES USER CONFIRMATION]", you MUST use "confirmation_request" first.
3. Choose EXACTLY ONE of these response types:

Type A — Conversational reply (no tool needed):
{"type": "reply", "text": "your friendly response here"}

Type B — Tool call (action needed):
{"type": "tool_call", "tool": "tool_name_here", "params": {"key": "value"}, "text_on_success": "Friendly message if action succeeds.", "text_on_failure": "Friendly message if action fails."}

Type C — Confirmation needed (REQUIRED for destructive actions):
{"type": "confirmation_request", "action": "tool_name_here", "params": {"key": "value"}, "question": "Are you sure you want to...?"}

Type D — Multi-step (when multiple actions needed in sequence):
{"type": "multi_step", "steps": [{"tool": "tool1", "params": {}}, {"tool": "tool2", "params": {}}], "text": "I'll do step1, then step2..."}`;

// ─────────────────────────────────────────────────────────────────
// TOOL EXAMPLES by role
// ─────────────────────────────────────────────────────────────────
const EXAMPLES = {
    user: `EXAMPLES:
- User: "show me phones" → {"type": "tool_call", "tool": "search_products", "params": {"query": "phone"}, "text_on_success": "Found some phones for you!"}
- User: "add it to cart" → {"type": "tool_call", "tool": "add_to_cart", "params": {"product_name": "<last product shown>"}}
- User: "cancel my order" → {"type": "confirmation_request", "action": "cancel_order", "params": {}, "question": "Which order would you like to cancel?"}
- User: "just chatting" → {"type": "reply", "text": "Of course! How can I help you today?"}`,

    seller: `EXAMPLES:
- Seller: "show my sales this month" → {"type": "tool_call", "tool": "seller_sales_report", "params": {"from_date": "2026-05-01", "to_date": "2026-05-31"}, "text_on_success": "Here's your sales report for this month."}
- Seller: "which products are selling best?" → {"type": "tool_call", "tool": "seller_best_products", "params": {"limit": 5, "time_period": "month"}}
- Seller: "check my inventory" → {"type": "tool_call", "tool": "seller_check_inventory", "params": {}}
- Seller: "how many orders today?" → {"type": "tool_call", "tool": "seller_revenue_today", "params": {}}
- Seller: "pause product iPhone 15" → {"type": "confirmation_request", "action": "seller_pause_product", "params": {"product_id": "<id>"}, "question": "Are you sure you want to pause iPhone 15 from the store?"}`,

    admin: `EXAMPLES:
- Admin: "show platform revenue this week" → {"type": "tool_call", "tool": "admin_platform_revenue", "params": {"from_date": "2026-05-05", "to_date": "2026-05-11"}}
- Admin: "how many pending products?" → {"type": "tool_call", "tool": "admin_pending_products", "params": {}}
- Admin: "approve product <id>" → {"type": "confirmation_request", "action": "admin_approve_product", "params": {"product_id": "<id>"}, "question": "Approve this product and make it live on the store?"}
- Admin: "show all sellers" → {"type": "tool_call", "tool": "admin_all_sellers", "params": {}}
- Admin: "platform stats" → {"type": "tool_call", "tool": "admin_platform_stats", "params": {}}`
};

// ─────────────────────────────────────────────────────────────────
// ORDINAL REFERENCE RESOLVER (keeps existing customer AI working)
// ─────────────────────────────────────────────────────────────────
const resolveOrdinalRefs = (text, products) => {
    if (!products || products.length === 0) return text;
    const ordinals = [
        ['first', 0], ['second', 1], ['third', 2], ['fourth', 3], ['fifth', 4],
        ['1st', 0], ['2nd', 1], ['3rd', 2], ['4th', 3], ['5th', 4],
        ['number 1', 0], ['number 2', 1], ['number 3', 2],
        ['#1', 0], ['#2', 1], ['#3', 2]
    ];
    let result = text;
    for (const [word, index] of ordinals) {
        const product = products[index];
        if (!product) continue;
        const pattern = new RegExp(`\\b(the\\s+)?${word}(\\s+(one|product|item|phone|laptop|tv|device))?\\b`, 'gi');
        result = result.replace(pattern, product.name);
    }
    if (products.length > 0 && products[0]) {
        const topProduct = products[0].name;
        result = result.replace(/\b(this one|that one|this|that|it)\b/gi, topProduct);
    }
    return result;
};

// ─────────────────────────────────────────────────────────────────
// BUILD SYSTEM PROMPT for role
// ─────────────────────────────────────────────────────────────────
const buildSystemPrompt = (role, toolsPrompt, historyStr, contextStr) => {
    const persona = PERSONAS[role] || PERSONAS.user;
    const examples = EXAMPLES[role] || EXAMPLES.user;

    return `${persona}

${historyStr}
${contextStr}

You have access to the following tools:
${toolsPrompt}

${RESPONSE_RULES}

${examples}

ADDITIONAL RULES:
- Currency is Indian Rupees (₹) (INR)
- Keep "text", "text_on_success", "question" fields friendly and concise
- If you don't know something, use a tool to find out rather than guessing
- For date ranges, use today's date: ${new Date().toISOString().split('T')[0]}`;
};

// ─────────────────────────────────────────────────────────────────
// FLEXIBLE MODEL ROUTER — reads env vars at call time
// ─────────────────────────────────────────────────────────────────

/**
 * Determine which AI provider to use for this role, then call it.
 * Falls back Groq→Ollama automatically on rate limit / auth errors.
 *
 * AI_ROUTING_MODE options (set in backend/.env):
 *   'split'      → Customer: Groq, Seller: Ollama, Admin: Ollama   [DEFAULT]
 *   'all_groq'   → Everyone: Groq
 *   'all_ollama' → Everyone: Ollama (local or ngrok)
 *   'custom'     → Per-role env vars:
 *                    CUSTOMER_AI_PROVIDER=groq|ollama
 *                    SELLER_AI_PROVIDER=groq|ollama
 *                    ADMIN_AI_PROVIDER=groq|ollama
 *
 * @param {string} role - 'user' | 'seller' | 'admin'
 * @param {string} message - Resolved user message
 * @param {string} systemPrompt - Full assembled system prompt
 * @returns {Promise<object>} Parsed AI JSON response
 */
const resolveAndCall = async (role, message, systemPrompt) => {
    const mode = (process.env.AI_ROUTING_MODE || 'split').toLowerCase();

    // Resolve provider for this role based on mode
    let provider;
    if (mode === 'all_groq') {
        provider = 'groq';
    } else if (mode === 'all_ollama') {
        provider = 'ollama';
    } else if (mode === 'custom') {
        const providerMap = {
            user: process.env.CUSTOMER_AI_PROVIDER || 'groq',
            seller: process.env.SELLER_AI_PROVIDER || 'ollama',
            admin: process.env.ADMIN_AI_PROVIDER || 'ollama',
        };
        provider = providerMap[role] || 'ollama';
    } else {
        // Default: 'split' — Customer→Groq, Seller/Admin→Ollama
        provider = (role === 'user') ? 'groq' : 'ollama';
    }

    console.log(`[AI Router] mode=${mode} | role=${role} | provider=${provider}`);

    // Try primary provider
    if (provider === 'groq') {
        if (!isGroqConfigured()) {
            console.warn('[AI Router] Groq selected but GROQ_API_KEY not set → falling back to Ollama');
            return await callOllama(message, systemPrompt, role);
        }
        try {
            return await callGroq(message, systemPrompt);
        } catch (err) {
            if (err.code === 'GROQ_RATE_LIMIT' || err.code === 'GROQ_AUTH_ERROR') {
                console.warn(`[AI Router] Groq failed (${err.code}) → falling back to Ollama`);
                return await callOllama(message, systemPrompt, role);
            }
            console.warn(`[AI Router] Groq error → falling back to Ollama: ${err.message}`);
            return await callOllama(message, systemPrompt, role);
        }
    } else {
        // 'ollama' — try Ollama, optionally fall back to Groq if configured
        try {
            return await callOllama(message, systemPrompt, role);
        } catch (ollamaErr) {
            if (isGroqConfigured()) {
                console.warn(`[AI Router] Ollama failed → falling back to Groq: ${ollamaErr.message}`);
                return await callGroq(message, systemPrompt);
            }
            throw ollamaErr; // No fallback available
        }
    }
};

// ─────────────────────────────────────────────────────────────────
// MAIN: extractIntent — role-aware AI routing
// ─────────────────────────────────────────────────────────────────

/**
 * Extract intent and tool call from user message.
 * Routes to appropriate AI model based on user role.
 *
 * @param {string} userText - The user's message
 * @param {Array}  history  - Last N messages [{role, message}]
 * @param {object} userContext - Profile, orders, cart, lastProducts
 * @param {string} role - 'user' | 'seller' | 'admin'
 * @returns {object} { type, text?, tool?, params?, question?, action? }
 */
const extractIntent = async (userText, history = [], userContext = null, role = 'user') => {
    try {
        // Build tools prompt for this role only
        const toolsPrompt = buildToolsPromptForRole(role);

        // Pre-process: resolve ordinal references for customer only
        let resolvedText = userText;
        if (role === 'user') {
            resolvedText = resolveOrdinalRefs(userText, userContext?.lastProducts);
            if (resolvedText !== userText) {
                console.log(`[AI] Resolved ordinal ref: "${userText}" → "${resolvedText}"`);
            }
        }

        // Build conversation history string
        const historyStr = history.length > 0
            ? `\nConversation History (last ${history.length} messages):\n` +
              history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.message}`).join('\n')
            : '';

        // Build context string based on role
        let contextStr = '';
        if (userContext) {
            if (role === 'user') {
                // Customer context
                const { profile, orders, cart, addresses, lastProducts } = userContext;
                const recentOrders = (orders || []).slice(0, 3).map(o =>
                    `Order #${o.id?.split('-')[0]} - ${o.status} - ₹${o.total_price || o.total_amount}`
                ).join('; ');
                const cartItems = (cart || []).map(c => `${c.products?.name} x${c.quantity}`).join(', ');
                let lastProductsStr = 'None';
                if (lastProducts?.length > 0) {
                    lastProductsStr = lastProducts.map((p, i) => `${i + 1}. ${p.name} (₹${p.price})`).join('\n  ');
                }
                const addressSummary = (addresses || []).map(a =>
                    `- ${a.label || 'Other'}: ${a.city}, ${a.state}`
                ).join('\n');
                contextStr = `
User Context:
- Name: ${profile?.full_name || 'Customer'}
- Recent Orders: ${recentOrders || 'None'}
- Cart: ${cartItems || 'Empty'}
- Saved Addresses:\n${addressSummary || '  (No addresses saved)'}
Recently Shown Products:
  ${lastProductsStr}`;

            } else if (role === 'seller') {
                // Seller context
                const { profile, stats } = userContext;
                contextStr = `
Seller Context:
- Seller Name: ${profile?.full_name || 'Seller'}
- Seller ID: ${profile?.id || 'unknown'}
- Today's Quick Stats: ${stats ? `₹${stats.revenue_today || 0} revenue, ${stats.orders_today || 0} orders` : 'not loaded'}`;

            } else if (role === 'admin') {
                // Admin context
                const { profile } = userContext;
                contextStr = `
Admin Context:
- Admin: ${profile?.full_name || 'Admin'}
- Platform: EMart
- Today's Date: ${new Date().toISOString().split('T')[0]}`;
            }
        }

        const systemPrompt = buildSystemPrompt(role, toolsPrompt, historyStr, contextStr);

        // ─── FLEXIBLE MODEL ROUTING ───────────────────────────────────
        // Controlled entirely by environment variables. No code change needed.
        //
        // Set AI_ROUTING_MODE in backend/.env:
        //   'split'      → Customer:Groq,  Seller:Ollama, Admin:Ollama  (DEFAULT)
        //   'all_groq'   → Everyone uses Groq
        //   'all_ollama' → Everyone uses Ollama (local/ngrok)
        //   'custom'     → Per-role via CUSTOMER_AI_PROVIDER, SELLER_AI_PROVIDER, ADMIN_AI_PROVIDER
        //                  Each can be 'groq' or 'ollama'
        //
        // Examples:
        //   AI_ROUTING_MODE=all_groq
        //   AI_ROUTING_MODE=custom
        //   CUSTOMER_AI_PROVIDER=groq
        //   SELLER_AI_PROVIDER=groq
        //   ADMIN_AI_PROVIDER=ollama
        // ─────────────────────────────────────────────────────────────
        const parsed = await resolveAndCall(role, resolvedText, systemPrompt);

        // ─── NORMALIZE RESPONSE ───────────────────────────────────────
        // Handle quirks where AI doesn't follow format exactly
        if (!parsed.type) {
            if (parsed.tool || parsed.action) parsed.type = 'tool_call';
            else parsed.type = 'reply';
        }

        if (parsed.type && !['reply', 'tool_call', 'confirmation_request', 'multi_step'].includes(parsed.type)) {
            const actualTool = parsed.tool || parsed.action || parsed.name || parsed.type;
            parsed = { type: 'tool_call', tool: actualTool, params: parsed.params || {} };
        }

        if (parsed.type === 'tool_call' && !parsed.tool) {
            parsed.tool = parsed.action || parsed.name;
        }

        if (!parsed.type) throw new Error('Missing type field in AI response');

        return parsed;

    } catch (error) {
        console.error(`[AI Service] Error (role: ${role}):`, error.message);

        // Graceful fallback reply
        const isConnectionError = error.message.includes('Ollama') ||
            error.message.includes('fetch') ||
            error.message.includes('ECONNREFUSED') ||
            error.message.includes('timed out');

        return {
            type: 'reply',
            text: isConnectionError
                ? (role === 'user'
                    ? "I'm having trouble connecting to my AI brain right now. Please make sure Ollama is running."
                    : "I'm having trouble connecting to the local AI server. Please make sure Ollama is running and ngrok is active.")
                : "I'm sorry, I had trouble understanding that. Could you rephrase your request?"
        };
    }
};

module.exports = { extractIntent };
