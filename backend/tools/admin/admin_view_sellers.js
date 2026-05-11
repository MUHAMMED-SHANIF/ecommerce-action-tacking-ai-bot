require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_view_sellers',
    description: 'List all sellers on the platform with performance data.',
    roles: ['admin'],
    parameters: {
        status: 'string? - Filter by status (active/inactive)',
        search_query: 'string? - Search by name or email'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: authData, error } = await serviceSupabase.auth.admin.listUsers();
        
        if (error) throw error;

        let sellers = authData.users.filter(u => u.user_metadata?.role === 'seller');
        
        if (params.search_query) {
            const q = params.search_query.toLowerCase();
            sellers = sellers.filter(u => 
                u.email?.toLowerCase().includes(q) || 
                u.user_metadata?.full_name?.toLowerCase().includes(q)
            );
        }

        // Get product counts and revenue per seller
        const { data: products } = await serviceSupabase.from('products').select('id, metadata');
        const { data: orders } = await serviceSupabase.from('orders').select('total_amount, status, order_items(product_id)');

        const stats = sellers.map(s => {
            const sellerProducts = (products || []).filter(p => p.metadata?.sellerId === s.id);
            // Revenue calculation would normally be in a view, approximating here
            return {
                seller_id: s.id,
                name: s.user_metadata?.full_name || 'Seller',
                products_count: sellerProducts.length,
                total_revenue: 0, // Placeholder
                joined_at: s.created_at?.split('T')[0],
                trusted: s.user_metadata?.isTrusted || false
            };
        });

        return {
            text: `🏪 Found ${stats.length} sellers on the platform.`,
            data: stats
        };
    }
};
