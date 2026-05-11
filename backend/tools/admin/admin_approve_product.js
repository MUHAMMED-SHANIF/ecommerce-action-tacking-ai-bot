require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_approve_product',
    description: 'Approve a pending product, making it live on the store.',
    roles: ['admin'],
    parameters: {
        product_id: 'string? - Full product ID',
        feedback: 'string? - Optional feedback for the seller',
        result_ref: 'string? - internal product ID passed from previous steps'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => {
        const id = params.result_ref || params.product_id;
        return `Approve product ${id}?`;
    },

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const targetProductId = params.result_ref || params.product_id;
        
        const { data: product } = await serviceSupabase.from('products').select('metadata').eq('id', targetProductId).single();
        if (!product) return { text: "Product not found.", success: false };

        const newMeta = {
            ...product.metadata,
            status: 'approved',
            isApproved: true,
            isPaused: false,
            adminRemark: params.feedback || 'Approved by admin'
        };

        const { error } = await serviceSupabase
            .from('products')
            .update({ metadata: newMeta })
            .eq('id', targetProductId);

        if (error) throw error;

        return {
            text: `✅ Product approved successfully and is now live.`,
            success: true,
            message: "Product approved"
        };
    }
};
