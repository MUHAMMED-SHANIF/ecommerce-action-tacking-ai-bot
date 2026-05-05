require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const recommendTool = require('./tools/recommend_products');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testRecommend() {
    console.log("--- TESTING RECOMMEND FOR 'smart phone' ---");
    const result = await recommendTool.execute({
        params: { category: "smart phone" },
        supabase
    });

    console.log("Text response:", result.text);
    console.log("Top 5 results:");
    result.products.slice(0, 5).forEach((p, i) => {
        console.log(`${i+1}. ${p.name} [Category: ${p.category}]`);
    });
}

testRecommend();
