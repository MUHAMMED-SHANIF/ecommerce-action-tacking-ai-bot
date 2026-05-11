require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_update_home_layout',
    description: 'Update the homepage section order.',
    roles: ['admin'],
    parameters: {
        new_order: 'array - Array of section objects in the desired order'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Apply new homepage layout? This will change what all customers see first.`,

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
