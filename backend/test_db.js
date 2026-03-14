import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase keys.');
    process.exit();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('order_items').select('*').limit(3);
    if (error) {
        console.log('Error fetching order_items:', error);
    } else {
        console.log('Order Items:', JSON.stringify(data, null, 2));
    }
}

check();
