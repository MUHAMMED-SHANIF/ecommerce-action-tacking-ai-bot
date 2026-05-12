const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS for migration
);

async function fixTags() {
    console.log("Starting tag fix migration...");
    
    const { data: products, error } = await supabase
        .from('products')
        .select('id, tags');

    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    console.log(`Found ${products.length} products to process.`);

    for (const product of products) {
        const oldTags = product.tags || [];
        if (oldTags.length === 0) continue;

        // Split all existing tags by space and comma, deduplicate
        const tagSet = new Set();
        oldTags.forEach(t => {
            const parts = t.split(/[\s,]+/)
                .map(part => part.trim().toLowerCase())
                .filter(part => part !== '');
            parts.forEach(p => tagSet.add(p));
        });

        const newTags = Array.from(tagSet);

        // Only update if changed
        if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
            console.log(`Updating product ${product.id}: [${oldTags}] -> [${newTags}]`);
            const { error: updateError } = await supabase
                .from('products')
                .update({ tags: newTags })
                .eq('id', product.id);

            if (updateError) {
                console.error(`Error updating product ${product.id}:`, updateError);
            }
        }
    }

    console.log("Migration complete!");
}

fixTags();
