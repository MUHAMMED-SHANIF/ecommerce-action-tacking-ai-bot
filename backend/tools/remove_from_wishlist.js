module.exports = {
    name: 'remove_from_wishlist',
    description: 'Remove a product from the user\'s wishlist/favourites. Use when the user says "remove from wishlist", "unsave", or "remove from favourites".',
    parameters: {
        product_name: 'string - name or partial name of the product to remove from wishlist'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        const { product_name } = params;

        const searchTool = require('./search_products');

        // Find the product robustly
        const searchResult = await searchTool.execute({ params: { query: product_name }, user, supabase });
        
        if (!searchResult.products || searchResult.products.length === 0) {
            return {
                text: `I couldn't find "${product_name}" in our catalog. Please check the spelling!`,
                success: false
            };
        }

        const product = searchResult.products[0];

        // Check if it's in wishlist
        const { data: wishItem } = await supabase
            .from('wishlists')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', product.id)
            .maybeSingle();

        if (!wishItem) {
            return {
                text: `**${product.name}** is not in your wishlist. Want me to search for it or add it?`,
                success: false
            };
        }

        // Remove from wishlist
        const { error } = await supabase
            .from('wishlists')
            .delete()
            .eq('id', wishItem.id);

        if (error) throw error;

        return {
            text: `✅ Removed **${product.name}** from your wishlist.`,
            success: true,
            product: { id: product.id, name: product.name }
        };
    }
};
