require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { getTool } = require('../tools');

/**
 * Thin dispatcher — loads the named tool from the registry and calls execute().
 * No hardcoded logic. Adding a new tool = add a file in /tools, restart server.
 */
const handleToolCall = async (toolName, params, user, token) => {
    const tool = getTool(toolName);

    if (!tool) {
        return { message: `I don't have a tool called "${toolName}" yet. This feature may be coming soon!`, data: null };
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    try {
        const result = await tool.execute({ params, user, supabase });
        return {
            message: result.text || 'Done!',
            data: result
        };
    } catch (err) {
        console.error(`[ActionRouter] Tool "${toolName}" failed:`, err.message);
        return {
            message: `I ran into a problem while trying to ${toolName.replace(/_/g, ' ')}. ${err.message}`,
            data: null
        };
    }
};

module.exports = { handleToolCall };
