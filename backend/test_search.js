require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const searchTool = require('./tools/search_products');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSearch() {
    console.log("--- TESTING SEARCH FOR 'smart phone' ---");
    const result = await searchTool.execute({
        params: { query: "smart phone" },
        supabase
    });

    console.log("Text response:", result.text);
    console.log("Top 5 results:");
    result.products.slice(0, 5).forEach((p, i) => {
        console.log(`${i+1}. ${p.name} [Category: ${p.category}]`);
    });
}

testSearch();
