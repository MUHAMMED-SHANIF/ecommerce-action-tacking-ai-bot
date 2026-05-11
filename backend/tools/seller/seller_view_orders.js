require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_view_orders',
    description: "View orders that contain the seller's products, with optional status and date filters.",
    roles: ['seller'],
    parameters: {
        status: 'string? - Filter by order status: "pending", "paid", "shipped", "delivered" (optional)',
        from_date: 'string? - Start date YYYY-MM-DD (optional)',
        to_date: 'string? - End date YYYY-MM-DD (optional)',
        limit: 'number? - Max orders to return (default: 20)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;
        const limit = parseInt(params.limit) || 20;

        const { data: products } = await serviceSupabase
            .from('products').select('id, name').eq('metadata->>sellerId', sellerId);

        if (!products || products.length === 0) {
            return { text: "You don't have any products listed yet.", orders: [] };
        }

        const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

        let query = serviceSupabase
            .from('order_items')
            .select('product_id, quantity, price_at_purchase, orders!inner(id, created_at, status, total_amount, user_id)')
            .in('product_id', products.map(p => p.id))
            .order('orders(created_at)', { ascending: false })
            .limit(limit);

        if (params.status) query = query.eq('orders.status', params.status);
        if (params.from_date) query = query.gte('orders.created_at', `${params.from_date}T00:00:00`);
        if (params.to_date) query = query.lte('orders.created_at', `${params.to_date}T23:59:59`);

        const { data: items, error } = await query;
        if (error) throw error;

        // Group by order
        const ordersMap = {};
        (items || []).forEach(i => {
            const oid = i.orders?.id;
            if (!ordersMap[oid]) {
                ordersMap[oid] = {
                    order_id: oid?.split('-')[0],
                    full_order_id: oid,
                    status: i.orders?.status,
                    created_at: i.orders?.created_at?.split('T')[0],
                    items: [],
                    order_total: 0
                };
            }
            ordersMap[oid].items.push({
                product_name: productMap[i.product_id] || 'Unknown',
                quantity: i.quantity,
                price: i.price_at_purchase
            });
            ordersMap[oid].order_total += i.price_at_purchase * i.quantity;
        });

        const orders = Object.values(ordersMap);
        const statusFilter = params.status ? ` (${params.status})` : '';

        return {
            text: `📦 Your Orders${statusFilter}: ${orders.length} found\n` +
                  orders.slice(0, 5).map(o =>
                    `  Order #${o.order_id} — ${o.status.toUpperCase()} — ₹${o.order_total.toFixed(2)} — ${o.created_at}`
                  ).join('\n') +
                  (orders.length > 5 ? `\n  ...and ${orders.length - 5} more` : ''),
            orders,
            total_found: orders.length
        };
    }
};
