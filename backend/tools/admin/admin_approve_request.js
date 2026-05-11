require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_approve_request',
    description: 'Approve a seller request (product or category).',
    roles: ['admin'],
    parameters: {
        request_id: 'string - Full request (product) ID',
        type: 'string - Request type ("product" or "category")'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Approve this ${params.type} request (${params.request_id})?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: product } = await serviceSupabase.from('products').select('name, metadata').eq('id', params.request_id).single();
        if (!product) return { text: "Request not found.", success: false };

        if (params.type === 'category') {
            // Actually create the category
            const catName = product.metadata?.category_name || product.name.replace('[CATEGORY REQUEST] ', '');
            const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
            await serviceSupabase.from('categories').insert({ name: catName, slug: slug });
        }

        // Mark the request as approved
        const newMeta = {
            ...product.metadata,
            status: 'approved',
            isApproved: true,
            adminRemark: 'Approved via AI Assistant'
        };

        const { error } = await serviceSupabase
            .from('products')
            .update({ metadata: newMeta })
            .eq('id', params.request_id);

        if (error) throw error;

        return {
            text: `✅ Request for ${params.type} has been approved.`,
            success: true,
            message: "Request approved"
        };
    }
};
