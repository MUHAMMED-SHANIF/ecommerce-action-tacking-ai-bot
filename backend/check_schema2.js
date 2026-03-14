require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking products table...");
    const { data: pData, error: pError } = await supabase.from('products').select('*').limit(1);
    if (pError) console.error("Error products:", pError);
    else if (pData && pData.length > 0) console.log("Product Columns:", Object.keys(pData[0]));
    else console.log("Products table exists but empty. Can't derive schema from empty result easily. Let's do a raw SQL check or insert dummy.");

    if (!pData || pData.length === 0) {
        const { error: insertErr } = await supabase.from('products').insert({
            name: 'Dummy', price: 0, description: 'Test', stock_quantity: 0
        }).select();

        const { data: data2 } = await supabase.from('products').select('*').limit(1);
        if (data2 && data2.length > 0) {
            console.log("Product Columns (after insert):", Object.keys(data2[0]));
        }
        await supabase.from('products').delete().eq('name', 'Dummy');
    }
}
check();
