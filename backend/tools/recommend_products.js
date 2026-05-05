module.exports = {
    name: 'recommend_products',
    description: 'Recommend products based on a category or type and optional budget/max price. Use when user asks for suggestions, recommendations, or "best" products.',
    parameters: {
        category: 'string - product category or type (e.g. phone, laptop, shirt)',
        budget: 'number? - maximum budget/price the user wants to spend'
    },
    requiresConfirmation: false,
    execute: async ({ params, user, supabase }) => {
        let categorySearch = params.category || params.type || params.query || params.product || "";
        const budget = params.budget || params.max_price;
        
        // Normalize plurals
        const normalizePlural = w => {
            const low = w.toLowerCase().trim();
            if (low === 'phones') return 'phone';
            if (low === 'smartphones') return 'smartphone';
            if (low === 'laptops') return 'laptop';
            if (low === 'tvs') return 'tv';
            if (low === 'earbuds') return 'earbud';
            if (low === 'watches') return 'watch';
            return low;
        };
        categorySearch = normalizePlural(categorySearch);

        // 1. Try to find matching categories
        let matchingCatIds = [];
        if (categorySearch && categorySearch.toLowerCase() !== 'all') {
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
            let orString = `name.ilike.%${categorySearch.trim()}%`;
            if (matchingCatIds.length > 0) {
                orString += `,category_id.in.(${matchingCatIds.join(',')})`;
            }
            dbQuery = dbQuery.or(orString);
        }

        if (budget) {
            dbQuery = dbQuery.lte('price', budget);
        }

        const { count: totalCount } = await dbQuery.select('*', { count: 'exact', head: true });
        dbQuery = dbQuery.limit(20);

        const { data, error } = await dbQuery.select('id, name, price, description, image_url, brand, stock_quantity, categories(name), metadata');
        if (error) throw error;
        
        let filtered = data || [];
        
        // --- RANKING FOR RELEVANCE ---
        if (categorySearch) {
            const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of', 'i', 'want', 'show', 'me', 'find', 'looking', 'please', 'help', 'search', 'get', 'recommend', 'suggestion', 'best'];
            const searchTokens = categorySearch.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1 && !stopWords.includes(t));
            const fullSearch = searchTokens.join(" ");
            
            console.log(`[Tool Debug: Recommend] CategoryQuery: "${categorySearch}", Tokens: [${searchTokens.join(', ')}], Budget: ${budget}`);

            const hasPhone = searchTokens.includes('phone') || searchTokens.includes('smartphone');
            const hasWatch = searchTokens.includes('watch');
            const hasTV = searchTokens.includes('tv');

            filtered = filtered.map(p => {
                const title = (p.name || "").toLowerCase();
                const catName = (p.categories?.name || "").toLowerCase();
                const desc = (p.description || "").toLowerCase();
                
                const titleWords = title.split(/\s+/);
                const catWords = catName.split(/\s+/);
                
                let score = 0;
                
                searchTokens.forEach(token => {
                    // Priority 1: Whole word match
                    if (titleWords.includes(token)) score += 500;
                    if (catWords.includes(token)) score += 600;

                    // Priority 2: Partial match
                    if (catName.includes(token)) score += 100;
                    if (title.includes(token)) score += 50;
                    if (desc.includes(token)) score += 5;
                });
                
                if (catName.includes(fullSearch)) score += 1000;
                if (title.includes(fullSearch)) score += 800;

                // --- STRICT AND CHECK ---
                const matchesAnyToken = searchTokens.some(token => title.includes(token) || catName.includes(token));

                // --- CATEGORY PENALTY ---
                if (hasPhone && (catName.includes('tv') || catName.includes('watch') || catName.includes('earbud'))) score -= 5000;
                if (hasWatch && catName.includes('phone')) score -= 5000;
                if (hasTV && catName.includes('phone')) score -= 5000;
                
                return { ...p, _score: score, _matches: matchesAnyToken };
            })
            .filter(p => p._matches && p._score > 0)
            .sort((a, b) => b._score - a._score);

            console.log(`[Tool Debug: Recommend] Found ${filtered.length} relevant suggestions`);
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
