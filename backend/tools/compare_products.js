module.exports = {
    name: 'compare_products',
    description: 'Compare two products side by side. Use when the user asks to compare or "which is better" between two named products.',
    parameters: {
        product_a: 'string? - name of the first product to compare',
        product_b: 'string? - name of the second product to compare',
        product_a_ref: 'string? - internal product ID for first product',
        product_b_ref: 'string? - internal product ID for second product'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        const { product_a, product_b, product_a_ref, product_b_ref } = params;

        const fetchProduct = async (name, idRef) => {
            if (idRef) {
                const { data } = await supabase
                    .from('products')
                    .select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata')
                    .eq('id', idRef)
                    .maybeSingle();
                return data;
            } else if (name) {
                const { data } = await supabase
                    .from('products')
                    .select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata')
                    .ilike('name', `%${name}%`)
                    .eq('metadata->>status', 'approved')
                    .limit(1)
                    .maybeSingle();
                return data;
            }
            return null;
        };

        const [pa, pb] = await Promise.all([
            fetchProduct(product_a, product_a_ref), 
            fetchProduct(product_b, product_b_ref)
        ]);

        if (!pa && !pb) {
            return { text: `I couldn't find either "${product_a}" or "${product_b}" in our catalog.`, comparison: null };
        }
        if (!pa) return { text: `I couldn't find "${product_a}" in our catalog. Found "${pb.name}" though!`, comparison: null };
        if (!pb) return { text: `I couldn't find "${product_b}" in our catalog. Found "${pa.name}" though!`, comparison: null };

        const comparison = {
            productA: {
                id: pa.id, name: pa.name, price: pa.price, brand: pa.brand || pa.metadata?.brand || 'N/A',
                category: pa.categories?.name || 'N/A', stock: pa.stock_quantity, image: pa.image_url,
                description: pa.description?.substring(0, 150) || 'No description'
            },
            productB: {
                id: pb.id, name: pb.name, price: pb.price, brand: pb.brand || pb.metadata?.brand || 'N/A',
                category: pb.categories?.name || 'N/A', stock: pb.stock_quantity, image: pb.image_url,
                description: pb.description?.substring(0, 150) || 'No description'
            }
        };

        const cheaper = pa.price <= pb.price ? pa.name : pb.name;
        const priceDiff = Math.abs(pa.price - pb.price).toFixed(2);

        return {
            text: `Here's a comparison between **${pa.name}** and **${pb.name}**. **${cheaper}** is cheaper by ₹${priceDiff}.`,
            comparison
        };
    }
};
