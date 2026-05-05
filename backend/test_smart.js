require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const searchTool = require('./tools/search_products');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSearchSmart() {
    console.log("--- TESTING SEARCH FOR 'smart' ---");
    const result = await searchTool.execute({
        params: { query: "smart" },
        supabase
    });

    console.log("Top 10 results:");
    result.products.slice(0, 10).forEach((p, i) => {
        console.log(`${i+1}. ${p.name} [Category: ${p.category}]`);
    });
}

testSearchSmart();
