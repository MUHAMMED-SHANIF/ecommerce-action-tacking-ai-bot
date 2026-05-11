require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_reject_product',
    description: 'Reject a pending product submission from a seller.',
    roles: ['admin'],
    parameters: {
        product_id: 'string? - Full product ID',
        reason: 'string - Reason for rejection',
        result_ref: 'string? - internal product ID passed from previous steps'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => {
        const id = params.result_ref || params.product_id;
        return `Reject product ${id}? Reason: ${params.reason}`;
    },

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const targetProductId = params.result_ref || params.product_id;
        
        const { data: product } = await serviceSupabase.from('products').select('metadata').eq('id', targetProductId).single();
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
            .eq('id', targetProductId);

        if (error) throw error;

        return {
            text: `❌ Product rejected. Seller will see reason: "${params.reason}"`,
            success: true,
            message: "Product rejected"
        };
    }
};
