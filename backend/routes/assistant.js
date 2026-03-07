require('dotenv').config();
const express = require('express');
const { extractIntent } = require('../services/aiService');
const { handleIntent } = require('../services/actionRouter');
const { requireAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const getAuthSupabase = (token) => {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};

router.post('/message', requireAuth, async (req, res) => {
    try {
        const { message, text } = req.body;
        const userMessage = message || text;

        if (!userMessage) return res.status(400).json({ error: 'Message required' });

        const activeUser = req.user;
        const token = req.token;
        const supabase = getAuthSupabase(token);

        // 1. Save User Message to Conversations
        await supabase.from('conversations').insert({
            user_id: activeUser.id,
            role: 'user',
            message: userMessage
        });

        // 2. Fetch User Context for AI (Full DB slice for user)
        const [profileRes, ordersRes, cartRes, addressRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', activeUser.id).maybeSingle(),
            supabase.from('orders').select('id, status, total_amount, created_at, payment_method, order_items(quantity, price_at_purchase, products(name))').eq('user_id', activeUser.id).order('created_at', { ascending: false }),
            supabase.from('cart_items').select('id, quantity, products(id, name, price)').eq('user_id', activeUser.id),
            supabase.from('addresses').select('*').eq('user_id', activeUser.id)
        ]);

        const userContext = {
            profile: profileRes.data || null,
            orders: ordersRes.data || [],
            cart: cartRes.data || [],
            addresses: addressRes.data || []
        };

        // 3. Extract Intent using Local AI (with context)
        const aiResult = await extractIntent(userMessage, userContext);
        if (aiResult.error) throw new Error(aiResult.error);

        // 4. Route Action to backend logic
        const actionResponse = await handleIntent(aiResult.intent, aiResult.entities, activeUser, token);
        const replyText = actionResponse.message || "I've handled your request.";

        // 5. Save Assistant Response to Conversations
        await supabase.from('conversations').insert({
            user_id: activeUser.id,
            role: 'assistant',
            message: replyText
        });

        // 6. Return Response
        res.json({
            success: true,
            intentOutput: aiResult,
            reply: replyText,
            data: actionResponse.data
        });

    } catch (error) {
        console.error("AI Assistant Error:", error);

        // Attempt to save error message if possible
        if (req.user && req.token) {
            try {
                const supabase = getAuthSupabase(req.token);
                await supabase.from('conversations').insert({
                    user_id: req.user.id,
                    role: 'assistant',
                    message: "I'm sorry, I encountered an error processing your request."
                });
            } catch (e) {
                console.error("Failed to save error conversation:", e);
            }
        }

        res.status(500).json({
            success: false,
            responseText: "I'm sorry, I encountered an error processing your request.",
            details: error.message
        });
    }
});

router.get('/history', requireAuth, async (req, res) => {
    try {
        const supabase = getAuthSupabase(req.token);
        const { data, error } = await supabase
            .from('conversations')
            .select('id, role, message, created_at')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json({ success: true, history: data });
    } catch (error) {
        console.error("History fetch error:", error);
        res.status(500).json({ error: "Failed to load conversation history" });
    }
});

module.exports = router;
