module.exports = {
    name: 'add_to_wishlist',
    description: 'Add a specific product to the user\'s wishlist. Use when the user says "add to wishlist" or "save for later".',
    parameters: {
        product_name: 'string - name or partial name of the product to add'
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
                text: `I couldn't find "${product_name}" in our store to add to your wishlist.`,
                success: false
            };
        }

        const topProduct = searchResult.products[0];

        // Fetch full product details
        const { data: product, error: prodErr } = await supabase
            .from('products')
            .select('id, name, price, stock_quantity, image_url, metadata')
            .eq('id', topProduct.id)
            .maybeSingle();

        if (prodErr) throw prodErr;
        if (!product) {
            return {
                text: `Sorry, there was an issue retrieving the details for "${topProduct.name}".`,
                success: false
            };
        }

        const { error: insertErr } = await supabase.from('wishlists').insert({
            user_id: user.id,
            product_id: product.id
        });

        if (insertErr && insertErr.code !== '23505') throw insertErr;

        return {
            text: `✅ Added **${product.name}** to your wishlist! ❤️ — Say "view wishlist" to see everything.`,
            success: true,
            product: { id: product.id, name: product.name }
        };
    }
};
