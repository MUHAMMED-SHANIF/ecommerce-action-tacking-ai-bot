require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { getTool } = require('../tools');

/**
 * Thin dispatcher — loads the named tool from the registry and calls execute().
 * No hardcoded logic. Adding a new tool = add a file in /tools, restart server.
 */
const handleToolCall = async (toolName, params, user, token, dynamicTexts = {}) => {
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
        
        let isSuccess = true;
        // Determine success based on common return patterns from tools
        if (result.success === false) isSuccess = false;
        if (result.error) isSuccess = false;
        if (result.products && result.products.length === 0) isSuccess = false;
        if (result.order === null) isSuccess = false;

        let finalMessage = result.text || 'Done!';
        
        // Inject AI's dynamic natural language if provided, falling back to tool's hardcoded text
        // (Unless the tool explicitly opts out because it generates rich database-driven text)
        if (tool.returnDirectText !== true) {
            if (isSuccess && dynamicTexts.text_on_success) {
                finalMessage = dynamicTexts.text_on_success;
            } else if (!isSuccess && dynamicTexts.text_on_failure) {
                finalMessage = dynamicTexts.text_on_failure;
            }
        }

        return {
            message: finalMessage,
            data: result
        };
    } catch (err) {
        console.error(`[ActionRouter] Tool "${toolName}" failed:`, err.message);
        return {
            message: dynamicTexts.text_on_failure || `I ran into a problem while trying to ${toolName.replace(/_/g, ' ')}. ${err.message}`,
            data: null
        };
    }
};

module.exports = { handleToolCall };
