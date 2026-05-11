require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_view_requests',
    description: 'View all seller requests (product approvals and category requests).',
    roles: ['admin'],
    parameters: {
        type: 'string? - Filter by type ("product" or "category")',
        status: 'string? - Filter by status ("pending", "approved", "rejected")'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        let query = serviceSupabase
            .from('products')
            .select('id, name, metadata, created_at')
            .order('created_at', { ascending: false });

        if (params.type === 'category') {
            query = query.eq('metadata->>type', 'category_request');
        } else if (params.type === 'product') {
            query = query.neq('metadata->>type', 'category_request');
        }

        if (params.status) {
            query = query.eq('metadata->>status', params.status);
        } else {
            query = query.eq('metadata->>status', 'pending'); // Default to pending
        }

        const { data: requests, error } = await query;
        if (error) throw error;

        const formatted = (requests || []).map(r => ({
            request_id: r.id,
            type: r.metadata?.type === 'category_request' ? 'Category' : 'Product Approval',
            seller_name: r.metadata?.sellerName || 'Unknown Seller',
            details: r.metadata?.category_name || r.name,
            created_at: r.created_at?.split('T')[0]
        }));

        return {
            text: `📋 Found ${formatted.length} pending requests.`,
            data: formatted
        };
    }
};
