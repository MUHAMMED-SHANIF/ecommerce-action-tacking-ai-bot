module.exports = {
    name: 'create_order',
    description: 'Create a new order / place an order for a product. Requires confirmation before executing. Use when user wants to buy or order a product.',
    parameters: {
        product_name: 'string - name of the product to order',
        quantity: 'number? - quantity to order (defaults to 1)',
        address_name: 'string? - label of saved address to deliver to, e.g. "home", "office". If not provided, uses the first saved address.'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Would you like me to place an order for "${params.product_name}" (Qty: ${params.quantity || 1})? This will use your saved address.`,
    execute: async ({ params, user, supabase }) => {
        const { product_name, quantity = 1 } = params;

        const searchTool = require('./search_products');

        // Find the product robustly
        const searchResult = await searchTool.execute({ params: { query: product_name }, user, supabase });
        
        if (!searchResult.products || searchResult.products.length === 0) {
            return { text: `I couldn't find "${product_name}" in stock. Try searching for it first.` };
        }

        const topProduct = searchResult.products[0];

        // Fetch full product details
        const { data: product, error: prodErr } = await supabase
            .from('products')
            .select('id, name, price, stock_quantity, metadata')
            .eq('id', topProduct.id)
            .maybeSingle();

        if (prodErr) throw prodErr;
        if (!product) {
            return { text: `Sorry, there was an issue retrieving the details for "${topProduct.name}".` };
        }

        if (product.stock_quantity < quantity) {
            return { text: `Sorry, only ${product.stock_quantity} unit(s) of ${product.name} are available. I can order ${product.stock_quantity} for you instead.` };
        }

        // Get user's saved addresses directly from the verified token payload
        const addresses = user?.user_metadata?.addresses || [];

        let defaultAddress = null;
        if (params.address_name) {
            const searchLabel = params.address_name.toLowerCase().replace(/address/g, '').replace(/my/g, '').trim();
            defaultAddress = addresses.find(a => {
                const aLabel = (a.label || '').toLowerCase().trim();
                return aLabel === searchLabel || aLabel.includes(searchLabel) || searchLabel.includes(aLabel);
            }) || null;
            if (!defaultAddress) {
                return {
                    text: `I couldn't find a saved address labelled **"${params.address_name}"**. Would you like me to create one? Just say "add my ${params.address_name} address" and tell me the details!`
                };
            }
        } else {
            defaultAddress = addresses[0] || null;
        }

        if (!defaultAddress) {
            return { text: `You don't have any saved delivery addresses yet. Ask me to **"add my home address"** and I'll save it for you!` };
        }

        const totalPrice = product.price * quantity;

        // Create the order
        const isUUID = /^[0-9a-f-]{36}$/i.test(user.id);
        const orderPayload = {
            total_price: totalPrice,
            status: 'pending',
            payment_status: 'pending',
            payment_method: 'cod',
            shipping_address: JSON.stringify(defaultAddress),
            ...(isUUID ? { user_id: user.id } : {})
        };

        const { data: newOrder, error: orderErr } = await supabase
            .from('orders')
            .insert(orderPayload)
            .select()
            .single();

        if (orderErr) throw orderErr;

        // Create order item
        await supabase.from('order_items').insert({
            order_id: newOrder.id,
            product_id: product.id,
            seller_id: product.metadata?.sellerId || null,
            seller_status: 'pending',
            quantity,
            price: product.price
        });

        // Reduce stock
        await supabase.from('products')
            .update({ stock_quantity: product.stock_quantity - quantity })
            .eq('id', product.id);

        const shortId = newOrder.id.split('-')[0].toUpperCase();
        return {
            text: `🎉 Order placed successfully!\n📦 **${product.name}** × ${quantity}\n💰 Total: ₹${totalPrice}\n🔖 Order ID: #${shortId}\n🏠 Delivering to: ${defaultAddress.city || 'your saved address'}\n\nYou can track it anytime by asking me "track my order".`
        };
    }
};
