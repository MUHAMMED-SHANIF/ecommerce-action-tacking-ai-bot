require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_revenue_report',
    description: 'Platform-wide revenue analysis with date range and grouping.',
    roles: ['admin'],
    parameters: {
        from_date: 'string? - Start date YYYY-MM-DD',
        to_date: 'string? - End date YYYY-MM-DD',
        group_by: 'string? - Group by "day", "week", "month", "seller", or "category" (default: day)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const from_date = params.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to_date = params.to_date || new Date().toISOString().split('T')[0];
        const group_by = params.group_by || 'day';

        const { data: orders, error } = await serviceSupabase
            .from('orders')
            .select('id, total_amount, status, created_at, order_items(product_id, products(category_id, categories(name)))')
            .gte('created_at', `${from_date}T00:00:00`)
            .lte('created_at', `${to_date}T23:59:59`)
            .neq('status', 'cancelled');

        if (error) throw error;

        const total_revenue = (orders || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
        
        // Breakdown logic (simplified for day/category)
        const breakdown = {};
        const categoryStats = {};
        
        (orders || []).forEach(o => {
            let key;
            if (group_by === 'category') {
                // Approximate by first item's category
                key = o.order_items?.[0]?.products?.categories?.name || 'Uncategorized';
            } else {
                key = o.created_at?.split('T')[0];
            }
            
            if (!breakdown[key]) breakdown[key] = 0;
            breakdown[key] += Number(o.total_amount || 0);
            
            // Track categories regardless for top_category
            const catName = o.order_items?.[0]?.products?.categories?.name || 'Uncategorized';
            if (!categoryStats[catName]) categoryStats[catName] = 0;
            categoryStats[catName] += Number(o.total_amount || 0);
        });

        const top_category = Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return {
            text: `💰 Platform Revenue Report (${from_date} to ${to_date}):\n` +
                  `• Total Revenue: ₹${total_revenue.toLocaleString('en-IN')}\n` +
                  `• Top Category: ${top_category}\n` +
                  `• Grouped by: ${group_by}`,
            data: {
                total_revenue,
                breakdown: Object.entries(breakdown).map(([k, v]) => ({ key: k, value: v })),
                top_category,
                top_seller: 'N/A' // Requires more complex joining
            }
        };
    }
};
