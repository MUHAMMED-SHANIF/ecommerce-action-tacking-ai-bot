module.exports = {
    name: 'add_to_wishlist',
    description: 'Add a specific product to the user\'s wishlist. Use when the user says "add to wishlist" or "save for later".',
    parameters: {
        product_name: 'string? - name or partial name of the product to add',
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
                    text: `I couldn't find "${product_name}" in our store to add to your wishlist.`,
                    success: false
                };
            }
            targetProductId = searchResult.products[0].id;
            targetProductName = searchResult.products[0].name;
        }

        // Fetch full product details
        const { data: product, error: prodErr } = await supabase
            .from('products')
            .select('id, name, price, stock_quantity, image_url, metadata')
            .eq('id', targetProductId)
            .maybeSingle();

        if (prodErr) throw prodErr;
        if (!product) {
            return {
                text: `Sorry, there was an issue retrieving the details for "${targetProductName || 'that product'}".`,
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
