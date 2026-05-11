require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_all_orders',
    description: 'Get all platform-wide orders with optional status and date filters.',
    roles: ['admin'],
    parameters: {
        status: 'string? - Filter by status: pending, paid, shipped, delivered, cancelled',
        from_date: 'string? - Start date YYYY-MM-DD',
        to_date: 'string? - End date YYYY-MM-DD',
        limit: 'number? - Max results (default: 25)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const limit = parseInt(params.limit) || 25;

        let query = serviceSupabase
            .from('orders')
            .select('id, status, total_amount, payment_method, created_at, user_id')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (params.status) query = query.eq('status', params.status);
        if (params.from_date) query = query.gte('created_at', `${params.from_date}T00:00:00`);
        if (params.to_date) query = query.lte('created_at', `${params.to_date}T23:59:59`);

        const { data: orders, error } = await query;
        if (error) throw error;

        const total_value = (orders || []).filter(o => o.status !== 'cancelled')
            .reduce((s, o) => s + Number(o.total_amount || 0), 0);

        const statusFilter = params.status ? ` [${params.status.toUpperCase()}]` : '';

        return {
            text: `📦 Platform Orders${statusFilter}: ${orders?.length || 0} found\n` +
                  `• Total Value: ₹${total_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n\n` +
                  (orders || []).slice(0, 6).map(o =>
                    `  #${o.id?.split('-')[0]} — ${o.status?.toUpperCase()} — ₹${o.total_amount} — ${o.created_at?.split('T')[0]}`
                  ).join('\n') +
                  ((orders?.length || 0) > 6 ? `\n  ...and ${orders.length - 6} more` : ''),
            orders: (orders || []).map(o => ({
                id: o.id,
                short_id: o.id?.split('-')[0],
                status: o.status,
                total_amount: o.total_amount,
                payment_method: o.payment_method,
                created_at: o.created_at?.split('T')[0]
            })),
            total_found: orders?.length || 0,
            total_value
        };
    }
};
