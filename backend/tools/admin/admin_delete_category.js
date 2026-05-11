require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_delete_category',
    description: 'Delete a product category. Requires confirmation.',
    roles: ['admin'],
    parameters: {
        category_id: 'string - Full category ID'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Permanently DELETE category ${params.category_id}? Products in this category may lose their categorization.`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { error } = await serviceSupabase
            .from('categories')
            .delete()
            .eq('id', params.category_id);

        if (error) throw error;

        return {
            text: `✅ Category deleted successfully.`,
            success: true,
            message: "Category deleted"
        };
    }
};
