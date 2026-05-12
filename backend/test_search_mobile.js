require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const searchTool = require('./tools/search_products');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSearchMobile() {
    console.log("Testing search: 'mobile'");
    try {
        const result = await searchTool.execute({
            params: { query: 'mobile' },
            user: { id: 'test_user' },
            supabase: supabase
        });
        console.log("Search Result Text:", result.text);
        if (result.products) {
            console.log("Found products:", result.products.length);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

testSearchMobile();
