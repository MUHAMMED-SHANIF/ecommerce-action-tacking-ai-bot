module.exports = {
    name: 'get_product_details',
    description: 'Get full details about a specific product by name. Use when user asks about a specific product, its price, features, or availability.',
    parameters: {
        product_name: 'string - name or partial name of the product'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        const { product_name } = params;

        const { data, error } = await supabase
            .from('products')
            .select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata')
            .ilike('name', `%${product_name}%`)
            .eq('metadata->>status', 'approved')
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return { text: `I couldn't find a product named "${product_name}". Try searching with a different name.`, product: null };
        }

        const product = {
            id: data.id,
            name: data.name,
            price: data.price,
            originalPrice: data.metadata?.originalPrice,
            discount: data.metadata?.discount,
            brand: data.brand || data.metadata?.brand || 'N/A',
            category: data.categories?.name || 'General',
            stock: data.stock_quantity,
            image: data.image_url,
            description: data.description || 'No description available',
            rating: data.metadata?.rating || 0,
            numReviews: data.metadata?.numReviews || 0
        };

        const stockStatus = product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left!` : 'Out of Stock';
        const discountText = product.discount ? ` (${product.discount}% off)` : '';

        return {
            text: `Here are the details for **${product.name}**:\n💰 Price: ₹${product.price}${discountText}\n📦 Stock: ${stockStatus}\n⭐ Rating: ${product.rating}/5 (${product.numReviews} reviews)\n🏷️ Brand: ${product.brand}`,
            product
        };
    }
};
