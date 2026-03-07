const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    console.log("Checking banners...");
    const b = await supabase.from('banners').select('*').limit(1);
    console.log(b);

    console.log("Checking home_sections...");
    const h = await supabase.from('home_sections').select('*').limit(1);
    console.log(h);
}

check();
