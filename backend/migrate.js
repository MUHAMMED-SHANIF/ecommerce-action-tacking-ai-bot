require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
// Note: We should ideally use the service_role key to bypass RLS during migration
const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_DIR = path.join(__dirname, 'data');

async function readJSON(file) {
    try {
        const data = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

async function migrate() {
    console.log("Starting Migration from JSON to Supabase...");

    // 1. Categories
    console.log("Migrating Categories...");
    const categories = await readJSON('categories.json');
    // Keep a map of old string ID -> new UUID
    const categoryIdMap = {};

    for (const cat of categories) {
        // We do an upsert and ask Postgres to return the new row so we know the UUID
        const { data, error } = await supabase.from('categories').upsert({
            name: cat.name,
            slug: cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            created_at: new Date().toISOString()
        }, { onConflict: 'slug' }).select().single();

        if (error) {
            console.error("Category Error:", error.message);
        } else if (data) {
            categoryIdMap[cat.name] = data.id; // Store mapping by name
        }
    }

    // 2. Products
    console.log("Migrating Products...");
    const products = await readJSON('products.json');
    for (const p of products) {
        // Find newly created category ID from the map instead of doing a DB lookup per product
        const newCatId = categoryIdMap[p.category] || null;

        const { error } = await supabase.from('products').insert({
            name: p.title || p.name,
            description: p.description || '',
            price: isNaN(Number(p.price)) ? 0 : Number(p.price),
            stock_quantity: isNaN(Number(p.countInStock)) ? (isNaN(Number(p.stock)) ? 0 : Number(p.stock)) : Number(p.countInStock),
            category_id: newCatId,
            image_url: p.image || (p.images && p.images[0]) || null,
            metadata: {
                brand: p.brand || '',
                rating: p.rating || 0,
                numReviews: p.numReviews || 0,
                supplier: p.supplier || '',
                tags: p.tags || [],
                status: p.status || (p.isApproved ? 'approved' : 'pending')
            },
            created_at: p.createdAt || new Date().toISOString()
        });

        if (error) console.error("Product Error Details:", JSON.stringify(error, null, 2), "for title:", p.title || p.name);
    }

    // 3. Banners
    console.log("Migrating Banners...");
    const banners = await readJSON('banners.json');
    for (const b of banners) {
        const { error } = await supabase.from('banners').insert({
            title: b.title || "Untitled",
            image: b.image,
            link: b.link,
            action_type: b.actionType,
            target_id: null, // Since old targetIds are timestamp strings, we cannot use them as UUID relations. Removing them to prevent errors.
            active: b.active !== undefined ? b.active : true,
            duration: Number(b.duration) || 5,
            created_at: b.createdAt || new Date().toISOString()
        });
        if (error) console.error("Banner Error:", error.message);
    }

    // 4. Home Layout
    console.log("Migrating Home Layout...");
    const homeLayout = await readJSON('home_layout.json');

    // Navbar Items
    if (homeLayout.navbar && Array.isArray(homeLayout.navbar)) {
        for (const nav of homeLayout.navbar) {
            const { error } = await supabase.from('home_layout').insert({
                type: 'navbar',
                position: Number(nav.position) || 0,
                title: nav.category || nav.title,
                category: nav.category,
                created_at: new Date().toISOString()
            });
            if (error) console.error("Home Layout Navbar Error:", error.message);
        }
    }

    // Section Items
    if (homeLayout.sections && Array.isArray(homeLayout.sections)) {
        for (const sec of homeLayout.sections) {
            const { error } = await supabase.from('home_layout').insert({
                type: 'section',
                position: Number(sec.position) || 0,
                title: sec.title,
                category: sec.category,
                created_at: new Date().toISOString()
            });
            if (error) console.error("Home Layout Section Error:", error.message);
        }
    }

    console.log("Migration Complete! Users were skipped per Option A.");
}

migrate();
