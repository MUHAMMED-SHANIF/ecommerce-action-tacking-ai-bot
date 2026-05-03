module.exports = {
    name: 'view_wishlist',
    description: 'User wants to see their saved wishlist items, open wishlist, or view saved items.',
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ user, supabase }) => {
        const { data: wishlist } = await supabase
            .from('wishlists')
            .select('product_id')
            .eq('user_id', user.id);
            
        const count = wishlist?.length || 0;
        
        if (count > 0) {
            return { 
                text: `You have ${count} saved items in your wishlist. Opening it now!`, 
                success: true 
            };
        }
        
        return { text: "Your wishlist is currently empty. Opening the page anyway!", success: true };
    }
};
