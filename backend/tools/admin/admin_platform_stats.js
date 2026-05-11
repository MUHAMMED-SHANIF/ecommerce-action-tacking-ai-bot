require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_platform_stats',
    description: 'Get a quick platform overview: total users, sellers, products, orders, and revenue.',
    roles: ['admin'],
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const [productsRes, ordersRes, categoriesRes, authData] = await Promise.all([
            serviceSupabase.from('products').select('id, metadata', { count: 'exact' }),
            serviceSupabase.from('orders').select('id, total_amount, status', { count: 'exact' }),
            serviceSupabase.from('categories').select('id', { count: 'exact' }),
            serviceSupabase.auth.admin.listUsers()
        ]);

        const users = authData.data?.users || [];
        const totalUsers = users.filter(u => u.user_metadata?.role === 'user' || !u.user_metadata?.role).length;
        const totalSellers = users.filter(u => u.user_metadata?.role === 'seller').length;
        const totalAdmins = users.filter(u => u.user_metadata?.role === 'admin').length;

        const allOrders = ordersRes.data || [];
        const totalRevenue = allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);

        const allProducts = productsRes.data || [];
        const pendingProducts = allProducts.filter(p => p.metadata?.status === 'pending').length;
        const approvedProducts = allProducts.filter(p => p.metadata?.status === 'approved').length;

        const today = new Date().toISOString().split('T')[0];
        const ordersToday = allOrders.filter(o => o.created_at?.startsWith(today)).length;

        return {
            text: `📊 EMart Platform Overview:\n` +
                  `• 👥 Users: ${totalUsers} | Sellers: ${totalSellers} | Admins: ${totalAdmins}\n` +
                  `• 📦 Products: ${approvedProducts} live, ${pendingProducts} pending approval\n` +
                  `• 🛒 Total Orders: ${allOrders.length} (${ordersToday} today)\n` +
                  `• 💰 Total Platform Revenue: ₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n` +
                  `• 🏷️ Categories: ${categoriesRes.count || 0}`,
            stats: {
                total_users: totalUsers,
                total_sellers: totalSellers,
                total_admins: totalAdmins,
                approved_products: approvedProducts,
                pending_products: pendingProducts,
                total_orders: allOrders.length,
                orders_today: ordersToday,
                total_revenue: totalRevenue,
                total_categories: categoriesRes.count || 0
            }
        };
    }
};
