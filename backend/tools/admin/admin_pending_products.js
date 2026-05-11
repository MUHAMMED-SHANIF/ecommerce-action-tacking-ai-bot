require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_pending_products',
    description: 'Get all products awaiting admin approval from sellers.',
    roles: ['admin'],
    parameters: {
        limit: 'number? - Max results to return (default: 20)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const limit = parseInt(params.limit) || 20;

        const { data: products, error } = await serviceSupabase
            .from('products')
            .select('id, name, price, brand, metadata, created_at, categories(name)')
            .eq('metadata->>status', 'pending')
            .neq('metadata->>type', 'category_request')
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;

        if (!products || products.length === 0) {
            return { text: '✅ No products are pending approval right now. All clear!', products: [], count: 0 };
        }

        return {
            text: `⏳ Pending Product Approvals: ${products.length}\n` +
                  products.slice(0, 8).map((p, i) =>
                    `  ${i+1}. ${p.name} — ₹${p.price} (${p.categories?.name || 'No category'})\n     Seller ID: ${p.metadata?.sellerId?.split('-')[0] || 'unknown'}`
                  ).join('\n') +
                  (products.length > 8 ? `\n  ...and ${products.length - 8} more` : ''),
            products: products.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                category: p.categories?.name,
                seller_id: p.metadata?.sellerId,
                created_at: p.created_at?.split('T')[0]
            })),
            count: products.length
        };
    }
};
