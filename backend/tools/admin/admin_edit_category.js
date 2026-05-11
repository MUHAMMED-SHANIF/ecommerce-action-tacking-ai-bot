require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_edit_category',
    description: 'Edit an existing product category.',
    roles: ['admin'],
    parameters: {
        category_id: 'string - Full category ID',
        updates: 'object - Fields to update (name, slug, description)'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Update details for category ${params.category_id}?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { error } = await serviceSupabase
            .from('categories')
            .update(params.updates)
            .eq('id', params.category_id);

        if (error) throw error;

        return {
            text: `✅ Category ${params.category_id} updated successfully.`,
            success: true,
            message: "Category updated"
        };
    }
};
