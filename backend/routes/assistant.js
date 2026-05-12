require('dotenv').config();
const express = require('express');
const { extractIntent } = require('../services/aiService');
const { handleToolCall } = require('../services/actionRouter');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const HISTORY_LIMIT = 30; // Last N messages to include as context

const getAuthSupabase = (token) =>
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

const getServiceSupabase = () =>
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/assistant/message
 * Main AI chat endpoint. Handles:
 * - Normal conversation
 * - Tool calls
 * - Confirmation requests (back-and-forth for destructive actions)
 * - Confirmation responses (user says yes/no)
 */
router.post('/message', requireAuth, async (req, res) => {
    try {
        const { message, text, confirmed, pendingAction, pendingParams } = req.body;
        const userMessage = message || text;
        if (!userMessage) return res.status(400).json({ error: 'Message is required' });

        const user = req.user;
        const token = req.token;
        const supabase = getAuthSupabase(token);
        const serviceSupabase = getServiceSupabase();

        // --- Determine user role ---
        // Role is stored in Supabase user_metadata by the auth system
        const userRole = user.user_metadata?.role || 'user'; // 'user' | 'seller' | 'admin'
        console.log(`[Assistant] Role: ${userRole}, User: ${user.id}`);

        // --- 1. Save user message ---
        await serviceSupabase.from('ai_messages').insert({
            user_id: user.id,
            session_role: userRole,
            role: 'user',
            message: userMessage,
            metadata: {}
        });

        // --- 2. Handle confirmed action (user said yes to a destructive action) ---
        if (confirmed && pendingAction && pendingParams) {
            const actionResult = await handleToolCall(pendingAction, pendingParams, user, token);
            const replyText = actionResult.message || 'Done!';

            await serviceSupabase.from('ai_messages').insert({
                user_id: user.id,
                role: 'assistant',
                message: replyText,
                metadata: { tool: pendingAction }
            });

            return res.json({
                success: true,
                reply: replyText,
                data: actionResult.data,
                pendingConfirmation: null,
                tool: pendingAction
            });
        }

        // --- 3. Fetch conversation history (last N messages) ---
        const { data: historyRows } = await serviceSupabase
            .from('ai_messages')
            .select('role, message, metadata')
            .eq('user_id', user.id)
            .eq('session_role', userRole)  // 🔑 Cleanly separated per role
            .order('created_at', { ascending: false })
            .limit(HISTORY_LIMIT);

        const history = (historyRows || []).reverse(); // oldest first for context



        // --- 5. Fetch user context (role-appropriate) ---
        let userContext = null;
        try {
            const { data: { user: authUser } } = await serviceSupabase.auth.admin.getUserById(user.id);
            const savedAddresses = authUser?.user_metadata?.addresses || [];

            if (userRole === 'user') {
                // Customer context — orders, cart, addresses, last shown products
                const [profileRes, ordersRes, cartRes] = await Promise.all([
                    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
                    supabase.from('orders').select('id, status, total_price, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
                    supabase.from('cart_items').select('quantity, products(name)').eq('user_id', user.id).limit(5)
                ]);
                const contextProductsRow = (historyRows || []).find(m => m.role === 'assistant' && m.metadata?.rendered_products?.length > 0);
                userContext = {
                    profile: profileRes.data,
                    orders: ordersRes.data || [],
                    cart: cartRes.data || [],
                    addresses: savedAddresses,
                    lastProducts: contextProductsRow ? contextProductsRow.metadata.rendered_products : null
                };

            } else if (userRole === 'seller') {
                // Seller context — minimal, tools fetch data on demand
                const profileRes = await supabase.from('profiles').select('full_name, id').eq('id', user.id).maybeSingle();
                userContext = {
                    profile: { ...profileRes.data, id: user.id },
                    stats: null // Quick stats fetched by individual tools
                };

            } else if (userRole === 'admin') {
                // Admin context — just profile
                const profileRes = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
                userContext = { profile: profileRes.data };
            }
        } catch (_) { /* context fetch failure is non-fatal */ }

        // --- 6. Call AI for intent extraction (role-aware) ---
        // New signature: extractIntent(userMessage, userId, role)
        const aiResult = await extractIntent(userMessage, user.id, userRole);

        let replyText = '';
        let responseData = null;
        let pendingConfirmation = null;

        // Helper to resolve result_ref like "s1.results[0]"
        const resolveResultRef = (ref, resultsMap) => {
            if (typeof ref !== 'string' || !ref.includes('.')) return ref;
            const parts = ref.split('.'); // ['s1', 'results[0]']
            const stepId = parts[0];
            const path = parts[1];
            
            const stepResult = resultsMap[stepId];
            if (!stepResult) return ref;

            // Simple parser for results[0] or products[0]
            const match = path.match(/(\w+)\[(-?\d+)\]/);
            if (match) {
                const key = match[1];
                const index = parseInt(match[2]);
                const list = stepResult[key] || stepResult.products || stepResult.data;
                if (Array.isArray(list)) {
                    const item = index < 0 ? list[list.length + index] : list[index];
                    return item?.id || item; // Return ID if it's an object
                }
            }
            return stepResult[path] || stepResult.data?.[path] || ref;
        };

        // --- 6. Route based on AI response type ---
        if (aiResult.type === 'reply') {
            replyText = aiResult.reply || aiResult.text || "I'm here to help!";

        } else if (aiResult.type === 'tool_call') {
            const tool = require('../tools').getTool(aiResult.tool);

            // SECURITY: Verify tool belongs to user's role
            if (tool && tool.roles && !tool.roles.includes(userRole)) {
                console.warn(`[Assistant] Role "${userRole}" attempted to use tool "${aiResult.tool}" (allowed: ${tool.roles.join(',')}). Blocked.`);
                replyText = "I'm sorry, that action isn't available for your account type.";
            } else if (tool && tool.requiresConfirmation) {
                replyText = aiResult.reply || aiResult.question || `Are you sure you want to ${aiResult.tool.replace(/_/g, ' ')}?`;
                pendingConfirmation = {
                    action: aiResult.tool,
                    params: aiResult.params || {}
                };
            } else {
                const toolResult = await handleToolCall(aiResult.tool, aiResult.params || {}, user, token, aiResult);
                replyText = aiResult.reply || toolResult.message;
                responseData = toolResult.data;
            }

        } else if (aiResult.type === 'multi_step') {
            replyText = aiResult.reply || aiResult.text || "Processing your request...";
            const steps = aiResult.steps || [];
            let allMessages = [];
            if (replyText) allMessages.push(replyText);
            
            let combinedData = {};
            const stepResults = {};

            for (const step of steps) {
                const tool = require('../tools').getTool(step.tool);
                
                // Resolve references in params
                const resolvedParams = { ...(step.params || {}) };
                for (const key in resolvedParams) {
                    if (typeof resolvedParams[key] === 'string' && resolvedParams[key].includes('result_ref')) {
                        // Extract the ref part if the AI sent it as a string
                        const ref = resolvedParams[key].replace('result_ref: ', '').replace('result_ref:', '');
                        resolvedParams[key] = resolveResultRef(ref, stepResults);
                    } else if (key === 'result_ref') {
                        // AI sent it as a specific key
                        const ref = resolvedParams[key];
                        // If result_ref is used, we usually want to map it to a specific parameter like product_id
                        // But for now we just resolve it and keep it in params for the tool to find
                        resolvedParams[key] = resolveResultRef(ref, stepResults);
                    }
                }

                if (tool && tool.requiresConfirmation) {
                    pendingConfirmation = {
                        action: step.tool,
                        params: resolvedParams
                    };
                    allMessages.push(tool.confirmationMessage ? tool.confirmationMessage(resolvedParams) : `Are you sure you want to ${step.tool.replace(/_/g, ' ')}?`);
                    break; 
                } else {
                    const toolResult = await handleToolCall(step.tool, resolvedParams, user, token, aiResult);
                    allMessages.push(toolResult.message);
                    stepResults[step.id] = toolResult.data;
                    if (toolResult.data) {
                        combinedData = { ...combinedData, ...toolResult.data };
                    }
                }
            }
            replyText = allMessages.join('\n\n');
            responseData = combinedData;
            // Set the primary tool for the frontend to the last tool called in the sequence
            if (steps.length > 0) {
                aiResult.tool = steps[steps.length - 1].tool;
            }

        } else if (aiResult.type === 'confirmation_request') {
            replyText = aiResult.reply || aiResult.question || `Are you sure?`;
            pendingConfirmation = {
                action: aiResult.tool || aiResult.action,
                params: aiResult.params || {}
            };

        } else {
            // Fallback for unexpected AI output
            replyText = "I'm sorry, I didn't quite understand that. Could you rephrase?";
        }

        // --- 7. Save assistant message ---
        let rendered_products = null;
        if (responseData?.products?.length > 0) {
            rendered_products = responseData.products.map(p => ({ id: p.id, name: p.name, price: p.price }));
        } else if (responseData?.product) {
            rendered_products = [{ id: responseData.product.id, name: responseData.product.name, price: responseData.product.price }];
        } else if (responseData?.comparison) {
            rendered_products = [
                { id: responseData.comparison.productA.id, name: responseData.comparison.productA.name, price: responseData.comparison.productA.price },
                { id: responseData.comparison.productB.id, name: responseData.comparison.productB.name, price: responseData.comparison.productB.price }
            ];
        }

        await serviceSupabase.from('ai_messages').insert({
            user_id: user.id,
            session_role: userRole,
            role: 'assistant',
            message: replyText,
            metadata: {
                type: aiResult.type,
                tool: aiResult.tool || aiResult.action || null,
                rendered_products
            }
        });

        // --- 8. Garbage Collect Old History (Keep strictly last 30 messages) ---
        // Fire-and-forget to avoid blocking the user's response
        serviceSupabase
            .from('ai_messages')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('session_role', userRole)  // 🔑 GC per role separately
            .order('created_at', { ascending: false })
            .limit(30)
            .then(({ data: keepMessages }) => {
                if (keepMessages && keepMessages.length === 30) {
                    const oldestKeepDate = keepMessages[29].created_at;
                    serviceSupabase
                        .from('ai_messages')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('session_role', userRole)
                        .lt('created_at', oldestKeepDate)
                        .then(() => console.log(`[History GC] Cleaned ${userRole} history for user ${user.id}`))
                        .catch(e => console.error("[History GC Error]", e.message));
                }
            })
            .catch(e => console.error("[History GC Fetch Error]", e.message));

        // --- 9. Respond ---
        return res.json({
            success: true,
            reply: replyText,
            data: responseData,
            pendingConfirmation,
            intentType: aiResult.type,
            tool: aiResult.tool || (pendingConfirmation ? pendingConfirmation.action : null)
        });


    } catch (error) {
        console.error('[Assistant Route] Error:', error);

        // Try to save error message
        try {
            if (req.user) {
                const supa = getServiceSupabase();
                await supa.from('ai_messages').insert({
                    user_id: req.user.id,
                    role: 'assistant',
                    message: "I'm sorry, I ran into an error. Please try again.",
                    metadata: { error: true }
                });
            }
        } catch (_) {}

        return res.status(500).json({
            success: false,
            reply: "I'm sorry, I ran into an error. Please try again.",
            details: error.message
        });
    }
});

/**
 * GET /api/assistant/history
 * Fetch chat history for the authenticated user
 */
router.get('/history', requireAuth, async (req, res) => {
    try {
        const serviceSupabase = getServiceSupabase();
        const limit = parseInt(req.query.limit) || 50;

        const chatRole = req.query.role || null;
        let query = serviceSupabase
            .from('ai_messages')
            .select('id, role, message, metadata, created_at')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (chatRole) query = query.eq('session_role', chatRole);
        const { data, error } = await query;

        if (error) throw error;

        return res.json({ success: true, history: (data || []).reverse() });
    } catch (error) {
        console.error('[History Route] Error:', error);
        return res.status(500).json({ error: 'Failed to load history' });
    }
});

/**
 * DELETE /api/assistant/history
 * Clear chat history for the authenticated user
 */
router.delete('/history', requireAuth, async (req, res) => {
    try {
        const serviceSupabase = getServiceSupabase();
        const chatRole = req.query.role || null;
        let query = serviceSupabase.from('ai_messages').delete().eq('user_id', req.user.id);
        
        if (chatRole) query = query.eq('session_role', chatRole);
        
        await query;
        return res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to clear history' });
    }
});

module.exports = router;
