require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_cancelled_orders',
    description: "Get cancelled orders report for the seller's products, including cancel reasons and refund amounts.",
    roles: ['seller'],
    parameters: {
        from_date: 'string? - Start date YYYY-MM-DD (default: 30 days ago)',
        to_date: 'string? - End date YYYY-MM-DD (default: today)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;
        const from_date = params.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to_date = params.to_date || new Date().toISOString().split('T')[0];

        const { data: products } = await serviceSupabase
            .from('products').select('id, name').eq('metadata->>sellerId', sellerId);

        if (!products || products.length === 0) {
            return { text: "You don't have any products listed yet.", cancelled: [] };
        }

        const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

        const { data: items, error } = await serviceSupabase
            .from('order_items')
            .select('product_id, quantity, price_at_purchase, orders!inner(id, created_at, status, metadata)')
            .in('product_id', products.map(p => p.id))
            .eq('orders.status', 'cancelled')
            .gte('orders.created_at', `${from_date}T00:00:00`)
            .lte('orders.created_at', `${to_date}T23:59:59`);

        if (error) throw error;
        const cancelled = (items || []).map(i => ({
            order_id: i.orders?.id?.split('-')[0] || 'N/A',
            product_name: productMap[i.product_id] || 'Unknown',
            quantity: i.quantity,
            refund_amount: i.price_at_purchase * i.quantity,
            cancel_reason: i.orders?.metadata?.cancel_reason || 'Not specified',
            cancelled_at: i.orders?.created_at?.split('T')[0] || 'N/A'
        }));

        const total_refunded = cancelled.reduce((s, c) => s + c.refund_amount, 0);

        return {
            text: `❌ Cancelled Orders (${from_date} to ${to_date}):\n` +
                  `• Total Cancellations: ${cancelled.length}\n` +
                  `• Total Refunded: ₹${total_refunded.toFixed(2)}\n` +
                  (cancelled.length > 0
                    ? '\nRecent:\n' + cancelled.slice(0, 5).map(c =>
                        `  - Order #${c.order_id}: ${c.product_name} — ₹${c.refund_amount.toFixed(2)}`
                      ).join('\n')
                    : '\n✅ No cancellations in this period!'),
            cancelled,
            total_refunded,
            from_date,
            to_date
        };
    }
};
