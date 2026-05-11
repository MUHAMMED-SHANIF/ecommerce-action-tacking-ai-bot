require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_approve_request',
    description: 'Approve a pending seller request.',
    roles: ['admin'],
    parameters: {
        request_id: 'string - Full request ID',
        type: 'string - "product" or "category"'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Approve this ${params.type} request (${params.request_id})?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        if (params.type === 'category') {
            const { data: request } = await serviceSupabase.from('products').select('metadata').eq('id', params.request_id).single();
            if (request?.metadata?.category_name) {
                const slug = request.metadata.category_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                await serviceSupabase.from('categories').insert({ name: request.metadata.category_name, slug });
            }
        }

        const { error } = await serviceSupabase
            .from('products')
            .update({ metadata: { status: 'approved', isApproved: true, approved_at: new Date().toISOString() } })
            .eq('id', params.request_id);

        if (error) throw error;

        return {
            text: `✅ ${params.type} request approved.`,
            success: true,
            message: "Request approved"
        };
    }
};
