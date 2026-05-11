require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_edit_any_product',
    description: 'Edit any product on the platform (admin override).',
    roles: ['admin'],
    parameters: {
        product_id: 'string - Full product ID',
        fields_to_update: 'object - Key-value pairs of fields to update (name, price, description, etc.)'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Update fields for product ${params.product_id}?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { error } = await serviceSupabase
            .from('products')
            .update(params.fields_to_update)
            .eq('id', params.product_id);

        if (error) throw error;

        return {
            text: `✅ Product ${params.product_id} updated successfully.`,
            success: true,
            message: "Product updated"
        };
    }
};
