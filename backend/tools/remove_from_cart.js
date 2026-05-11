module.exports = {
    name: 'remove_from_cart',
    description: 'Remove a specific product from the user\'s shopping cart. Use when the user says "remove from cart", "delete from cart", or "I don\'t want X anymore".',
    parameters: {
        product_name: 'string? - name or partial name of the product to remove',
        result_ref: 'string? - internal product ID passed from previous steps'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        const { product_name, product_id, result_ref } = params;

        let targetProductId = product_id || result_ref;
        let targetProductName = product_name;

        if (!targetProductId) {
            const searchTool = require('./search_products');
            const searchResult = await searchTool.execute({ params: { query: product_name }, user, supabase });
            
            if (!searchResult.products || searchResult.products.length === 0) {
                return {
                    text: `I couldn't find "${product_name}" in our catalog. Make sure you're spelling it correctly!`,
                    success: false
                };
            }
            targetProductId = searchResult.products[0].id;
            targetProductName = searchResult.products[0].name;
        }

        // Check if it's in the cart
        const { data: cartItem } = await supabase
            .from('cart_items')
            .select('id, products(name)')
            .eq('user_id', user.id)
            .eq('product_id', targetProductId)
            .maybeSingle();

        if (!cartItem) {
            return {
                text: `**${targetProductName || 'That product'}** isn't in your cart. Want me to search for something else?`,
                success: false
            };
        }

        // Remove from cart
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', cartItem.id);

        if (error) throw error;

        return {
            text: `✅ Removed **${cartItem.products?.name || targetProductName || 'the product'}** from your cart. Say "view cart" to see what's left!`,
            success: true,
            product: { id: targetProductId, name: cartItem.products?.name || targetProductName }
        };
    }
};
