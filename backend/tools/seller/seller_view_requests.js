require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_view_requests',
    description: "View all of the seller's submitted requests: product approvals and category requests, with their current status.",
    roles: ['seller'],
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;

        // Fetch pending/rejected products (product approval requests)
        const { data: productRequests } = await serviceSupabase
            .from('products')
            .select('id, name, metadata, created_at')
            .eq('metadata->>sellerId', sellerId)
            .in('metadata->>status', ['pending', 'rejected']);

        // Fetch category requests
        const { data: catRequests } = await serviceSupabase
            .from('products')
            .select('id, name, metadata, created_at')
            .eq('metadata->>sellerId', sellerId)
            .eq('metadata->>type', 'category_request');

        const productList = (productRequests || [])
            .filter(p => p.metadata?.type !== 'category_request')
            .map(p => ({
                type: 'Product Approval',
                name: p.name,
                status: p.metadata?.status || 'pending',
                admin_remark: p.metadata?.adminRemark || '',
                created_at: p.created_at?.split('T')[0]
            }));

        const catList = (catRequests || []).map(p => ({
            type: 'Category Request',
            name: p.metadata?.category_name || p.name,
            status: p.metadata?.status || 'pending',
            admin_remark: p.metadata?.adminRemark || '',
            created_at: p.created_at?.split('T')[0]
        }));

        const all = [...productList, ...catList].sort((a, b) => b.created_at?.localeCompare(a.created_at));

        if (all.length === 0) {
            return { text: '✅ You have no pending requests at the moment.', requests: [] };
        }

        const pending = all.filter(r => r.status === 'pending');
        const rejected = all.filter(r => r.status === 'rejected');

        return {
            text: `📋 Your Requests (${all.length} total):\n` +
                  (pending.length > 0 ? `\n⏳ Pending (${pending.length}):\n` + pending.map(r => `  - [${r.type}] ${r.name}`).join('\n') : '') +
                  (rejected.length > 0 ? `\n❌ Rejected (${rejected.length}):\n` + rejected.map(r => `  - [${r.type}] ${r.name}` + (r.admin_remark ? ` — "${r.admin_remark}"` : '')).join('\n') : ''),
            requests: all
        };
    }
};
