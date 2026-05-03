module.exports = {
    name: 'remove_from_cart',
    description: 'Remove a specific product from the user\'s shopping cart. Use when the user says "remove from cart", "delete from cart", or "I don\'t want X anymore".',
    parameters: {
        product_name: 'string - name or partial name of the product to remove'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        const { product_name } = params;

        // Find the product by name
        const { data: product } = await supabase
            .from('products')
            .select('id, name, price')
            .ilike('name', `%${product_name}%`)
            .limit(1)
            .maybeSingle();

        if (!product) {
            return {
                text: `I couldn't find "${product_name}" in our catalog. Make sure you're spelling it correctly!`,
                success: false
            };
        }

        // Check if it's in the cart
        const { data: cartItem } = await supabase
            .from('cart_items')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', product.id)
            .maybeSingle();

        if (!cartItem) {
            return {
                text: `**${product.name}** isn't in your cart. Want me to search for something else?`,
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
            text: `✅ Removed **${product.name}** from your cart. Say "view cart" to see what's left!`,
            success: true,
            product: { id: product.id, name: product.name }
        };
    }
};
