require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/**
 * seller_best_products
 * Find the seller's top-selling products by revenue or units sold.
 */
module.exports = {
    name: 'seller_best_products',
    description: "Find the seller's best-performing products ranked by revenue. Useful for identifying top sellers.",
    roles: ['seller'],
    parameters: {
        limit: 'number? - How many top products to return (default: 10)',
        time_period: 'string? - Time period: "week", "month", "year", or "all" (default: month)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;
        const limit = parseInt(params.limit) || 10;
        const period = params.time_period || 'month';

        // Calculate date range
        const now = new Date();
        let fromDate;
        if (period === 'week') fromDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        else if (period === 'month') fromDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        else if (period === 'year') fromDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        else fromDate = new Date('2000-01-01'); // 'all'

        const fromDateStr = fromDate.toISOString();

        // Get seller's products
        const { data: products } = await serviceSupabase
            .from('products')
            .select('id, name, price')
            .eq('metadata->>sellerId', sellerId);

        if (!products || products.length === 0) {
            return { text: "You don't have any products listed yet.", top_products: [] };
        }

        const productIds = products.map(p => p.id);
        const productMap = Object.fromEntries(products.map(p => [p.id, { name: p.name, price: p.price }]));

        // Fetch order items
        const { data: items, error } = await serviceSupabase
            .from('order_items')
            .select('product_id, quantity, price_at_purchase, orders!inner(created_at, status)')
            .in('product_id', productIds)
            .eq('seller_status', 'accepted')
            .gte('orders.created_at', fromDateStr)
            .neq('orders.status', 'cancelled');

        if (error) throw error;

        // Aggregate by product
        const stats = {};
        (items || []).forEach(i => {
            if (!stats[i.product_id]) {
                stats[i.product_id] = {
                    name: productMap[i.product_id]?.name || 'Unknown',
                    units_sold: 0,
                    revenue: 0
                };
            }
            stats[i.product_id].units_sold += i.quantity;
            stats[i.product_id].revenue += i.price_at_purchase * i.quantity;
        });

        const ranked = Object.values(stats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);

        if (ranked.length === 0) {
            return { text: `No sales found in the last ${period}. Try a longer time period.`, top_products: [] };
        }

        return {
            text: `🏆 Your Top ${ranked.length} Products (Last ${period}):\n` +
                  ranked.map((p, i) =>
                    `  ${i+1}. ${p.name}\n      Revenue: ₹${p.revenue.toFixed(2)} | Units: ${p.units_sold}`
                  ).join('\n'),
            top_products: ranked,
            time_period: period
        };
    }
};
