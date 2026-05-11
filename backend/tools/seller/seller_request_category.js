require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_request_category',
    description: 'Request the admin to add a new product category to the platform.',
    roles: ['seller'],
    parameters: {
        category_name: 'string - Name of the new category being requested',
        reason: 'string? - Why this category is needed'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        if (!params.category_name) {
            return { text: 'Please provide the category name you want to request.', success: false };
        }

        // Store request in products table as a special "category_request" metadata entry
        // (Using existing requests table pattern from the platform)
        const { data, error } = await serviceSupabase
            .from('products')
            .insert({
                name: `[CATEGORY REQUEST] ${params.category_name}`,
                description: params.reason || 'New category requested by seller',
                price: 0,
                stock_quantity: 0,
                metadata: {
                    type: 'category_request',
                    category_name: params.category_name,
                    reason: params.reason || '',
                    sellerId: user.id,
                    status: 'pending',
                    isApproved: false
                }
            }).select().single();

        if (error) throw error;

        return {
            text: `✅ Category request for "${params.category_name}" submitted! The admin will review it shortly.`,
            success: true,
            request_id: data?.id
        };
    }
};
