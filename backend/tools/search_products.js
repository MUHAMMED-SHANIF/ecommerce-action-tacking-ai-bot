const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'search_products',
    description: 'Search for products in the store by name keyword, category, price, brand, or deals. Use this when the user wants to find, show, or browse products.',
    parameters: {
        query: 'string - search keyword (optional if category given)',
        category: 'string? - product category to filter by',
        max_price: 'number? - maximum price filter',
        brand: 'string? - filter by brand name',
        has_discount: 'boolean? - only show products with active discounts/deals'
    },
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ params, user, supabase }) => {
        let query = params.query || params.keyword || params.search || params.name || "";
        let categoryParam = params.category || params.type;

        // Define normalizePlural FIRST before using it
        const normalizePlural = w => {
            const low = w.toLowerCase().trim();
            if (low === 'phones') return 'phone';
            if (low === 'smartphones') return 'smartphone';
            if (low === 'mobiles') return 'mobile';
            if (low === 'laptops') return 'laptop';
            if (low === 'tvs') return 'tv';
            if (low === 'earbuds') return 'earbud';
            if (low === 'watches') return 'watch';
            if (low === 'tablets') return 'tablet';
            return low;
        };

        if (categoryParam) {
            categoryParam = normalizePlural(categoryParam.toLowerCase());
            if (categoryParam === 'mobile' || categoryParam === 'phone' || categoryParam === 'phones' || categoryParam === 'smartphones' || categoryParam === 'smartphone' || categoryParam === 'smart phone') {
                categoryParam = 'SMART PHONE';
            }
        }
        let max_price = params.max_price || params.budget;

        // --- 1. PREPROCESSING & FILTER EXTRACTION ---
        let processedSearch = query.toLowerCase().trim();

        // Normalize "smart phone" to "smartphone", and mobile/phone synonyms
        processedSearch = processedSearch.replace(/smart[\s-]*phone|mobile|phone/g, "smartphone");
        processedSearch = processedSearch.replace(/(?:ear|air)[\s-]*pods?/g, "earbud");
        
        // Normalize "tv" to "t v" since DB uses spaced version
        if (processedSearch === 'tv' || processedSearch === 'tvs') processedSearch = 't v';
        if (categoryParam && (categoryParam.toLowerCase() === 'tv' || categoryParam.toLowerCase() === 'tvs')) {
            categoryParam = 'T V';
        }

        const underMatch = processedSearch.match(/(?:under|below|less than|within)\s*(\d+)/i);
        if (underMatch && !max_price) {
            max_price = parseFloat(underMatch[1]);
            processedSearch = processedSearch.replace(underMatch[0], "").trim();
        }
        
        const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of', 'i', 'want', 'show', 'me', 'find', 'looking', 'please', 'help', 'search', 'get'];
        const tokens = processedSearch.split(/\s+/).filter(t => t.length > 1 && !stopWords.includes(t)).map(normalizePlural);
        const finalKeywordSearch = tokens.join(" ");

        console.log(`[Tool Debug: Search] Query: "${query}", Tokens: [${tokens.join(', ')}], MaxPrice: ${max_price}`);

        if (!query && !categoryParam && !max_price) {
            return {
                text: "What kind of product are you looking for? You can search by name, category, or brand.",
                products: []
            };
        }

        if (query && tokens.length === 0) {
            return {
                text: "Please provide a more specific search term.",
                products: []
            };
        }

        let dbQuery = supabase
            .from('products')
            .select(`
                id, name, price, description, image_url, brand, stock_quantity, metadata,
                categories(id, name)
            `)
            .eq('metadata->>status', 'approved')
            .neq('metadata->>isPaused', 'true');

        if (max_price) {
            dbQuery = dbQuery.lte('price', max_price);
        }

        if (params.brand) {
            dbQuery = dbQuery.ilike('brand', `%${params.brand}%`);
        }


        if (params.has_discount === true) {
            dbQuery = dbQuery.gt('metadata->discount', 0);
        }

        if (categoryParam && categoryParam.toLowerCase() !== 'all') {
            const { data: catData } = await supabase.from('categories').select('id').ilike('name', `%${categoryParam}%`).maybeSingle();
            if (catData) {
                dbQuery = dbQuery.eq('category_id', catData.id);
            } else {
                return {
                    text: `I couldn't find any products in the "${categoryParam}" category. Try a different keyword or browse our main categories.`,
                    products: [],
                    query: query || categoryParam || null
                };
            }
        }

        const { data, error } = await dbQuery;
        if (error) throw error;

        let filtered = data || [];

        // --- 2. ADVANCED RANKING & STRICT FILTERING ---
        if (finalKeywordSearch) {
            const searchTokens = tokens;
            
            // Intent Detection
            const hasPhone = searchTokens.includes('phone') || searchTokens.includes('smartphone');
            const hasTV = searchTokens.includes('tv') || searchTokens.includes('television');
            const hasLaptop = searchTokens.includes('laptop') || searchTokens.includes('computer');
            const hasWatch = searchTokens.includes('watch');

            filtered = filtered.map(p => {
                const title = (p.name || "").toLowerCase();
                const desc = (p.description || "").toLowerCase();
                const brand = (p.brand || p.metadata?.brand || "").toLowerCase();
                const catName = (p.categories?.name || "").toLowerCase();
                const tags = Array.isArray(p.tags) ? p.tags.map(t => t.toLowerCase()) : [];
                
                const titleWords = title.split(/\s+/);
                const catWords = catName.split(/\s+/);

                // Normalize fields for scoring
                const normTitle = title.replace(/smart[\s-]*phone/g, "smartphone");
                const normCat = catName.replace(/smart[\s-]*phone/g, "smartphone");
                const normBrand = brand.replace(/smart[\s-]*phone/g, "smartphone");

                let score = 0;
                let matchCount = 0;

                searchTokens.forEach(token => {
                    let tokenMatched = false;
                    
                    const titleWordsList = normTitle.split(/\s+/);
                    const catWordsList = normCat.split(/\s+/);

                    // Priority 1: Whole word match in Title/Category/Brand/Tags
                    if (titleWordsList.includes(token)) { score += 500; tokenMatched = true; }
                    if (catWordsList.includes(token)) { score += 600; tokenMatched = true; }
                    if (normBrand === token) { score += 400; tokenMatched = true; }
                    if (tags.includes(token)) { score += 700; tokenMatched = true; }

                    // Priority 2: Substring match
                    if (!tokenMatched) {
                        if (normTitle.includes(token)) score += 50;
                        if (normBrand.includes(token)) score += 60;
                        if (normCat.includes(token)) score += 80;
                        if (desc.includes(token)) score += 5;
                        if (tags.some(t => t.includes(token))) score += 70;
                    }

                    if (normTitle.includes(token) || normCat.includes(token) || normBrand.includes(token) || tags.some(t => t.includes(token))) {
                        matchCount++;
                    }
                });

                // FULL Phrase match bonus
                if (title.includes(finalKeywordSearch)) score += 1000;
                if (catName.includes(finalKeywordSearch)) score += 1200;

                // --- STRICT "AND" LOGIC ---
                // "smartphone" token must match normalized fields OR split tags ("smart"+"phone")
                const mustMatchAll = searchTokens.every(token => {
                    // Direct match on normalized fields
                    if (normTitle.includes(token)) return true;
                    if (normCat.includes(token)) return true;
                    if (normBrand.includes(token)) return true;
                    if (tags.some(t => t.includes(token))) return true;

                    // Special case: "smartphone" can match if BOTH "smart" and "phone" are in tags
                    if (token === 'smartphone') {
                        const hasSmart = tags.some(t => t === 'smart') || normCat.includes('smart') || normTitle.includes('smart');
                        const hasPhone = tags.some(t => t === 'phone') || normCat.includes('phone') || normTitle.includes('phone');
                        if (hasSmart && hasPhone) return true;
                    }

                    return false;
                });

                // --- CATEGORY PENALTY (Future Prevention) ---
                if (hasPhone && (catName.includes('tv') || catName.includes('earbud'))) score -= 5000;
                if (hasPhone && catName.includes('laptop')) score -= 5000;
                if (hasPhone && catName.includes('watch')) score -= 5000;
                
                if (hasWatch && catName.includes('phone')) score -= 5000;
                if (hasWatch && catName.includes('tv')) score -= 5000;

                if (hasTV && (catName.includes('phone') || catName.includes('watch'))) score -= 5000;

                // Final relevance check
                const isRelevant = mustMatchAll && score > 0;
                
                return { ...p, _score: score, _isRelevant: isRelevant };
            })
            .filter(p => p._isRelevant)
            .sort((a, b) => b._score - a._score);
            
            console.log(`[Tool Debug: Search] Found ${filtered.length} products after strict filtering`);
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
