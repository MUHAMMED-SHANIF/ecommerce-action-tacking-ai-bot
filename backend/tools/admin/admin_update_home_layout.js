require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_update_home_layout',
    description: 'Reorder or update homepage sections.',
    roles: ['admin'],
    parameters: {
        new_order: 'array - Array of section objects: [{id, type, category_id, position}]'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Update homepage layout with ${params.new_order?.length} sections?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { error } = await serviceSupabase
            .from('site_settings')
            .upsert({ key: 'home_layout', value: { sections: params.new_order } });

        if (error) throw error;

        return {
            text: `✅ Homepage layout updated successfully.`,
            success: true,
            message: "Layout updated"
        };
    }
};
