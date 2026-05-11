require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_reject_product',
    description: 'Reject a pending product from a seller. Requires confirmation.',
    roles: ['admin'],
    parameters: {
        product_id: 'string - Full product ID',
        reason: 'string - Reason for rejection (shown to seller)'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Reject product ${params.product_id}? Reason: ${params.reason || 'Not specified'}`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: product } = await serviceSupabase.from('products').select('metadata').eq('id', params.product_id).single();
        if (!product) return { text: "Product not found.", success: false };

        const newMeta = {
            ...product.metadata,
            status: 'rejected',
            isApproved: false,
            adminRemark: params.reason || 'Rejected by admin'
        };

        const { error } = await serviceSupabase
            .from('products')
            .update({ metadata: newMeta })
            .eq('id', params.product_id);

        if (error) throw error;

        return {
            text: `❌ Product has been rejected. The seller has been notified.`,
            success: true,
            message: "Product rejected"
        };
    }
};
