require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_edit_product',
    description: 'Update an existing product details.',
    roles: ['seller'],
    parameters: {
        product_id: 'string - Full product ID',
        updates: 'object - Fields to update (name, price, description, stock_quantity)'
    },
    requiresConfirmation: false,

    execute: async ({ params, user, supabase }) => {
        // Verify ownership
        const { data: product } = await supabase
            .from('products')
            .select('metadata')
            .eq('id', params.product_id)
            .single();

        if (!product || product.metadata?.sellerId !== user.id) {
            return { text: "You don't have permission to edit this product.", success: false };
        }

        const { error } = await supabase
            .from('products')
            .update(params.updates)
            .eq('id', params.product_id);

        if (error) throw error;

        return {
            text: `✅ Product updated successfully.`,
            success: true
        };
    }
};
