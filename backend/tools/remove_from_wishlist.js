module.exports = {
    name: 'remove_from_wishlist',
    description: 'Remove a product from the user\'s wishlist/favourites. Use when the user says "remove from wishlist", "unsave", or "remove from favourites".',
    parameters: {
        product_name: 'string? - name or partial name of the product to remove from wishlist',
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
                    text: `I couldn't find "${product_name}" in our catalog. Please check the spelling!`,
                    success: false
                };
            }
            targetProductId = searchResult.products[0].id;
            targetProductName = searchResult.products[0].name;
        }

        // Check if it's in wishlist
        const { data: wishItem } = await supabase
            .from('wishlists')
            .select('id, products(name)')
            .eq('user_id', user.id)
            .eq('product_id', targetProductId)
            .maybeSingle();

        if (!wishItem) {
            return {
                text: `**${targetProductName || 'That product'}** is not in your wishlist. Want me to search for it or add it?`,
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
            text: `✅ Removed **${wishItem.products?.name || targetProductName || 'the product'}** from your wishlist.`,
            success: true,
            product: { id: targetProductId, name: wishItem.products?.name || targetProductName }
        };
    }
};
