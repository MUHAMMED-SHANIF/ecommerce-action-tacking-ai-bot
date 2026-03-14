require('dotenv').config();
const express = require('express');
const { extractIntent } = require('../services/aiService');
const { handleToolCall } = require('../services/actionRouter');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const HISTORY_LIMIT = 10; // Last N messages to include as context

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

        // --- 1. Save user message ---
        await serviceSupabase.from('ai_messages').insert({
            user_id: user.id,
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
                pendingConfirmation: null
            });
        }

        // --- 3. Fetch conversation history (last N messages) ---
        const { data: historyRows } = await serviceSupabase
            .from('ai_messages')
            .select('role, message')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(HISTORY_LIMIT);

        const history = (historyRows || []).reverse(); // oldest first for context

        // --- 4. Fetch user context ---
        let userContext = null;
        try {
            const [profileRes, ordersRes, cartRes, addressRes] = await Promise.all([
                supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
                supabase.from('orders').select('id, status, total_price, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
                supabase.from('cart_items').select('quantity, products(name)').eq('user_id', user.id).limit(5),
                supabase.from('addresses').select('city').eq('user_id', user.id).limit(3)
            ]);
            userContext = {
                profile: profileRes.data,
                orders: ordersRes.data || [],
                cart: cartRes.data || [],
                addresses: addressRes.data || []
            };
        } catch (_) { /* context fetch failure is non-fatal */ }

        // --- 5. Call AI for intent extraction ---
        const aiResult = await extractIntent(userMessage, history, userContext);

        let replyText = '';
        let responseData = null;
        let pendingConfirmation = null;

        // --- 6. Route based on AI response type ---
        if (aiResult.type === 'reply') {
            replyText = aiResult.text || "I'm here to help!";

        } else if (aiResult.type === 'tool_call') {
            const toolResult = await handleToolCall(aiResult.tool, aiResult.params || {}, user, token);
            replyText = toolResult.message;
            responseData = toolResult.data;

        } else if (aiResult.type === 'confirmation_request') {
            replyText = aiResult.question || `Are you sure you want to ${aiResult.action}?`;
            pendingConfirmation = {
                action: aiResult.action,
                params: aiResult.params || {}
            };

        } else {
            // Fallback for unexpected AI output
            replyText = "I'm sorry, I didn't quite understand that. Could you rephrase?";
        }

        // --- 7. Save assistant message ---
        await serviceSupabase.from('ai_messages').insert({
            user_id: user.id,
            role: 'assistant',
            message: replyText,
            metadata: {
                type: aiResult.type,
                tool: aiResult.tool || aiResult.action || null
            }
        });

        // --- 8. Respond ---
        return res.json({
            success: true,
            reply: replyText,
            data: responseData,
            pendingConfirmation,
            intentType: aiResult.type
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

        const { data, error } = await serviceSupabase
            .from('ai_messages')
            .select('id, role, message, metadata, created_at')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;

        return res.json({ success: true, history: data || [] });
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
        await serviceSupabase.from('ai_messages').delete().eq('user_id', req.user.id);
        return res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to clear history' });
    }
});

module.exports = router;
