require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { getModelsForRole } = require('./aiProviders/modelConfig');
const { callGroq, isGroqConfigured } = require('./aiProviders/groqProvider');
const { callOllama } = require('./aiProviders/ollamaProvider');
const { buildToolsPromptForRole } = require('../tools');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─────────────────────────────────────────────────────────────────
// SYSTEM PROMPT GENERATORS
// ─────────────────────────────────────────────────────────────────

const getSystemPrompt = (role, context, toolsList) => {
    const { userName, cartCount, wishlistCount, lastOrderStatus } = context;

    if (role === 'admin') {
        return `You are the platform operations assistant for E-Mart admins.
You are formal, precise, and focused on high-level metrics.
Always summarize key insights before offering drill-downs.
Example: "Platform revenue is ₹2.4L this week, up 18% from last week.
You have 12 products awaiting approval. Want to review them?"
Use professional language and provide actionable next steps.

RESPONSE RULES:
1. You MUST respond ONLY in valid JSON. No extra text, no markdown, no code blocks.
2. Use this EXACT schema:
Single action: {"type": "tool_call", "tool": "admin_dashboard_stats", "params": {}, "reply": "Summary message here."}
Just chat: {"type": "reply", "reply": "Your response here."}

AVAILABLE TOOLS:
${toolsList}
`;
    }

    if (role === 'seller') {
        return `You are a professional business intelligence assistant for sellers on E-Mart.
You are data-driven, concise, and focus on actionable insights.
When showing reports, always highlight the most important insight first.
Use business language: "Your top performer this month is...", "Revenue is up 15% vs last week"
End with a question: "Want me to download the full breakdown as CSV?"

RESPONSE RULES:
1. You MUST respond ONLY in valid JSON. No extra text, no markdown, no code blocks.
2. Use this EXACT schema:
Single action: {"type": "tool_call", "tool": "seller_sales_report", "params": {}, "reply": "Summary message here."}
Just chat: {"type": "reply", "reply": "Your response here."}

AVAILABLE TOOLS:
${toolsList}
`;
    }

    // Default: Customer (Aria)
    return `You are Aria, a friendly shopping assistant for E-Mart (Indian e-commerce platform).

PERSONALITY:
- Warm, enthusiastic, and helpful like a real salesperson
- Use Indian English: "₹" for rupees, "mobile" not "cell phone"
- End messages with encouragement or suggestions
- Never sound robotic or mention you're an AI

CRITICAL RESPONSE RULES:
1. You MUST respond ONLY in valid JSON. No extra text, no markdown, no code blocks.
2. Use this EXACT schema:

Single action:
{
  "type": "tool_call",
  "tool": "search_products",
  "params": { "query": "phone", "max_price": 20000 },
  "reply": "Let me find some great phones under ₹20,000 for you! 🔍"
}

Multi-step sequence (when user wants multiple actions):
{
  "type": "multi_step",
  "steps": [
    { "id": "s1", "tool": "search_products", "params": {...}, "depends_on": [] },
    { "id": "s2", "tool": "add_to_cart", "params": { "result_ref": "s1.results[0]" }, "depends_on": ["s1"] }
  ],
  "reply": "Perfect! I'll find phones and add the first one to your cart! 🛒"
}

Confirmation needed (destructive actions):
{
  "type": "confirmation_request",
  "tool": "cancel_order",
  "params": { "order_id": "123" },
  "reply": "Are you sure you want to cancel order #123? This can't be undone."
}

Just chat (no action needed):
{
  "type": "reply",
  "reply": "I'm here to help! You can ask me to search products, check your orders, or add items to your cart. What would you like to do?"
}

MULTI-STEP DETECTION:
Trigger multi_step when user asks for TWO OR MORE actions:
- "Find X and add first to cart" → multi_step
- "Search X add first to cart and second to wishlist" → multi_step  
- "Show my orders and cancel the last one" → multi_step
- "Find X" alone → single tool_call

ORDINAL HANDLING:
- "first one" / "1st" → result_ref: "s1.results[0]"
- "second one" / "2nd" → result_ref: "s1.results[1]"  
- "third" → result_ref: "s1.results[2]"
- "last one" → result_ref: "s1.results[-1]"

CONTEXT YOU HAVE:
- User: ${userName}
- Cart items: ${cartCount}
- Wishlist items: ${wishlistCount}
- Last order: ${lastOrderStatus}
- Recent conversation: [provided in messages]

AVAILABLE TOOLS:
${toolsList}

REMEMBER: ONLY JSON OUTPUT. NO TEXT BEFORE OR AFTER THE JSON.`;
};

// ─────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────

async function buildContext(userId, role) {
    const [profileRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).single(),
        supabase.from('ai_messages').select('role, message').eq('user_id', userId)
            .order('created_at', { ascending: false }).limit(8)
    ]);

    let cartCount = 0, wishlistCount = 0, lastOrderStatus = 'none';

    if (role === 'user') {
        const [cart, wishlist, orders] = await Promise.all([
            supabase.from('cart_items').select('id').eq('user_id', userId),
            supabase.from('wishlist').select('id').eq('user_id', userId),
            supabase.from('orders').select('status').eq('user_id', userId)
                .order('created_at', { ascending: false }).limit(1)
        ]);

        cartCount = cart.data?.length || 0;
        wishlistCount = wishlist.data?.length || 0;
        lastOrderStatus = orders.data?.[0]?.status || 'none';
    }

    return {
        userName: profileRes.data?.full_name || 'there',
        cartCount,
        wishlistCount,
        lastOrderStatus,
        recentMessages: (messagesRes.data || []).reverse().map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.message
        }))
    };
}

// ─────────────────────────────────────────────────────────────────
// INTENT EXTRACTION WITH RETRY & FALLBACK
// ─────────────────────────────────────────────────────────────────

async function extractIntent(userMessage, userId, role) {
    const context = await buildContext(userId, role);
    const toolsList = await buildToolsPromptForRole(role);
    
    const messages = [
        { role: 'system', content: getSystemPrompt(role, context, toolsList) },
        ...context.recentMessages,
        { role: 'user', content: userMessage }
    ];

    const models = getModelsForRole(role);
    const providers = { groq: callGroq, ollama: callOllama };

    for (const modelConfig of models) {
        console.log(`[AI] Trying ${modelConfig.provider} (${modelConfig.model}) for ${role}...`);
        
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const result = await providers[modelConfig.provider](messages, modelConfig);
                
                if (result.success) {
                    console.log(`[AI] ✅ Success with ${result.provider} (latency: ${result.latency}ms)`);
                    return result.data;
                }

                console.warn(`[AI] ❌ ${modelConfig.provider} attempt ${attempt} failed: ${result.error}`);
                
                if (result.code === 429) {
                    console.warn(`[AI] Rate limit hit on ${modelConfig.provider} - moving to next provider`);
                    break; // break attempt loop, try next model
                }

                if (attempt < 2) {
                    messages.push({
                        role: 'system',
                        content: 'ERROR: Your previous response was not valid JSON or failed schema. Respond with ONLY valid JSON, no markdown, no extra text.'
                    });
                }
            } catch (err) {
                console.error(`[AI] Error in ${modelConfig.provider}:`, err.message);
                break;
            }
        }
    }

    // Final fallback
    return {
        type: 'reply',
        reply: "I'm sorry, I'm having a bit of trouble understanding right now. Could you please try again?"
    };
}

module.exports = { extractIntent };
