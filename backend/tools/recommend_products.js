module.exports = {
    name: 'recommend_products',
    description: 'Recommend products based on a category or type and optional budget/max price. Use when user asks for suggestions, recommendations, or "best" products.',
    parameters: {
        category: 'string - product category or type (e.g. phone, laptop, shirt)',
        budget: 'number? - maximum budget/price the user wants to spend'
    },
    requiresConfirmation: false,
    execute: async ({ params, user, supabase }) => {
        const category = params.category || params.type || params.query || params.product;
        const budget = params.budget || params.max_price;

        // Find category by name
        let categoryId = null;
        if (category) {
            const { data: catData } = await supabase
                .from('categories')
                .select('id, name')
                .ilike('name', `%${category}%`)
                .maybeSingle();
            if (catData) categoryId = catData.id;
        }

        let dbQuery = supabase
            .from('products')
            .select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata')
            .eq('metadata->>status', 'approved')
            .neq('metadata->>isPaused', 'true')
            .order('created_at', { ascending: false });

        if (categoryId) {
            dbQuery = dbQuery.eq('category_id', categoryId);
        } else if (category) {
            // Category was provided but no exact category matched. Try searching by name/description.
            dbQuery = dbQuery.or(`name.ilike.%${category}%,description.ilike.%${category}%`);
        }

        if (budget) {
            dbQuery = dbQuery.lte('price', budget);
        }

        // Apply a realistic limit
        dbQuery = dbQuery.limit(5);

        const { data, error } = await dbQuery;
        if (error) throw error;

        if (!data || data.length === 0) {
            return {
                text: `I don't have ${category ? `"${category}" products` : 'products'} ${budget ? `under ₹${budget}` : ''} right now. Try browsing our full catalog!`,
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

        const budgetText = budget ? ` under ₹${budget.toLocaleString()}` : '';
        return {
            text: `Here are my top recommendations for ${category || 'you'}${budgetText}:`,
            products,
            category: category || null,
            query: category || null,
            max_price: budget || null
        };
    }
};
