require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_platform_revenue',
    description: 'Get total platform revenue for a date range, broken down by day or month.',
    roles: ['admin'],
    parameters: {
        from_date: 'string? - Start date YYYY-MM-DD (default: 30 days ago)',
        to_date: 'string? - End date YYYY-MM-DD (default: today)',
        group_by: 'string? - Group data by "day" or "month" (default: day)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const from_date = params.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to_date = params.to_date || new Date().toISOString().split('T')[0];

        const { data: orders, error } = await serviceSupabase
            .from('orders')
            .select('id, total_amount, status, created_at')
            .gte('created_at', `${from_date}T00:00:00`)
            .lte('created_at', `${to_date}T23:59:59`);

        if (error) throw error;

        const validOrders = (orders || []).filter(o => o.status !== 'cancelled');
        const cancelledOrders = (orders || []).filter(o => o.status === 'cancelled');
        const total_revenue = validOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const total_orders = validOrders.length;

        // Group by day
        const byDay = {};
        validOrders.forEach(o => {
            const day = o.created_at?.split('T')[0];
            if (!byDay[day]) byDay[day] = { date: day, revenue: 0, orders: 0 };
            byDay[day].revenue += Number(o.total_amount || 0);
            byDay[day].orders++;
        });

        const breakdown = Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

        return {
            text: `💰 Platform Revenue (${from_date} to ${to_date}):\n` +
                  `• Total Revenue: ₹${total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n` +
                  `• Total Orders: ${total_orders}\n` +
                  `• Cancelled Orders: ${cancelledOrders.length}\n` +
                  (breakdown.length > 0
                    ? `\nRecent Days:\n` + breakdown.slice(0, 5).map(d => `  ${d.date}: ₹${d.revenue.toFixed(2)} (${d.orders} orders)`).join('\n')
                    : ''),
            total_revenue,
            total_orders,
            cancelled_orders: cancelledOrders.length,
            breakdown,
            from_date,
            to_date
        };
    }
};
