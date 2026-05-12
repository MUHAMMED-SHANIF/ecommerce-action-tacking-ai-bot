require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/**
 * seller_revenue_today
 * Quick stat: how much revenue and how many orders today.
 */
module.exports = {
    name: 'seller_revenue_today',
    description: "Get today's revenue and order count for the seller. Quick snapshot of daily performance.",
    roles: ['seller'],
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: products } = await serviceSupabase
            .from('products').select('id, name').eq('metadata->>sellerId', sellerId);

        if (!products || products.length === 0) {
            return { text: "You don't have any products listed yet.", revenue: 0, orders_count: 0 };
        }

        const { data: items } = await serviceSupabase
            .from('order_items')
            .select('product_id, quantity, price_at_purchase, orders!inner(id, created_at, status)')
            .in('product_id', products.map(p => p.id))
            .eq('seller_status', 'accepted')
            .gte('orders.created_at', todayStart.toISOString())
            .neq('orders.status', 'cancelled');

        const revenue = (items || []).reduce((s, i) => s + i.price_at_purchase * i.quantity, 0);
        const orders_count = new Set((items || []).map(i => i.orders?.id)).size;

        // Find top product today
        const byProduct = {};
        (items || []).forEach(i => {
            const name = products.find(p => p.id === i.product_id)?.name || 'Unknown';
            if (!byProduct[name]) byProduct[name] = 0;
            byProduct[name] += i.quantity;
        });
        const top_product = Object.entries(byProduct).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        return {
            text: `📅 Today's Performance:\n` +
                  `• Revenue: ₹${revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n` +
                  `• Orders: ${orders_count}\n` +
                  (top_product ? `• Top Product: ${top_product}` : ''),
            revenue,
            orders_count,
            top_product
        };
    }
};
