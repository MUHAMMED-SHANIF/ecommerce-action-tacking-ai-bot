const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:\\EMART_PROJUCT\\backend\\.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function apply() {
    // We cannot run raw DDL via supabase-js anon key usually, but since this is a local project we can attempt
    // If it fails, I'll print the SQL for the user to paste.
    try {
        const { error: dropErr } = await supabase.rpc('drop_conversations');
        // Let's just create a raw table query
        const { data, error } = await supabase.from('conversations').select('*').limit(1);
        if (error && error.code === '42P01') {
            console.log("Table doesn't exist. Creating via REST isn't supported, need SQL editor.");
        } else {
            console.log("Table exists, but we need to change user_id to TEXT.");
        }
    } catch (e) {
        console.error(e);
    }
}
apply();
