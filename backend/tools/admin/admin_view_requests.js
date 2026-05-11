require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_view_requests',
    description: 'View pending seller requests for product approvals or category additions.',
    roles: ['admin'],
    parameters: {
        type: 'string? - Filter by "product" or "category"',
        status: 'string? - Filter by "pending", "approved", "rejected" (default: pending)'
    },
    requiresConfirmation: false,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const status = params.status || 'pending';
        
        // Unified request view: products are the primary 'request' vessel for now
        // Category requests are stored as special products with type 'category_request'
        let query = serviceSupabase
            .from('products')
            .select('id, name, metadata, created_at')
            .eq('metadata->>status', status)
            .order('created_at', { ascending: false });

        if (params.type) {
            if (params.type === 'category') {
                query = query.eq('metadata->>type', 'category_request');
            } else {
                query = query.neq('metadata->>type', 'category_request');
            }
        }

        const { data: requests, error } = await query;
        if (error) throw error;

        const formatted = (requests || []).map(r => ({
            request_id: r.id,
            type: r.metadata?.type === 'category_request' ? 'Category' : 'Product Approval',
            seller_name: r.metadata?.sellerName || 'Unknown',
            details: r.metadata?.category_name || r.name,
            created_at: r.created_at?.split('T')[0]
        }));

        return {
            text: `📋 Found ${formatted.length} ${status} requests.`,
            data: formatted
        };
    }
};
