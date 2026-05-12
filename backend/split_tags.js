require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function splitTags() {
    console.log("Fetching all products...");
    const { data: products, error } = await supabase.from('products').select('id, tags, metadata');
    if (error) {
        console.error("Error fetching products:", error);
        return;
    }

    console.log(`Found ${products.length} products. Processing tags...`);
    
    for (const product of products) {
        let updated = false;
        
        // 1. Process main tags array
        let newTags = [];
        if (Array.isArray(product.tags)) {
            for (const tag of product.tags) {
                if (typeof tag === 'string') {
                    // Split by space or comma
                    const split = tag.split(/[\s,]+/).map(t => t.trim().toLowerCase()).filter(t => t !== '');
                    newTags.push(...split);
                }
            }
            newTags = [...new Set(newTags)]; // Remove duplicates
            
            // Check if tags changed
            if (JSON.stringify(product.tags) !== JSON.stringify(newTags)) {
                updated = true;
            }
        }

        // 2. Process metadata tags (if they exist)
        let newMetadata = { ...product.metadata };
        if (newMetadata && Array.isArray(newMetadata.tags)) {
            let newMetaTags = [];
            for (const tag of newMetadata.tags) {
                if (typeof tag === 'string') {
                    const split = tag.split(/[\s,]+/).map(t => t.trim().toLowerCase()).filter(t => t !== '');
                    newMetaTags.push(...split);
                }
            }
            newMetaTags = [...new Set(newMetaTags)];
            
            if (JSON.stringify(newMetadata.tags) !== JSON.stringify(newMetaTags)) {
                newMetadata.tags = newMetaTags;
                updated = true;
            }
        }

        if (updated) {
            console.log(`Updating product ${product.id}...`);
            const { error: updateError } = await supabase
                .from('products')
                .update({ tags: newTags, metadata: newMetadata })
                .eq('id', product.id);
                
            if (updateError) {
                console.error(`Error updating product ${product.id}:`, updateError);
            }
        }
    }
    console.log("Done updating all product tags!");
}

splitTags();
