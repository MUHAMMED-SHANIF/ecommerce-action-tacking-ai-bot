require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_reject_request',
    description: 'Reject a seller request (product or category). Requires confirmation.',
    roles: ['admin'],
    parameters: {
        request_id: 'string - Full request (product) ID',
        reason: 'string? - Reason for rejection'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Reject this request (${params.request_id})?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: product } = await serviceSupabase.from('products').select('metadata').eq('id', params.request_id).single();
        if (!product) return { text: "Request not found.", success: false };

        const newMeta = {
            ...product.metadata,
            status: 'rejected',
            isApproved: false,
            adminRemark: params.reason || 'Rejected by admin'
        };

        const { error } = await serviceSupabase
            .from('products')
            .update({ metadata: newMeta })
            .eq('id', params.request_id);

        if (error) throw error;

        return {
            text: `❌ Request has been rejected.`,
            success: true,
            message: "Request rejected"
        };
    }
};
