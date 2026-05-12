require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/**
 * seller_sales_report
 * Get sales revenue and order data for the seller's products over a date range.
 */
module.exports = {
    name: 'seller_sales_report',
    description: 'Get sales report for the seller including revenue, orders, and breakdown by product or time period.',
    roles: ['seller'],
    parameters: {
        from_date: 'string - Start date in YYYY-MM-DD format (e.g. 2026-05-01)',
        to_date: 'string - End date in YYYY-MM-DD format (e.g. 2026-05-31)',
        group_by: 'string? - How to group data: "day", "week", "month", or "product" (default: product)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;

        const from_date = params.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to_date = params.to_date || new Date().toISOString().split('T')[0];

        // Get seller's product IDs
        const { data: products } = await serviceSupabase
            .from('products')
            .select('id, name')
            .eq('metadata->>sellerId', sellerId);

        if (!products || products.length === 0) {
            return { text: "You don't have any products listed yet.", total_revenue: 0, total_orders: 0 };
        }

        const productIds = products.map(p => p.id);
        const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

        // Get order items for those products within date range
        const { data: orderItems, error } = await serviceSupabase
            .from('order_items')
            .select('id, product_id, quantity, price_at_purchase, order_id, orders!inner(id, created_at, status)')
            .in('product_id', productIds)
            .eq('seller_status', 'accepted')
            .gte('orders.created_at', `${from_date}T00:00:00`)
            .lte('orders.created_at', `${to_date}T23:59:59`)
            .neq('orders.status', 'cancelled');

        if (error) throw error;

        const items = orderItems || [];
        const total_revenue = items.reduce((sum, i) => sum + (i.price_at_purchase * i.quantity), 0);
        const total_orders = new Set(items.map(i => i.order_id)).size;
        const total_units = items.reduce((sum, i) => sum + i.quantity, 0);

        // Group by product
        const byProduct = {};
        items.forEach(i => {
            if (!byProduct[i.product_id]) {
                byProduct[i.product_id] = { name: productMap[i.product_id] || 'Unknown', revenue: 0, units: 0 };
            }
            byProduct[i.product_id].revenue += i.price_at_purchase * i.quantity;
            byProduct[i.product_id].units += i.quantity;
        });

        const productBreakdown = Object.values(byProduct)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        return {
            text: `📊 Sales Report (${from_date} to ${to_date}):\n` +
                  `• Total Revenue: ₹${total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n` +
                  `• Total Orders: ${total_orders}\n` +
                  `• Total Units Sold: ${total_units}\n` +
                  (productBreakdown.length > 0
                    ? `\nTop Products:\n` + productBreakdown.map((p, i) => `  ${i+1}. ${p.name} — ₹${p.revenue.toFixed(2)} (${p.units} units)`).join('\n')
                    : ''),
            total_revenue,
            total_orders,
            total_units,
            from_date,
            to_date,
            by_product: productBreakdown
        };
    }
};
