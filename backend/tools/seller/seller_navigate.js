module.exports = {
    name: 'seller_navigate',
    description: 'Navigate the seller to a specific page on their dashboard. MUST be used when the user wants to: (1) download an orders/analytics/dashboard CSV report, (2) apply date/status filters to any page, or (3) navigate anywhere.',
    roles: ['seller'],
    parameters: {
        target: 'string - The target page: "dashboard", "products", "orders", "analytics", "requests", "settings", "add_product", "category_request"',
        date_filter: 'string? - Optional date filter: "today", "weekly", "monthly", "3months", "6months", "1year", "all"',
        status_filter: 'string? - Optional status filter for orders: "pending", "shipped", "cancelled", "all"',
        download_csv: 'boolean? - Set to true if the user wants to download a CSV report of that page',
        filter_type: 'string? - For requests page only: "product", "category", or "all"',
        filter_status: 'string? - For requests page only: "pending", "approved", "rejected", or "all"',
        bulk_action: 'string? - For orders page only: "accepted" or "rejected" — automatically accept or reject all pending items in the filtered view'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params }) => {
        const { target, date_filter, status_filter, download_csv, filter_type, filter_status, bulk_action } = params;
        const targets = {
            dashboard: 'dashboard',
            products: 'products',
            orders: 'orders',
            analytics: 'analytics',
            requests: 'requests',
            settings: 'settings',
            add_product: 'add product page',
            category_request: 'category request page'
        };

        const pageName = targets[target] || target;
        let text = `Sure, taking you to your ${pageName} now.`;
        if (target === 'orders' || target === 'dashboard' || target === 'analytics') {
            if (download_csv) {
                text += ` Generating your CSV report with your requested filters...`;
            } else {
                text += ` Would you also like to download a CSV performance report?`;
            }
        }
        if (target === 'requests' && (filter_type || filter_status)) {
            text += ` Filtering to show ${filter_status || 'all'} ${filter_type || ''} requests.`;
        }
        if (target === 'orders' && bulk_action) {
            text += ` I will automatically ${bulk_action === 'accepted' ? 'accept' : 'reject'} all pending items in the filtered view.`;
        }

        return { 
            text, 
            success: true,
            target,
            date_filter,
            status_filter,
            download_csv,
            filter_type,
            filter_status,
            bulk_action
        };
    }
};
