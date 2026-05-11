require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_reject_request',
    description: 'Reject a pending seller request.',
    roles: ['admin'],
    parameters: {
        request_id: 'string - Full request ID',
        reason: 'string? - Reason for rejection'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Reject this request (${params.request_id})? Reason: ${params.reason || 'None'}`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { error } = await serviceSupabase
            .from('products')
            .update({ metadata: { status: 'rejected', isApproved: false, adminRemark: params.reason || 'Rejected' } })
            .eq('id', params.request_id);

        if (error) throw error;

        return {
            text: `❌ Request rejected.`,
            success: true,
            message: "Request rejected"
        };
    }
};
