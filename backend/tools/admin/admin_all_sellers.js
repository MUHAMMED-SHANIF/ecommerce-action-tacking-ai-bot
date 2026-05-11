require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_all_sellers',
    description: "Get all sellers on the platform with their product counts and trusted status.",
    roles: ['admin'],
    parameters: {
        limit: 'number? - Max sellers to return (default: 20)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const limit = parseInt(params.limit) || 20;

        const { data: authData, error } = await serviceSupabase.auth.admin.listUsers();
        if (error) throw error;

        const sellers = (authData?.users || [])
            .filter(u => u.user_metadata?.role === 'seller')
            .slice(0, limit);

        if (sellers.length === 0) {
            return { text: 'No sellers registered on the platform yet.', sellers: [] };
        }

        // Get product counts per seller
        const { data: products } = await serviceSupabase
            .from('products').select('id, metadata');

        const productsBySellerCount = {};
        (products || []).forEach(p => {
            const sid = p.metadata?.sellerId;
            if (sid) productsBySellerCount[sid] = (productsBySellerCount[sid] || 0) + 1;
        });

        const sellerList = sellers.map(u => ({
            id: u.id,
            name: u.user_metadata?.name || u.email?.split('@')[0],
            email: u.email,
            is_trusted: u.user_metadata?.isTrusted || false,
            product_count: productsBySellerCount[u.id] || 0,
            joined: u.created_at?.split('T')[0]
        }));

        return {
            text: `🏪 Platform Sellers (${sellerList.length}):\n` +
                  sellerList.slice(0, 8).map((s, i) =>
                    `  ${i+1}. ${s.name} — ${s.product_count} products${s.is_trusted ? ' ✓ Trusted' : ''}`
                  ).join('\n') +
                  (sellerList.length > 8 ? `\n  ...and ${sellerList.length - 8} more` : ''),
            sellers: sellerList,
            total: sellerList.length
        };
    }
};
