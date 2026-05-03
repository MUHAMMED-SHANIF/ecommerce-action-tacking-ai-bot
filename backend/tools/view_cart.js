module.exports = {
    name: 'view_cart',
    description: 'User wants to see what is in their cart, open cart, or view their bag.',
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ user, supabase }) => {
        const { data: cartItems } = await supabase
            .from('cart_items')
            .select('quantity, products(name, price)')
            .eq('user_id', user.id);
            
        const count = cartItems?.length || 0;
        let total = 0;
        if (count > 0) {
            total = cartItems.reduce((sum, item) => sum + (item.quantity * (item.products?.price || 0)), 0);
            return { 
                text: `You have ${count} items in your cart totalling ₹${total}. Opening your cart now!`, 
                success: true 
            };
        }
        
        return { text: "Your cart is currently empty. Opening it anyway!", success: true };
    }
};
