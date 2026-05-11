require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_get_home_layout',
    description: 'Get the current homepage section arrangement.',
    roles: ['admin'],
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        // This usually comes from a 'site_settings' or 'layout' table
        // Approximating based on a metadata-driven approach or hardcoded mock if table doesn't exist
        const { data: layout } = await serviceSupabase
            .from('site_settings')
            .select('value')
            .eq('key', 'home_layout')
            .single();

        const sections = layout?.value?.sections || [
            { id: '1', type: 'banner_carousel', position: 1 },
            { id: '2', type: 'category_grid', position: 2 },
            { id: '3', type: 'product_strip', category_id: 'electronics', position: 3 }
        ];

        return {
            text: `🏠 Current Home Layout:\n` + sections.map(s => `${s.position}. ${s.type} ${s.category_id ? `(${s.category_id})` : ''}`).join('\n'),
            data: { sections }
        };
    }
};
