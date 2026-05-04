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
        let query = params.query || params.keyword || params.search || params.name || "";
        const categoryParam = params.category || params.type;
        let max_price = params.max_price || params.budget;

        // --- 1. PREPROCESSING & FILTER EXTRACTION ---
        let processedSearch = query.toLowerCase().trim();
        const underMatch = processedSearch.match(/(?:under|below|less than|within)\s*(\d+)/i);
        if (underMatch && !max_price) {
            max_price = parseFloat(underMatch[1]);
            processedSearch = processedSearch.replace(underMatch[0], "").trim();
        }
        
        const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of'];
        const tokens = processedSearch.split(/\s+/).filter(t => t.length > 1 && !stopWords.includes(t));
        const finalKeywordSearch = tokens.join(" ");

        let dbQuery = supabase
            .from('products')
            .select(`
                id, name, price, description, image_url, brand, stock_quantity, metadata,
                categories!inner(id, name)
            `)
            .eq('metadata->>status', 'approved')
            .neq('metadata->>isPaused', 'true');

        if (max_price) {
            dbQuery = dbQuery.lte('price', max_price);
        }

        if (categoryParam) {
            const { data: catData } = await supabase.from('categories').select('id').ilike('name', `%${categoryParam}%`).maybeSingle();
            if (catData) {
                dbQuery = dbQuery.eq('category_id', catData.id);
            }
        }

        const { data, error } = await dbQuery;
        if (error) throw error;

        let filtered = data || [];

        // --- 2. ADVANCED RANKING ---
        if (finalKeywordSearch) {
            const searchTokens = finalKeywordSearch.split(/\s+/);
            filtered = filtered.map(p => {
                const title = (p.name || "").toLowerCase();
                const desc = (p.description || "").toLowerCase();
                const brand = (p.brand || p.metadata?.brand || "").toLowerCase();
                const catName = (p.categories?.name || "").toLowerCase();
                
                let score = 0;
                searchTokens.forEach(token => {
                    if (title.includes(token)) score += 50;
                    if (brand.includes(token)) score += 40;
                    if (catName.includes(token)) score += 30;
                    if (desc.includes(token)) score += 5;
                });
                if (title.includes(finalKeywordSearch)) score += 100;
                
                return { ...p, _score: score };
            })
            .filter(p => p._score > 0)
            .sort((a, b) => b._score - a._score);
        }

        if (!filtered || filtered.length === 0) {
            return {
                text: `I couldn't find any products matching "${query || categoryParam || 'your search'}". Try a different keyword or browse our categories.`,
                products: [],
                query: query || categoryParam || null
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
            description: p.description?.substring(0, 100)
        }));

        return {
            text: `I found ${products.length} product${products.length > 1 ? 's' : ''} for you:`,
            products,
            query: query || null,
            category: categoryParam || null,
            max_price: max_price || null
        };
    }
};
