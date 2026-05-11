require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_add_banner',
    description: 'Add a new promotional banner to the homepage.',
    roles: ['admin'],
    parameters: {
        image_url: 'string - URL of the banner image',
        link: 'string? - Destination URL when clicked',
        duration: 'number? - Number of days to display'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Add new banner for ${params.duration || 'indefinite'} days?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: existing } = await serviceSupabase
            .from('site_settings')
            .select('value')
            .eq('key', 'banners')
            .single();

        const list = existing?.value?.list || [];
        const expiresAt = params.duration ? new Date(Date.now() + params.duration * 24 * 60 * 60 * 1000).toISOString() : null;
        
        const newBanner = {
            image_url: params.image_url,
            link: params.link || '/',
            active: true,
            created_at: new Date().toISOString(),
            expires_at: expiresAt
        };
        list.push(newBanner);

        const { error } = await serviceSupabase
            .from('site_settings')
            .upsert({ key: 'banners', value: { list } });

        if (error) throw error;

        return {
            text: `✅ New banner added successfully.`,
            data: { banner_id: list.length, message: "Banner added" }
        };
    }
};
