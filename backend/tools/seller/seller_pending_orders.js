require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/**
 * seller_pending_orders
 * Count of orders containing seller's products that need action (not yet shipped).
 */
module.exports = {
    name: 'seller_pending_orders',
    description: "Get count of pending/unshipped orders for the seller's products. Flags urgent orders older than 24 hours.",
    roles: ['seller'],
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;

        const { data: products } = await serviceSupabase
            .from('products').select('id').eq('metadata->>sellerId', sellerId);

        if (!products || products.length === 0) {
            return { text: "You don't have any products listed yet.", count: 0, urgent_count: 0 };
        }

        const { data: items } = await serviceSupabase
            .from('order_items')
            .select('orders!inner(id, created_at, status)')
            .in('product_id', products.map(p => p.id))
            .in('orders.status', ['pending', 'paid']);

        const threshold24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const orders = (items || []).map(i => i.orders).filter(Boolean);
        const uniqueOrders = [...new Map(orders.map(o => [o.id, o])).values()];

        const count = uniqueOrders.length;
        const urgent_count = uniqueOrders.filter(o => new Date(o.created_at) < threshold24h).length;

        return {
            text: `📬 Pending Orders:\n` +
                  `• Total Pending: ${count} orders\n` +
                  (urgent_count > 0 ? `⚠️ Urgent (>24h old): ${urgent_count} — Please ship these soon!` : `✅ No urgent orders`),
            count,
            urgent_count
        };
    }
};
