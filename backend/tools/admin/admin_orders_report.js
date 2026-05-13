require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_orders_report',
    description: 'List all platform orders with customer and seller details.',
    roles: ['admin'],
    parameters: {
        status: 'string? - Filter by status',
        from_date: 'string? - Start date YYYY-MM-DD',
        to_date: 'string? - End date YYYY-MM-DD',
        seller_id: 'string? - Filter by seller ID'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        let query = serviceSupabase
            .from('orders')
            .select(`
                id, 
                total_price, 
                status, 
                created_at, 
                user_id, 
                profiles(full_name),
                order_items(product_id, products(metadata))
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (params.status) query = query.eq('status', params.status);
        if (params.from_date) query = query.gte('created_at', `${params.from_date}T00:00:00`);
        if (params.to_date) query = query.lte('created_at', `${params.to_date}T23:59:59`);

        const { data: orders, error } = await query;
        if (error) throw error;

        const formatted = (orders || []).map(o => {
            // Extract seller name from first item's metadata
            const sellerName = o.order_items?.[0]?.products?.metadata?.sellerName || 'N/A';
            
            return {
                order_id: o.id.split('-')[0],
                customer: o.profiles?.full_name || 'Guest',
                seller: sellerName,
                total: o.total_price,
                status: o.status,
                created_at: o.created_at?.split('T')[0]
            };
        });

        if (params.seller_id) {
            // Further filter in JS if needed, though usually metadata based
        }

        return {
            text: `📦 Found ${formatted.length} orders.`,
            data: formatted
        };
    }
};
