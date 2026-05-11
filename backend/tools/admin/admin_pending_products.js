require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_pending_products',
    description: 'List all products awaiting admin approval.',
    roles: ['admin'],
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const { data: products, error } = await serviceSupabase
            .from('products')
            .select('id, name, price, metadata, created_at, categories(name)')
            .eq('metadata->>status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!products || products.length === 0) {
            return { text: "✅ No products are currently pending approval.", data: [] };
        }

        // Fetch seller names from auth (simplified by assuming metadata contains seller name or we skip it for speed)
        const formatted = products.map(p => ({
            product_id: p.id,
            name: p.name,
            seller_name: p.metadata?.sellerName || 'Unknown Seller',
            category: p.categories?.name || 'N/A',
            price: p.price,
            submitted_at: p.created_at?.split('T')[0]
        }));

        return {
            text: `⏳ There are ${formatted.length} products waiting for review.`,
            data: formatted
        };
    }
};
