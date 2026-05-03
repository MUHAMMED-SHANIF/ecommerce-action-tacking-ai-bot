module.exports = {
    name: 'update_cart_quantity',
    description: 'User wants to change or update the quantity of an item in the cart',
    parameters: {
        product_name: 'string - Name of the product to update',
        quantity: 'number - New total quantity'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        const { product_name, quantity } = params;
        const newQty = Number(quantity);

        const { data: cartItems } = await supabase.from('cart_items').select('id, quantity, products(id, name, price)').eq('user_id', user.id);
        const item = (cartItems || []).find(i => i.products.name.toLowerCase().includes(product_name.toLowerCase()));

        if (!item) {
            return { text: `I couldn't find "${product_name}" in your cart to update.`, success: false };
        }

        if (newQty <= 0) {
            await supabase.from('cart_items').delete().eq('id', item.id);
            return { text: `Removed **${item.products.name}** from your cart.`, success: true };
        } else {
            await supabase.from('cart_items').update({ quantity: newQty }).eq('id', item.id);
            return { text: `Updated **${item.products.name}** to ${newQty} units.`, success: true };
        }
    }
};
