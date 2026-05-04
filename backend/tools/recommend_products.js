module.exports = {
    name: 'recommend_products',
    description: 'Recommend products based on a category or type and optional budget/max price. Use when user asks for suggestions, recommendations, or "best" products.',
    parameters: {
        category: 'string - product category or type (e.g. phone, laptop, shirt)',
        budget: 'number? - maximum budget/price the user wants to spend'
    },
    requiresConfirmation: false,
    execute: async ({ params, user, supabase }) => {
        const categorySearch = params.category || params.type || params.query || params.product || "";
        const budget = params.budget || params.max_price;

        // 1. Try to find a matching category first
        let categoryId = null;
        if (categorySearch) {
            const { data: catData } = await supabase
                .from('categories')
                .select('id')
                .ilike('name', `%${categorySearch}%`)
                .maybeSingle();
            
            if (catData) {
                categoryId = catData.id;
            }
        }

        let dbQuery = supabase
            .from('products')
            .select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata')
            .eq('metadata->>status', 'approved')
            .neq('metadata->>isPaused', 'true')
            .order('created_at', { ascending: false });

        if (categoryId) {
            // Strict category filtering if we found a match
            dbQuery = dbQuery.eq('category_id', categoryId);
        } else if (categorySearch) {
            // Keyword search across multiple fields if no exact category match
            const cleanSearch = categorySearch.trim();
            dbQuery = dbQuery.or(`name.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,categories.name.ilike.%${cleanSearch}%`);
        }

        if (budget) {
            dbQuery = dbQuery.lte('price', budget);
        }

        // Fetch total count for pagination info
        const { count: totalCount } = await dbQuery.select('*', { count: 'exact', head: true });

        // Apply a realistic limit
        dbQuery = dbQuery.limit(20);

        const { data, error } = await dbQuery.select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata');
        if (error) throw error;

        if (!data || data.length === 0) {
            return {
                text: `I don't have ${categorySearch ? `"${categorySearch}" products` : 'products'} ${budget ? `under ₹${budget}` : ''} right now. Try browsing our full catalog!`,
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
            description: p.description?.substring(0, 100),
            originalPrice: p.metadata?.originalPrice,
            discount: p.metadata?.discount
        }));

        const budgetText = budget ? ` under ₹${budget.toLocaleString()}` : '';
        return {
            text: `I found ${totalCount || products.length} products for you${budgetText}. Here are the top matches:`,
            products,
            totalCount: totalCount || products.length,
            category: categorySearch || null,
            query: categorySearch || null,
            max_price: budget || null
        };
    }
};
