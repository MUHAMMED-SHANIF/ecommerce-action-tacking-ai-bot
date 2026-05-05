module.exports = {
    name: 'add_to_cart',
    description: 'Add a specific product to the user\'s shopping cart. Use when the user says "add to cart", "put in cart", or "I want to buy X" (without placing an order). Do NOT use create_order for this.',
    parameters: {
        product_name: 'string - name or partial name of the product to add',
        quantity: 'number? - how many to add (defaults to 1)'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        const { product_name, quantity = 1 } = params;

        const searchTool = require('./search_products');

        // Find the product robustly using the search tool's intelligent ranking
        const searchResult = await searchTool.execute({ params: { query: product_name }, user, supabase });
        
        if (!searchResult.products || searchResult.products.length === 0) {
            return {
                text: `I couldn't find "${product_name}" in our store. Try searching with a different name!`,
                success: false
            };
        }

        const topProduct = searchResult.products[0];

        // Fetch full product details needed for cart
        const { data: product, error: prodErr } = await supabase
            .from('products')
            .select('id, name, price, stock_quantity, image_url, metadata')
            .eq('id', topProduct.id)
            .maybeSingle();

        if (prodErr) throw prodErr;
        if (!product || product.stock_quantity <= 0) {
             return {
                text: `Sorry, "${topProduct.name}" is currently out of stock.`,
                success: false
            };
        }

        // Check if already in cart
        const { data: existing } = await supabase
            .from('cart_items')
            .select('id, quantity')
            .eq('user_id', user.id)
            .eq('product_id', product.id)
            .maybeSingle();

        if (existing) {
            // Update quantity
            const newQty = existing.quantity + Number(quantity);
            await supabase
                .from('cart_items')
                .update({ quantity: newQty })
                .eq('id', existing.id);

            return {
                text: `✅ Updated! **${product.name}** quantity in your cart is now ${newQty}. 🛒`,
                success: true,
                product: { id: product.id, name: product.name, price: product.price }
            };
        }

        // Add new item to cart
        const { error: insertErr } = await supabase.from('cart_items').insert({
            user_id: user.id,
            product_id: product.id,
            quantity: Number(quantity)
        });

        if (insertErr) throw insertErr;

        return {
            text: `✅ Added **${product.name}** to your cart! 🛒 (Qty: ${quantity}, ₹${product.price} each) — Say "view cart" to see everything.`,
            success: true,
            product: { id: product.id, name: product.name, price: product.price }
        };
    }
};
