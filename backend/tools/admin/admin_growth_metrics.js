require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_growth_metrics',
    description: 'Get user and order growth trends.',
    roles: ['admin'],
    parameters: {
        time_period: 'string? - "week", "month", or "quarter" (default: month)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const period = params.time_period || 'month';
        
        const now = new Date();
        let days = period === 'week' ? 7 : period === 'quarter' ? 90 : 30;
        const currentPeriodStart = new Date(now - days * 24 * 60 * 60 * 1000);
        const prevPeriodStart = new Date(now - 2 * days * 24 * 60 * 60 * 1000);

        const [currentOrders, prevOrders, authData] = await Promise.all([
            serviceSupabase.from('orders').select('total_price').gte('created_at', currentPeriodStart.toISOString()),
            serviceSupabase.from('orders').select('total_price').gte('created_at', prevPeriodStart.toISOString()).lt('created_at', currentPeriodStart.toISOString()),
            serviceSupabase.auth.admin.listUsers()
        ]);

        const currentRev = (currentOrders.data || []).reduce((s, o) => s + Number(o.total_price || 0), 0);
        const prevRev = (prevOrders.data || []).reduce((s, o) => s + Number(o.total_price || 0), 0);
        
        const revGrowth = prevRev === 0 ? 100 : ((currentRev - prevRev) / prevRev) * 100;
        
        const allUsers = authData.data?.users || [];
        const newUsers = allUsers.filter(u => new Date(u.created_at) >= currentPeriodStart).length;

        return {
            text: `📈 Growth Metrics (Last ${period}):\n` +
                  `• New Users: ${newUsers}\n` +
                  `• New Orders: ${currentOrders.data?.length || 0}\n` +
                  `• Revenue Growth: ${revGrowth.toFixed(1)}%`,
            data: {
                new_users: newUsers,
                new_orders: currentOrders.data?.length || 0,
                revenue_growth_percent: revGrowth,
                charts_data: [] // Placeholder for frontend charts
            }
        };
    }
};
