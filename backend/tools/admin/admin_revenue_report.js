require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_revenue_report',
    description: 'Platform-wide revenue analysis with grouping.',
    roles: ['admin'],
    parameters: {
        from_date: 'string? - Start date YYYY-MM-DD',
        to_date: 'string? - End date YYYY-MM-DD',
        group_by: 'string? - Group by "day", "week", "month", "seller", or "category"'
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
            .select('id, total_price, status, created_at, order_items(product_id, products(metadata, category_id, categories(name)))')
            .gte('created_at', `${from_date}T00:00:00`)
            .lte('created_at', `${to_date}T23:59:59`)
            .neq('status', 'cancelled');

        if (error) throw error;

        const total_revenue = (orders || []).reduce((s, o) => s + Number(o.total_price || 0), 0);
        
        const breakdown = {};
        const sellerStats = {};
        const categoryStats = {};
        
        (orders || []).forEach(o => {
            let key;
            const date = o.created_at?.split('T')[0];
            
            if (group_by === 'category') {
                key = o.order_items?.[0]?.products?.categories?.name || 'Uncategorized';
            } else if (group_by === 'seller') {
                key = o.order_items?.[0]?.products?.metadata?.sellerName || 'Unknown Seller';
            } else if (group_by === 'month') {
                key = date?.substring(0, 7);
            } else {
                key = date; // day/week (simplified)
            }
            
            if (!breakdown[key]) breakdown[key] = 0;
            breakdown[key] += Number(o.total_price || 0);
            
            // Track for top seller/category
            const seller = o.order_items?.[0]?.products?.metadata?.sellerName || 'Unknown Seller';
            const category = o.order_items?.[0]?.products?.categories?.name || 'Uncategorized';
            
            sellerStats[seller] = (sellerStats[seller] || 0) + Number(o.total_price || 0);
            categoryStats[category] = (categoryStats[category] || 0) + Number(o.total_price || 0);
        });

        const top_category = Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        const top_seller = Object.entries(sellerStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

        return {
            text: `💰 Revenue Report: ₹${total_revenue.toLocaleString('en-IN')}\nTop Category: ${top_category}\nTop Seller: ${top_seller}`,
            data: {
                total_revenue,
                breakdown: Object.entries(breakdown).map(([k, v]) => ({ label: k, value: v })),
                top_category,
                top_seller
            }
        };
    }
};
