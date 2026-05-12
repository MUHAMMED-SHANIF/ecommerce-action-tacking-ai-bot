require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const searchTool = require('./tools/search_products');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSearchCategory() {
    console.log("Testing search: category='mobile'");
    try {
        const result = await searchTool.execute({
            params: { category: 'mobile' },
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

testSearchCategory();
