require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_view_users',
    description: 'List all users on the platform.',
    roles: ['admin'],
    parameters: {
        role: 'string? - Filter by role (user/seller/admin)',
        search_query: 'string? - Search by name or email',
        limit: 'number? - Max results (default: 20)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: authData, error } = await serviceSupabase.auth.admin.listUsers();
        
        if (error) throw error;

        let users = authData.users || [];
        
        if (params.role) {
            users = users.filter(u => (u.user_metadata?.role || 'user') === params.role);
        }
        
        if (params.search_query) {
            const q = params.search_query.toLowerCase();
            users = users.filter(u => 
                u.email?.toLowerCase().includes(q) || 
                u.user_metadata?.full_name?.toLowerCase().includes(q)
            );
        }

        const limit = params.limit || 20;
        users = users.slice(0, limit);

        const formatted = users.map(u => ({
            user_id: u.id,
            name: u.user_metadata?.full_name || 'N/A',
            email: u.email,
            role: u.user_metadata?.role || 'user',
            created_at: u.created_at?.split('T')[0]
        }));

        return {
            text: `👥 Found ${formatted.length} users.`,
            data: formatted
        };
    }
};
