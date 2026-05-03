module.exports = {
    name: 'move_wishlist_to_cart',
    description: 'User wants to move a wishlist item into their shopping cart',
    parameters: {
        product_name: 'string - Name of the product to move'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        const { product_name } = params;

        const { data: wishlistItems } = await supabase.from('wishlists').select('product_id, products(id, name, price)').eq('user_id', user.id);
        const item = (wishlistItems || []).find(i => i.products?.name?.toLowerCase().includes(product_name.toLowerCase()));

        if (!item) return { text: `I couldn't find "${product_name}" in your wishlist.`, success: false };

        const { data: existingCart } = await supabase.from('cart_items').select('id, quantity').eq('product_id', item.product_id).eq('user_id', user.id).maybeSingle();
        
        if (existingCart) {
            await supabase.from('cart_items').update({ quantity: existingCart.quantity + 1 }).eq('id', existingCart.id);
        } else {
            await supabase.from('cart_items').insert({ user_id: user.id, product_id: item.product_id, quantity: 1 });
        }
        
        await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', item.product_id);

        return { text: `Moved **${item.products.name}** from wishlist to your cart! 🛒`, success: true, tool: "add_to_cart" };
    }
};
