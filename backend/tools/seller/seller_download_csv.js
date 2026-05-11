require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/**
 * seller_download_csv
 * Generate and return a CSV data URI for a report type.
 * Frontend can trigger download from the data URI.
 */
module.exports = {
    name: 'seller_download_csv',
    description: "Download a report as CSV. Available report types: 'sales', 'inventory', 'orders', 'cancelled'.",
    roles: ['seller'],
    parameters: {
        report_type: "string - Type of report: 'sales', 'inventory', 'orders', or 'cancelled'",
        from_date: 'string? - Start date YYYY-MM-DD (default: 30 days ago)',
        to_date: 'string? - End date YYYY-MM-DD (default: today)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;
        const report_type = params.report_type || 'sales';
        const from_date = params.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to_date = params.to_date || new Date().toISOString().split('T')[0];

        const { data: products } = await serviceSupabase
            .from('products').select('id, name, price, stock_quantity').eq('metadata->>sellerId', sellerId);

        if (!products || products.length === 0) {
            return { text: "You don't have any products to generate a report for.", success: false };
        }

        let csvRows = [];
        let filename = '';

        if (report_type === 'inventory') {
            csvRows = [['Product Name', 'Price', 'Stock', 'Status']];
            products.forEach(p => {
                const status = p.stock_quantity === 0 ? 'Out of Stock' : p.stock_quantity <= 5 ? 'Low Stock' : 'OK';
                csvRows.push([p.name, p.price, p.stock_quantity, status]);
            });
            filename = `inventory_${to_date}.csv`;

        } else {
            // Sales / orders / cancelled - fetch order items
            const { data: items } = await serviceSupabase
                .from('order_items')
                .select('product_id, quantity, price_at_purchase, orders!inner(id, created_at, status)')
                .in('product_id', products.map(p => p.id))
                .gte('orders.created_at', `${from_date}T00:00:00`)
                .lte('orders.created_at', `${to_date}T23:59:59`);

            const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));
            const filtered = report_type === 'cancelled'
                ? (items || []).filter(i => i.orders?.status === 'cancelled')
                : (items || []).filter(i => i.orders?.status !== 'cancelled');

            csvRows = [['Order ID', 'Product', 'Quantity', 'Price', 'Revenue', 'Status', 'Date']];
            filtered.forEach(i => {
                csvRows.push([
                    i.orders?.id?.split('-')[0] || '',
                    productMap[i.product_id] || '',
                    i.quantity,
                    i.price_at_purchase,
                    (i.price_at_purchase * i.quantity).toFixed(2),
                    i.orders?.status || '',
                    i.orders?.created_at?.split('T')[0] || ''
                ]);
            });
            filename = `${report_type}_${from_date}_to_${to_date}.csv`;
        }

        // Convert to CSV string
        const csvContent = csvRows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const csvDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
        const row_count = csvRows.length - 1; // Exclude header

        return {
            text: `📥 CSV ready! "${filename}" (${row_count} rows). Click the download link below.`,
            success: true,
            csv_data_uri: csvDataUri,
            filename,
            row_count,
            download: true // Frontend uses this to trigger download
        };
    }
};
