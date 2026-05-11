require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_pause_product',
    description: 'Temporarily hide a product from the store (pause it). Product remains in database but not visible to customers.',
    roles: ['seller'],
    parameters: {
        product_name: 'string? - Name or partial name of the product to pause',
        reason: 'string? - Optional reason for pausing (e.g. "out of stock", "repricing")',
        result_ref: 'string? - internal product ID passed from previous steps'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => {
        const target = params.product_name || 'this product';
        return `Pause "${target}" from the store? Customers won't be able to see or buy it.`;
    },

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;

        const { product_name, reason, result_ref } = params;

        let query = serviceSupabase
            .from('products')
            .select('id, name, metadata')
            .eq('metadata->>sellerId', sellerId);

        if (result_ref) {
            query = query.eq('id', result_ref);
        } else {
            query = query.ilike('name', `%${product_name}%`);
        }

        const { data: products } = await query;

        if (!products || products.length === 0) {
            return { text: `I couldn't find "${product_name || 'that product'}" in your products.`, success: false };
        }

        const product = products[0];
        const newMeta = { ...product.metadata, isPaused: true, pauseReason: reason || 'Paused by seller' };

        const { error } = await serviceSupabase
            .from('products').update({ metadata: newMeta }).eq('id', product.id);

        if (error) throw error;

        return {
            text: `⏸️ "${product.name}" has been paused and hidden from the store.`,
            success: true,
            product_id: product.id,
            product_name: product.name
        };
    }
};
