module.exports = {
    name: 'admin_navigate',
    description: 'Navigate the admin to any page in the admin dashboard. Use for ANY request to go to, open, or view a page.',
    roles: ['admin'],
    parameters: {
        target: 'string - The target page: "dashboard", "products", "orders", "users", "suppliers", "categories", "requests", "banners", "adjust-home"',
        date_filter: 'string? - Date range: "today", "weekly", "monthly", "3months", "6months", "1year", "all"',
        status_filter: 'string? - Order status: "pending", "shipped", "delivered", "cancelled", "all"',
        seller_name: 'string? - For orders page: filter by seller name (partial match, e.g. "asus", "samsung")',
        download_csv: 'boolean? - Set true to auto-download a CSV report on the target page',
        filter_type: 'string? - For requests page: "seller", "product", "category", "all"',
        filter_status: 'string? - For requests page: "pending", "approved", "rejected", "history", "all"',
        action: 'string? - For products page: "add_product" to open the add product form',
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params }) => {
        const { target, date_filter, download_csv, filter_type, filter_status, action, status_filter, seller_name } = params;

        const pageNames = {
            dashboard: 'Dashboard',
            products: 'Products',
            orders: 'Orders',
            users: 'Users',
            suppliers: 'Suppliers',
            categories: 'Categories',
            requests: 'Requests',
            banners: 'Banners',
            'adjust-home': 'Home Layout'
        };

        const pageName = pageNames[target] || target;
        let text = `Taking you to the ${pageName} page now.`;

        if (target === 'dashboard' && date_filter) text += ` Applying ${date_filter} date filter.`;
        if (target === 'dashboard' && download_csv) text += ` Downloading the dashboard report.`;
        if (target === 'orders' && date_filter) text += ` Filtering by ${date_filter}.`;
        if (target === 'orders' && status_filter) text += ` Status: ${status_filter}.`;
        if (target === 'orders' && seller_name) text += ` Seller: ${seller_name}.`;
        if (target === 'orders' && download_csv) text += ` Downloading the orders CSV.`;
        if (target === 'requests' && filter_type) text += ` Showing ${filter_status || 'all'} ${filter_type} requests.`;
        if (target === 'products' && action === 'add_product') text = `Opening the Add Product form now.`;

        return {
            text,
            success: true,
            target,
            date_filter,
            status_filter,
            seller_name,
            download_csv,
            filter_type,
            filter_status,
            action
        };
    }
};
