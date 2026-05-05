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

        // 1. Try to find matching categories
        let matchingCatIds = [];
        if (categorySearch) {
            const { data: catData } = await supabase
                .from('categories')
                .select('id')
                .ilike('name', `%${categorySearch}%`);
            
            if (catData && catData.length > 0) {
                matchingCatIds = catData.map(c => c.id);
            }
        }

        let dbQuery = supabase
            .from('products')
            .select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata')
            .eq('metadata->>status', 'approved')
            .neq('metadata->>isPaused', 'true')
            .order('created_at', { ascending: false });

        if (categorySearch) {
            // Build a safe OR string
            let orString = `name.ilike.%${categorySearch.trim()}%,description.ilike.%${categorySearch.trim()}%`;
            
            if (matchingCatIds.length > 0) {
                orString += `,category_id.in.(${matchingCatIds.join(',')})`;
            }
            
            dbQuery = dbQuery.or(orString);
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
        
        let filtered = data || [];
        
        // --- RANKING FOR RELEVANCE ---
        if (categorySearch) {
            const searchTokens = categorySearch.toLowerCase().trim().split(/\s+/);
            const fullSearch = categorySearch.toLowerCase().trim();
            
            filtered = filtered.map(p => {
                const title = (p.name || "").toLowerCase();
                const catName = (p.categories?.name || "").toLowerCase();
                const desc = (p.description || "").toLowerCase();
                let score = 0;
                
                // Future-Proofing: Category conflict detection
                const hasPhone = searchTokens.includes('phone') || searchTokens.includes('smartphone');
                const hasTV = searchTokens.includes('tv') || searchTokens.includes('television');
                const hasLaptop = searchTokens.includes('laptop') || searchTokens.includes('computer');
                const hasWatch = searchTokens.includes('watch');

                searchTokens.forEach(token => {
                    if (catName.includes(token)) score += 100;
                    if (title.includes(token)) score += 50;
                    if (desc.includes(token)) score += 5;
                });
                
                if (catName.includes(fullSearch)) score += 200;
                if (title.includes(fullSearch)) score += 150;

                // --- CATEGORY PENALTY (Future Prevention) ---
                if (hasPhone && catName.includes('tv')) score -= 500;
                if (hasPhone && catName.includes('laptop')) score -= 500;
                
                if (hasTV && catName.includes('phone')) score -= 500;
                if (hasTV && catName.includes('watch')) score -= 500;
                
                if (hasLaptop && catName.includes('phone')) score -= 500;
                if (hasWatch && catName.includes('phone')) score -= 500;
                
                return { ...p, _score: score };
            })
            .sort((a, b) => b._score - a._score);
        }

        if (filtered.length === 0) {
            return {
                text: `I don't have ${categorySearch ? `"${categorySearch}" products` : 'products'} ${budget ? `under ₹${budget}` : ''} right now. Try browsing our full catalog!`,
                products: []
            };
        }
        
        const products = filtered.slice(0, 10).map(p => ({
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
