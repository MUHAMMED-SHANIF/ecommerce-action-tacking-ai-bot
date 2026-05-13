require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_dashboard_stats',
    description: 'Get platform overview: total users, sellers, orders, revenue, pending approvals, and active products.',
    roles: ['admin'],
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const [productsRes, ordersRes, authData] = await Promise.all([
            serviceSupabase.from('products').select('id, metadata', { count: 'exact' }),
            serviceSupabase.from('orders').select('id, total_price, status', { count: 'exact' }),
            serviceSupabase.auth.admin.listUsers()
        ]);

        const users = authData.data?.users || [];
        const totalUsers = users.filter(u => u.user_metadata?.role === 'user' || !u.user_metadata?.role).length;
        const totalSellers = users.filter(u => u.user_metadata?.role === 'seller').length;
        
        const allOrders = ordersRes.data || [];
        const totalRevenue = allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_price || 0), 0);

        const allProducts = productsRes.data || [];
        const pendingApprovals = allProducts.filter(p => p.metadata?.status === 'pending').length;
        const activeProducts = allProducts.filter(p => p.metadata?.status === 'approved' && !p.metadata?.isPaused).length;

        return {
            text: `📊 EMart Dashboard Overview:\n` +
                  `• 👥 Total Users: ${totalUsers}\n` +
                  `• 🏪 Total Sellers: ${totalSellers}\n` +
                  `• 📦 Active Products: ${activeProducts}\n` +
                  `• 🛒 Total Orders: ${allOrders.length}\n` +
                  `• 💰 Total Revenue: ₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n` +
                  `• ⏳ Pending Approvals: ${pendingApprovals}`,
            data: {
                total_users: totalUsers,
                total_sellers: totalSellers,
                total_orders: allOrders.length,
                total_revenue: totalRevenue,
                pending_approvals: pendingApprovals,
                active_products: activeProducts
            }
        };
    }
};
