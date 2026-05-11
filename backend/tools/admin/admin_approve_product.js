require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_approve_product',
    description: 'Approve a pending product by name or ID, making it live on the store.',
    roles: ['admin'],
    parameters: {
        product_name: 'string - Name or partial name of the product to approve',
        remark: 'string? - Optional approval note for the seller'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Approve "${params.product_name}" and make it live on the store?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        const { data: products, error: fetchErr } = await serviceSupabase
            .from('products')
            .select('id, name, metadata')
            .eq('metadata->>status', 'pending')
            .ilike('name', `%${params.product_name}%`)
            .limit(1);

        if (fetchErr) throw fetchErr;
        if (!products || products.length === 0) {
            return { text: `No pending product matching "${params.product_name}" found.`, success: false };
        }

        const product = products[0];
        const newMeta = {
            ...product.metadata,
            status: 'approved',
            isApproved: true,
            isPaused: false,
            adminRemark: params.remark || 'Approved by admin',
            approvedAt: new Date().toISOString()
        };

        const { error: updateErr } = await serviceSupabase
            .from('products')
            .update({ metadata: newMeta })
            .eq('id', product.id);

        if (updateErr) throw updateErr;

        return {
            text: `✅ "${product.name}" has been approved and is now live on the store!`,
            success: true,
            product_id: product.id,
            product_name: product.name
        };
    }
};
