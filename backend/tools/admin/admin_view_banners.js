require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_view_banners',
    description: 'List all homepage banners.',
    roles: ['admin'],
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        // Approximating banner table or metadata
        const { data: banners } = await serviceSupabase
            .from('site_settings')
            .select('value')
            .eq('key', 'banners')
            .single();

        const list = banners?.value?.list || [];

        return {
            text: `🖼️ Currently showing ${list.length} banners.`,
            data: list.map((b, i) => ({
                banner_id: i + 1,
                image_url: b.image_url,
                link: b.link,
                active: b.active !== false,
                created_at: b.created_at || 'N/A'
            }))
        };
    }
};
