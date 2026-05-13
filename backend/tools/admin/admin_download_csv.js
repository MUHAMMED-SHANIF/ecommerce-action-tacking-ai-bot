require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_download_csv',
    description: "Download platform-wide reports as CSV. Types: 'orders', 'sellers', 'products', 'revenue'.",
    roles: ['admin'],
    parameters: {
        report_type: "string - Report type: 'orders', 'sellers', 'products', or 'revenue'",
        from_date: 'string? - Start date YYYY-MM-DD',
        to_date: 'string? - End date YYYY-MM-DD'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const report_type = params.report_type || 'orders';
        const from_date = params.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to_date = params.to_date || new Date().toISOString().split('T')[0];

        let csvRows = [];
        let filename = '';

        if (report_type === 'orders') {
            const { data: orders } = await serviceSupabase
                .from('orders').select('id, status, total_price, payment_method, created_at')
                .gte('created_at', `${from_date}T00:00:00`).lte('created_at', `${to_date}T23:59:59`);
            csvRows = [['Order ID', 'Status', 'Total Price', 'Payment Method', 'Date']];
            (orders || []).forEach(o => csvRows.push([o.id?.split('-')[0], o.status, o.total_price, o.payment_method, o.created_at?.split('T')[0]]));
            filename = `all_orders_${from_date}_to_${to_date}.csv`;

        } else if (report_type === 'sellers') {
            const { data: authData } = await serviceSupabase.auth.admin.listUsers();
            const sellers = (authData?.users || []).filter(u => u.user_metadata?.role === 'seller');
            csvRows = [['Name', 'Email', 'Trusted', 'Joined']];
            sellers.forEach(s => csvRows.push([s.user_metadata?.full_name || s.user_metadata?.name || '', s.email, s.user_metadata?.isTrusted ? 'Yes' : 'No', s.created_at?.split('T')[0]]));
            filename = `all_sellers_${to_date}.csv`;

        } else if (report_type === 'users') {
            const { data: authData } = await serviceSupabase.auth.admin.listUsers();
            const users = (authData?.users || []).filter(u => !u.user_metadata?.role || u.user_metadata?.role === 'user');
            csvRows = [['Name', 'Email', 'Joined']];
            users.forEach(u => csvRows.push([u.user_metadata?.full_name || u.user_metadata?.name || '', u.email, u.created_at?.split('T')[0]]));
            filename = `all_users_${to_date}.csv`;

        } else if (report_type === 'products') {
            const { data: products } = await serviceSupabase
                .from('products').select('name, price, stock_quantity, metadata, categories(name)');
            csvRows = [['Name', 'Price', 'Stock', 'Category', 'Status', 'Seller ID']];
            (products || []).forEach(p => csvRows.push([p.name, p.price, p.stock_quantity, p.categories?.name || '', p.metadata?.status || '', p.metadata?.sellerId?.split('-')[0] || '']));
            filename = `all_products_${to_date}.csv`;

        } else if (report_type === 'revenue') {
            const { data: orders } = await serviceSupabase
                .from('orders').select('id, total_price, status, created_at')
                .gte('created_at', `${from_date}T00:00:00`).lte('created_at', `${to_date}T23:59:59`)
                .neq('status', 'cancelled');
            csvRows = [['Order ID', 'Revenue', 'Date']];
            (orders || []).forEach(o => csvRows.push([o.id?.split('-')[0], o.total_price, o.created_at?.split('T')[0]]));
            filename = `revenue_report_${from_date}_to_${to_date}.csv`;
        }

        if (csvRows.length === 0) {
            return { text: `No data found for report type "${report_type}".`, success: false };
        }

        const csvContent = csvRows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const csvDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
        const row_count = csvRows.length - 1;

        return {
            text: `📥 CSV ready! "${filename}" (${row_count} rows). Click the download link below.`,
            success: true,
            csv_data_uri: csvDataUri,
            filename,
            row_count,
            download: true
        };
    }
};
