require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_get_home_layout',
    description: 'Get the current homepage sections and their order.',
    roles: ['admin'],
    parameters: {},
    requiresConfirmation: false,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: layout } = await serviceSupabase
            .from('site_settings')
            .select('value')
            .eq('key', 'home_layout')
            .single();

        const sections = layout?.value?.sections || [
            { id: '1', type: 'banner_carousel', position: 1 },
            { id: '2', type: 'category_grid', position: 2 }
        ];

        return {
            text: `🏠 Home layout retrieved. It contains ${sections.length} sections.`,
            data: { sections }
        };
    }
};
