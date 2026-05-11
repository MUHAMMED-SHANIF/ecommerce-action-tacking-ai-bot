require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_edit_any_product',
    description: 'Directly edit any product detail (admin override).',
    roles: ['admin'],
    parameters: {
        product_id: 'string - Full product ID',
        fields_to_update: 'object - Key-value pairs of fields (name, price, stock_quantity, etc.)'
    },
    requiresConfirmation: false, // Override doesn't always need confirmation if fields are small, but AI can ask
    
    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { error } = await serviceSupabase
            .from('products')
            .update(params.fields_to_update)
            .eq('id', params.product_id);

        if (error) throw error;

        return {
            text: `✅ Product ${params.product_id} has been updated by admin override.`,
            success: true,
            message: "Product updated"
        };
    }
};
