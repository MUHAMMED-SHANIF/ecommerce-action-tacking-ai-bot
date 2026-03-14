const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'search_products',
    description: 'Search for products in the store by name keyword, category, or max price. Use this when the user wants to find or look for products.',
    parameters: {
        query: 'string - search keyword (optional if category given)',
        category: 'string? - product category to filter by',
        max_price: 'number? - maximum price filter'
    },
    requiresConfirmation: false,
    execute: async ({ params, user, supabase }) => {
        const { query, category, max_price } = params;

        let dbQuery = supabase
            .from('products')
            .select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata')
            .eq('metadata->>status', 'approved')
            .neq('metadata->>isPaused', 'true')
            .limit(6);

        if (query) {
            dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
        }

        if (max_price) {
            dbQuery = dbQuery.lte('price', max_price);
        }

        if (category) {
            const { data: catData } = await supabase
                .from('categories')
                .select('id')
                .ilike('name', `%${category}%`)
                .maybeSingle();
            if (catData) {
                dbQuery = dbQuery.eq('category_id', catData.id);
            }
        }

        const { data, error } = await dbQuery;
        if (error) throw error;
        if (!data || data.length === 0) {
            return {
                text: `I couldn't find any products matching "${query || category || 'your search'}". Try a different keyword or browse our categories.`,
                products: []
            };
        }

        const products = data.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image_url,
            category: p.categories?.name || 'General',
            brand: p.brand || p.metadata?.brand || '',
            stock: p.stock_quantity,
            description: p.description?.substring(0, 100)
        }));

        return {
            text: `I found ${products.length} product${products.length > 1 ? 's' : ''} for you:`,
            products
        };
    }
};
