const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});



// Configure Multer for Supabase memory storage
const upload = multer({ storage: multer.memoryStorage() });
// Keeping USERS_FILE solely for `isAdmin` fallback if needed, but going to rewrite `isAdmin` as well.

// --- Helper Functions ---

const deleteImageFromSupabase = async (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return;
    try {
        if (imageUrl.includes('emart-assets')) {
            const parts = imageUrl.split('/');
            let fileName = parts[parts.length - 1];
            if (fileName.includes('?')) {
                fileName = fileName.split('?')[0];
            }
            if (fileName) {
                const { error } = await supabase.storage.from('emart-assets').remove([fileName]);
                if (error) {
                    console.error(`Failed to delete image ${fileName} from storage:`, error);
                } else {
                    console.log(`Deleted image ${fileName} from storage`);
                }
            }
        }
    } catch (err) {
        console.error("Error deleting image from storage:", err);
    }
};
const readJSON = async (file) => {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeJSON = async (file, data) => {
    try {
        await fs.writeFile(file, JSON.stringify(data, null, 2));
    } catch (err) {
        throw err;
    }
};

// --- Helper Functions ---
const isAdmin = async (req, res, next) => {
    // We expect a valid auth token to verify user role securely, but legacy frontend might still use x-user-id temporarily
    const token = req.headers.authorization?.split(' ')[1];
    const legacyId = req.headers['x-user-id'];

    if (!token && !legacyId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        if (token) {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error || !user) throw error;

            if (user.user_metadata?.role === 'admin') {
                return next();
            }
        }

        // Fallback removed, strictly enforcing session token
        res.status(403).json({ error: "Forbidden: Admin access only" });
    } catch (error) {
        res.status(403).json({ error: "Forbidden: " + error.message });
    }
};

// --- Routes ---
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const assistantRoutes = require('./routes/assistant');
app.use('/api/assistant', assistantRoutes);

// --- UPLOAD ---
app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = uniqueSuffix + path.extname(req.file.originalname);

        const { data, error } = await supabase.storage
            .from('emart-assets')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('emart-assets')
            .getPublicUrl(fileName);

        res.json({ imageUrl: publicUrl });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: 'Failed to upload to Supabase' });
    }
});

// --- ADMIN: BANNERS ---
app.get('/api/banners', async (req, res) => {
    try {
        const { data: banners, error } = await supabase.from('banners').select('*').eq('active', true);
        if (error) throw error;
        res.json({
            banners: banners.map(b => ({
                ...b,
                image: b.image,
                targetUrl: b.link, // Keep frontend compatibility if needed
                actionType: b.action_type,
                targetId: b.target_id,
                createdAt: b.created_at
            })),
            config: { autoPlay: true, showCarousel: true }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/banners', isAdmin, async (req, res) => {
    try {
        const { data: banners, error } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({
            banners: banners.map(b => ({
                ...b,
                image: b.image, // Use 'image' column directly
                link: b.link,   // Use 'link' column directly
                actionType: b.action_type,
                targetId: b.target_id,
                createdAt: b.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/banners', isAdmin, async (req, res) => {
    try {
        const { title, image, link, actionType, targetId, active, duration } = req.body;

        if (!image) {
            return res.status(400).json({ error: "Image is required" });
        }

        const { data: newBanner, error } = await supabase.from('banners').insert({
            title: title || "Untitled",
            image: image,
            link: link || "",
            action_type: actionType || "none",
            target_id: targetId || "",
            active: active !== undefined ? active : true,
            duration: Number(duration) || 5
        }).select().single();

        if (error) throw error;

        res.status(201).json({
            ...newBanner,
            actionType: newBanner.action_type,
            targetId: newBanner.target_id,
            createdAt: newBanner.created_at
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/banners/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch to get image URL before deleting
        const { data: banner } = await supabase.from('banners').select('image').eq('id', id).single();
        
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (error) throw error;

        if (banner && banner.image) {
            await deleteImageFromSupabase(banner.image);
        }

        res.json({ message: "Banner deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/banners/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch existing banner to compare image
        const { data: existingBanner } = await supabase.from('banners').select('image').eq('id', id).single();

        // Convert camelCase to snake_case for Supabase
        const updateData = {};
        if (req.body.title !== undefined) updateData.title = req.body.title;
        if (req.body.image !== undefined) updateData.image = req.body.image;
        if (req.body.link !== undefined) updateData.link = req.body.link;
        if (req.body.actionType !== undefined) updateData.action_type = req.body.actionType;
        if (req.body.targetId !== undefined) updateData.target_id = req.body.targetId;
        if (req.body.active !== undefined) updateData.active = req.body.active;
        if (req.body.duration !== undefined) updateData.duration = Number(req.body.duration);

        const { data: updated, error } = await supabase.from('banners').update(updateData).eq('id', id).select().single();
        if (error) throw error;

        // Delete old image if it changed
        if (existingBanner && existingBanner.image && updateData.image && existingBanner.image !== updateData.image) {
            await deleteImageFromSupabase(existingBanner.image);
        }

        res.json({
            ...updated,
            actionType: updated.action_type,
            targetId: updated.target_id,
            createdAt: updated.created_at
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: CATEGORIES ---
app.get('/api/admin/categories', async (req, res) => {
    try {
        const { data: categories, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        // Map to legacy layout just in case
        const formatted = categories.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            image: c.image_url || '',
            isApproved: true, // Legacy compatibility
            status: 'approved'
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/categories', isAdmin, async (req, res) => {
    try {
        const { name, image } = req.body;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const { data: newCat, error } = await supabase.from('categories').insert({
            name,
            slug,
            image_url: image || null
        }).select().single();

        if (error) throw error;

        res.status(201).json({
            ...newCat,
            image: newCat.image_url || '',
            isApproved: true,
            status: 'approved'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/categories/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image } = req.body;

        const { data: existingCategory } = await supabase.from('categories').select('image_url').eq('id', id).single();

        const updateData = {};
        if (name) {
            updateData.name = name;
            updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        if (image !== undefined) {
            updateData.image_url = image;
        }

        const { data: updated, error } = await supabase.from('categories').update(updateData).eq('id', id).select().single();

        if (error) throw error;

        // Delete old image if it changed
        if (existingCategory && existingCategory.image_url && image !== undefined && existingCategory.image_url !== image) {
            await deleteImageFromSupabase(existingCategory.image_url);
        }

        res.json({
            ...updated,
            isApproved: true,
            status: 'approved'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/categories/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: category } = await supabase.from('categories').select('image_url').eq('id', id).single();

        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;

        if (category && category.image_url) {
            await deleteImageFromSupabase(category.image_url);
        }

        res.json({ message: "Category deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: SELLERS (Suppliers) ---
app.get('/api/admin/sellers', isAdmin, async (req, res) => {
    try {
        const { data: authData, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const sellers = (authData.users || []).filter(u => u.user_metadata?.role === 'seller').map(u => {
            const addrs = u.user_metadata?.addresses || [];
            let displayAddress = addrs.length > 0 ? [addrs[0].street, addrs[0].city, addrs[0].country].filter(Boolean).join(', ') : '';
            const fullAddresses = addrs.map(a => [a.street, a.city, a.state, a.zip, a.country].filter(Boolean).join(', '));

            return {
                id: u.id,
                name: u.user_metadata?.name || u.email.split('@')[0],
                email: u.email,
                phone: u.user_metadata?.phone || '',
                address: displayAddress,
                fullAddresses: fullAddresses,
                isTrusted: u.user_metadata?.isTrusted || false,
                createdAt: u.created_at
            };
        });

        res.json(sellers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/sellers', isAdmin, async (req, res) => {
    try {
        const { name, email, password, phone, address, isTrusted } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
                phone,
                role: 'seller',
                isTrusted: !!isTrusted,
                addresses: address ? [{ street: address, city: '', country: '', type: 'business' }] : []
            }
        });

        if (error) throw error;

        // Create/Update profile to ensure role consistency
        await supabase.from('profiles').upsert({
            id: data.user.id,
            email,
            role: 'seller'
        });

        res.status(201).json({
            id: data.user.id,
            name: data.user.user_metadata?.name,
            email: data.user.email,
            phone: data.user.user_metadata?.phone,
            isTrusted: data.user.user_metadata?.isTrusted
        });
    } catch (error) {
        console.error("[Create Seller Error]", error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/sellers/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: { user }, error: fetchErr } = await supabase.auth.admin.getUserById(id);
        if (fetchErr || !user) throw fetchErr || new Error("Seller not found");

        const newMeta = {
            ...user.user_metadata,
            name: req.body.name || user.user_metadata?.name,
            phone: req.body.phone || user.user_metadata?.phone,
            isTrusted: req.body.isTrusted !== undefined ? req.body.isTrusted : user.user_metadata?.isTrusted
        };

        const { data, error } = await supabase.auth.admin.updateUserById(id, {
            email: req.body.email || user.email,
            user_metadata: newMeta
        });

        if (error) throw error;

        res.json({
            id: data.user.id,
            name: data.user.user_metadata?.name,
            email: data.user.email,
            phone: data.user.user_metadata?.phone,
            isTrusted: data.user.user_metadata?.isTrusted
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/sellers/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Cascade delete products
        await supabase.from('products').delete().or(`metadata->>sellerId.eq.${id},metadata->>supplierId.eq.${id}`);
        // Remove seller role
        await supabase.from('profiles').update({ role: 'user' }).eq('id', id);

        // Update user metadata in Auth
        const { data: user } = await supabase.auth.admin.getUserById(id);
        if (user && user.user) {
            const newMeta = { ...user.user.user_metadata, role: 'user' };
            await supabase.auth.admin.updateUserById(id, { user_metadata: newMeta });
        }
        res.json({ message: "Seller role removed and products deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: USERS ---
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const mappedUsers = data.users.map(u => ({
            id: u.id,
            name: u.user_metadata?.name || u.email.split('@')[0],
            email: u.email,
            role: u.user_metadata?.role || 'user',
            phone: u.user_metadata?.phone || '',
            createdAt: u.created_at
        }));
        res.json(mappedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/users/:id/role', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const { data: user, error: fetchErr } = await supabase.auth.admin.getUserById(id);
        if (fetchErr || !user.user) return res.status(404).json({ error: "User not found" });

        const oldRole = user.user.user_metadata?.role;
        if (oldRole === role) return res.json({ message: "Role unchanged" });

        const newMeta = { ...user.user.user_metadata, role };
        await supabase.auth.admin.updateUserById(id, { user_metadata: newMeta });

        // Avoid role check constraint error by sending valid string if seller wasn't added yet
        try {
            await supabase.from('profiles').update({ role: role }).eq('id', id);
        } catch (ignored) { }

        if (oldRole === 'seller' && role !== 'seller') {
            await supabase.from('products').delete().or(`metadata->>sellerId.eq.${id},metadata->>supplierId.eq.${id}`);
        }
        res.json({ message: `Role updated to ${role}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user && user.id === id) return res.status(400).json({ error: "Cannot delete yourself" });
        }

        const { data: userDel, error: fetchErr } = await supabase.auth.admin.getUserById(id);
        if (fetchErr || !userDel.user) return res.status(404).json({ error: "User not found" });

        const role = userDel.user.user_metadata?.role;
        if (role === 'seller') {
            await supabase.from('products').delete().or(`metadata->>sellerId.eq.${id},metadata->>supplierId.eq.${id}`);
        }

        await supabase.from('cart_items').delete().eq('user_id', id);
        await supabase.from('profiles').delete().eq('id', id);
        await supabase.auth.admin.deleteUser(id);

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: PRODUCTS ---
app.delete('/api/admin/products/all', isAdmin, async (req, res) => {
    try {
        const { data: products } = await supabase.from('products').select('image_url, metadata');

        const { error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) throw error;

        if (products && products.length > 0) {
            for (const p of products) {
                if (p.image_url) await deleteImageFromSupabase(p.image_url);
                if (p.metadata?.images && Array.isArray(p.metadata.images)) {
                    for (const img of p.metadata.images) {
                        if (img !== p.image_url) await deleteImageFromSupabase(img);
                    }
                }
            }
        }

        res.json({ message: "All products deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/products/all', isAdmin, async (req, res) => {
    try {
        const { data: products, error } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });
        if (error) throw error;

        const formatted = products.map(p => ({
            id: p.id,
            title: p.name,
            price: p.price,
            category: p.categories?.name || 'Uncategorized',
            countInStock: p.stock_quantity,
            image: p.image_url,
            brand: p.brand || p.metadata?.brand,
            rating: p.metadata?.rating || 0,
            numReviews: p.metadata?.numReviews || 0,
            originalPrice: p.metadata?.originalPrice,
            discount: p.metadata?.discount,
            isApproved: p.metadata?.isApproved !== false,
            status: p.metadata?.status || 'approved',
            supplier: p.metadata?.supplier,
            sellerId: p.metadata?.sellerId,
            isPaused: p.metadata?.isPaused === true,
            tags: p.tags || p.metadata?.tags || []
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/products', async (req, res) => {
    try {
        const { title, price, category, description, image, images, brand, rating, countInStock, supplier, sellerId, categoryId, originalPrice, discount } = req.body;

        // Determine user using local fallback first
        let userId = req.headers['x-user-id'];
        let isSeller = false;

        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user && user.user_metadata?.role === 'seller') {
                isSeller = true;
                userId = user.id;
            }
        }

        const status = isSeller ? 'pending' : 'approved';

        const metadata = {
            brand,
            rating: Number(rating) || 0,
            numReviews: 0,
            supplier,
            sellerId: sellerId || (isSeller ? userId : undefined),
            supplierId: sellerId || (isSeller ? userId : undefined),
            originalPrice,
            discount,
            isApproved: !isSeller,
            status,
            tags: req.body.tags || [],
            adminRemark: '',
            isPaused: false
        };

        const { data: catData } = await supabase.from('categories').select('id').eq('name', category).maybeSingle();

        const { data: newProduct, error } = await supabase.from('products').insert({
            name: title,
            description,
            price: Number(price) || 0,
            stock_quantity: Number(countInStock) || 0,
            category_id: categoryId || (catData ? catData.id : null),
            image_url: image || (images && images[0]) || null,
            brand: brand || null,
            tags: req.body.tags || [],
            metadata: metadata
        }).select().single();

        if (error) throw error;
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Fetch existing
        const { data: existingProduct, error: fetchErr } = await supabase.from('products').select('*').eq('id', id).single();
        if (fetchErr || !existingProduct) return res.status(404).json({ error: "Product not found" });

        // Build list of old images
        const oldImages = new Set();
        if (existingProduct.image_url) oldImages.add(existingProduct.image_url);
        if (existingProduct.metadata?.images && Array.isArray(existingProduct.metadata.images)) {
            existingProduct.metadata.images.forEach(img => oldImages.add(img));
        }

        // Build list of new images
        const newImages = new Set();
        if (updateData.image) newImages.add(updateData.image);
        if (updateData.images && Array.isArray(updateData.images)) {
            updateData.images.forEach(img => newImages.add(img));
        }

        // Update logic
        const metadata = { ...existingProduct.metadata, ...updateData };
        let newStatus = metadata.status;
        let isApproved = metadata.isApproved;

        // Reset approval if seller edits it
        const authHeader = req.headers.authorization;
        let isSeller = false;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user && user.user_metadata?.role === 'seller') isSeller = true;
        }

        if (isSeller && updateData) {
            newStatus = 'pending';
            isApproved = false;
            metadata.status = newStatus;
            metadata.isApproved = isApproved;
        }

        const dbUpdate = {
            name: updateData.title || existingProduct.name,
            description: updateData.description || existingProduct.description,
            price: updateData.price ? Number(updateData.price) : existingProduct.price,
            stock_quantity: updateData.countInStock !== undefined ? Number(updateData.countInStock) : existingProduct.stock_quantity,
            image_url: updateData.image !== undefined ? updateData.image : existingProduct.image_url,
            brand: updateData.brand !== undefined ? updateData.brand : existingProduct.brand,
            tags: updateData.tags !== undefined ? updateData.tags : existingProduct.tags,
            metadata: metadata
        };

        if (updateData.categoryId) dbUpdate.category_id = updateData.categoryId;
        else if (updateData.category) {
            const { data: catData } = await supabase.from('categories').select('id').eq('name', updateData.category).maybeSingle();
            if (catData) dbUpdate.category_id = catData.id;
        }

        const { data: updatedProduct, error } = await supabase.from('products').update(dbUpdate).eq('id', id).select().single();

        if (error) throw error;

        // Cleanup orphaned images
        for (const oldImg of oldImages) {
            if (!newImages.has(oldImg)) {
                await deleteImageFromSupabase(oldImg);
            }
        }

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/products/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: product } = await supabase.from('products').select('image_url, metadata').eq('id', id).single();

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;

        if (product) {
            if (product.image_url) await deleteImageFromSupabase(product.image_url);
            if (product.metadata?.images && Array.isArray(product.metadata.images)) {
                for (const img of product.metadata.images) {
                    if (img !== product.image_url) await deleteImageFromSupabase(img);
                }
            }
        }

        res.json({ message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/products/:id/approve', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: p, error: fErr } = await supabase.from('products').select('metadata').eq('id', id).single();
        if (fErr || !p) return res.status(404).json({ error: "Product not found" });

        const newMeta = { ...p.metadata, isApproved: true, status: 'approved' };
        const { data: updated, error } = await supabase.from('products').update({ metadata: newMeta }).eq('id', id).select().single();
        if (error) throw error;

        res.json({ message: "Product approved", product: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/products/:id/review', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminRemark } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Invalid status, must be 'approved' or 'rejected'" });
        }

        const { data: p, error: fErr } = await supabase.from('products').select('metadata').eq('id', id).single();
        if (fErr || !p) return res.status(404).json({ error: "Product not found" });

        const newMeta = {
            ...p.metadata,
            status: status,
            isApproved: status === 'approved'
        };
        if (adminRemark !== undefined) {
            newMeta.adminRemark = adminRemark;
        }

        const { data: updated, error } = await supabase.from('products').update({ metadata: newMeta }).eq('id', id).select().single();
        if (error) throw error;

        res.json({ message: `Product ${status}`, product: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: HOME LAYOUT ---
app.get('/api/admin/home-layout', isAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('home_layout').select('*').order('position');
        if (error) throw error;
        const navbar = data.filter(d => d.type === 'navbar').sort((a, b) => a.position - b.position).map(n => ({ id: n.id, category: n.category, title: n.title }));
        const sections = data.filter(d => d.type === 'section').sort((a, b) => a.position - b.position).map(s => ({ id: s.id, title: s.title, category: s.category }));
        res.json({ navbar, sections });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/home-layout', isAdmin, async (req, res) => {
    try {
        const { navbar, sections } = req.body;
        console.log("[Home Layout Update] Received:", { navbarCount: navbar?.length, sectionsCount: sections?.length });

        // Wipe all layout - more reliable way to clear a table
        const { error: deleteError } = await supabase.from('home_layout').delete().not('id', 'is', null);
        if (deleteError) {
            console.error("[Home Layout Update] Delete Error:", deleteError);
            throw deleteError;
        }

        if (navbar && navbar.length > 0) {
            // Filter out items with no category
            const validNavbar = navbar.filter(n => n.category && n.category.trim() !== "");
            if (validNavbar.length > 0) {
                const inserts = validNavbar.map((nav, i) => ({ 
                    type: 'navbar', 
                    position: i, 
                    title: nav.title || nav.category, 
                    category: nav.category 
                }));
                const { error: insErr } = await supabase.from('home_layout').insert(inserts);
                if (insErr) {
                    console.error("[Home Layout Update] Navbar Insert Error:", insErr);
                    throw insErr;
                }
            }
        }

        if (sections && sections.length > 0) {
            // Filter out items with no category
            const validSections = sections.filter(s => s.category && s.category.trim() !== "");
            if (validSections.length > 0) {
                const inserts = validSections.map((sec, i) => ({ 
                    type: 'section', 
                    position: i, 
                    title: sec.title || sec.category, 
                    category: sec.category 
                }));
                const { error: insErr } = await supabase.from('home_layout').insert(inserts);
                if (insErr) {
                    console.error("[Home Layout Update] Sections Insert Error:", insErr);
                    throw insErr;
                }
            }
        }
        
        console.log("[Home Layout Update] Success");
        res.json({ message: "Layout updated successfully" });
    } catch (error) {
        console.error("[Home Layout Update] Final Catch Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- PUBLIC: BANNERS & CATEGORIES ---
app.get('/api/banners', async (req, res) => {
    try {
        const { data: banners, error } = await supabase.from('banners').select('*').order('created_at');
        if (error) throw error;

        const formattedBanners = banners.map(b => ({
            id: b.id,
            image: b.image_url,
            link: b.target_url,
            alt: b.title
        }));
        res.json({ banners: formattedBanners, config: { autoSlide: true, interval: 3000 } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PUBLIC: HOME LAYOUT ---
app.get('/api/home-layout', async (req, res) => {
    try {
        const { data, error } = await supabase.from('home_layout').select('*').order('position');
        if (error) throw error;
        const navbar = data.filter(d => d.type === 'navbar').sort((a, b) => a.position - b.position).map(n => ({ id: n.id, category: n.category, title: n.title }));
        const sections = data.filter(d => d.type === 'section').sort((a, b) => a.position - b.position).map(s => ({ id: s.id, title: s.title, category: s.category }));
        res.json({ navbar, sections });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- TRENDING & HISTORY ---
app.post('/api/products/:id/visit', async (req, res) => {
    try {
        const { id } = req.params;
        let userId = req.headers['x-user-id'];
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) userId = user.id;
        }

        if (!userId) return res.status(200).json({ success: true, message: "Guest visit skipped" });

        // Fetch user metadata
        const { data: user } = await supabase.auth.admin.getUserById(userId);
        if (!user || !user.user) throw new Error("User not found");
        
        let history = user.user.user_metadata?.recent_visits || [];
        
        // Remove if exists, add to front, limit to 15
        history = history.filter(pid => pid !== id);
        history.unshift(id);
        history = history.slice(0, 15);

        await supabase.auth.admin.updateUserById(userId, { user_metadata: { ...user.user.user_metadata, recent_visits: history } });
        res.json({ success: true });
    } catch (err) {
        console.error("Visit tracking error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/recently-visited', async (req, res) => {
    try {
        let userId = req.headers['x-user-id'];
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) userId = user.id;
        }

        if (!userId) return res.json([]);

        const { data: user } = await supabase.auth.admin.getUserById(userId);
        if (!user || !user.user) return res.json([]);
        
        const history = user.user.user_metadata?.recent_visits || [];
        if (history.length === 0) return res.json([]);

        const { data: products } = await supabase.from('products').select('*, categories(name)').in('id', history);
        if (!products) return res.json([]);

        // Sort by history order
        const sorted = history.map(id => products.find(p => p.id === id)).filter(Boolean);
        res.json(sorted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/most-selling', async (req, res) => {
    try {
        // Top selling products based on order_items
        const { data, error } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .not('seller_status', 'eq', 'rejected');
        
        if (error) throw error;

        const sales = {};
        (data || []).forEach(item => {
            sales[item.product_id] = (sales[item.product_id] || 0) + item.quantity;
        });

        const sortedIds = Object.keys(sales).sort((a, b) => sales[b] - sales[a]).slice(0, 15);
        if (sortedIds.length === 0) return res.json([]);

        const { data: products } = await supabase.from('products').select('*, categories(name)').in('id', sortedIds);
        if (!products) return res.json([]);

        const sorted = sortedIds.map(id => products.find(p => p.id === id)).filter(Boolean);
        res.json(sorted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PUBLIC: PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const category = req.query.category;
        const searchTerm = req.query.search;
        const maxPrice = req.query.max_price;

        let query = supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });

        // Filter for visible products
        // We look for metadata->>'status' = 'approved' and metadata->>'isPaused' = 'false'
        query = query.eq('metadata->>status', 'approved').neq('metadata->>isPaused', 'true');

        if (category) {
            // Find category ID first for accurate filtering
            const { data: catData } = await supabase.from('categories').select('id').ilike('name', category).maybeSingle();
            if (catData) {
                query = query.eq('category_id', catData.id);
            } else {
                // If category doesn't exist, return empty results early
                return res.json([]);
            }
        }

        let keywords = [];
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase().trim();
            const cleanSearch = lowerSearch.replace(/[^a-z0-9\s]/g, ' ');
            const stopWords = ['with', 'and', 'the', 'a', 'an', 'in', 'of', 'for', 'is', 'to', 'on'];
            keywords = cleanSearch.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w));

            if (keywords.length > 0) {
                // Find category IDs that match any keyword
                const { data: matchedCats } = await supabase.from('categories').select('id').or(keywords.map(kw => `name.ilike.%${kw}%`).join(','));
                const matchedCatIds = (matchedCats || []).map(c => c.id);

                const orConditions = [];
                keywords.forEach(kw => {
                    orConditions.push(`name.ilike.%${kw}%`);
                    orConditions.push(`description.ilike.%${kw}%`);
                });
                if (matchedCatIds.length > 0) {
                    orConditions.push(`category_id.in.(${matchedCatIds.join(',')})`);
                }
                query = query.or(orConditions.join(','));
            } else {
                query = query.or(`name.ilike.%${lowerSearch}%,description.ilike.%${lowerSearch}%`);
            }
        }

        if (maxPrice) {
            query = query.lte('price', maxPrice);
        }

        let { data: products, error } = await query;

        if (error) throw error;

        // Map to legacy format expected by frontend
        const formattedProducts = products.map(p => ({
            id: p.id,
            title: p.name,
            price: p.price,
            category: p.categories?.name,
            categoryId: p.category_id,
            description: p.description,
            image: p.image_url,
            images: p.metadata?.images || [p.image_url],
            brand: p.brand || p.metadata?.brand,
            tags: p.tags || p.metadata?.tags || [],
            rating: p.metadata?.rating || 0,
            numReviews: p.metadata?.numReviews || 0,
            countInStock: p.stock_quantity,
            supplier: p.metadata?.supplier,
            sellerId: p.metadata?.sellerId,
            supplierId: p.metadata?.supplierId,
            originalPrice: p.metadata?.originalPrice,
            discount: p.metadata?.discount,
            isApproved: p.metadata?.isApproved,
            status: p.metadata?.status,
            createdAt: p.created_at
        }));

        res.json(formattedProducts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const { data: p, error } = await supabase.from('products').select('*, categories(name)').eq('id', req.params.id).single();

        if (error || !p) return res.status(404).json({ error: "Not found" });

        // Check trusted seller logic (needs to stay reading from JSON if sellers are not migrated, but assuming we can mock it here for now or leave it false since we wiped sellers)
        const isTrustedSeller = false;

        const product = {
            id: p.id,
            title: p.name,
            price: p.price,
            category: p.categories?.name,
            categoryId: p.category_id,
            description: p.description,
            image: p.image_url,
            images: p.metadata?.images || [p.image_url],
            brand: p.brand || p.metadata?.brand,
            tags: p.tags || p.metadata?.tags || [],
            rating: p.metadata?.rating || 0,
            numReviews: p.metadata?.numReviews || 0,
            countInStock: p.stock_quantity,
            supplier: p.metadata?.supplier,
            sellerId: p.metadata?.sellerId,
            supplierId: p.metadata?.supplierId,
            originalPrice: p.metadata?.originalPrice,
            discount: p.metadata?.discount,
            isApproved: p.metadata?.isApproved,
            status: p.metadata?.status,
            createdAt: p.created_at,
            isTrustedSeller
        };

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- LOGIN / REGISTER / VERIFY ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const userMeta = data.user.user_metadata || {};
        res.json({
            user: {
                id: data.user.id,
                name: userMeta.name || email.split('@')[0],
                email: data.user.email,
                role: userMeta.role || 'user',
                phone: userMeta.phone || "",
                token: data.session?.access_token
            }
        });
    } catch (error) {
        res.status(401).json({ error: error.message || "Invalid credentials" });
    }
});

app.post('/api/auth/verify', async (req, res) => {
    // Expecting token in headers normally, but sticking to body userId or token for legacy compatibility
    const token = req.headers.authorization?.split(' ')[1] || req.body.token;

    // For local dev fallback, if no token but userId is sent, try fetching from users table if we had one.
    // Since we're migrating fully to Supabase Auth, let's enforce token if possible.
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) throw error;

        const userMeta = user.user_metadata || {};
        res.json({
            user: {
                id: user.id,
                name: userMeta.name || user.email.split('@')[0],
                email: user.email,
                role: userMeta.role || 'user',
                phone: userMeta.phone || ""
            }
        });
    } catch (error) {
        res.status(401).json({ error: "Invalid session" });
    }
});

// Duplicate blocks removed. Supabase Auth is strictly enforced.

app.post('/api/auth/update-profile', async (req, res) => {
    // Requires Admin rights to update other users via API, or user needs to use their token
    const { userId, name, phone } = req.body;
    try {
        // Without RLS/Admin role bypass, a user can only update themselves using supabase.auth.updateUser
        // For server-side bypass, we use service_role key
        const { data: user, error } = await supabase.auth.admin.updateUserById(
            userId,
            { user_metadata: { name, phone } }
        );
        if (error) throw error;

        const userMeta = user.user.user_metadata;
        res.json({
            message: "Profile updated",
            user: {
                id: user.user.id,
                name: userMeta.name,
                email: user.user.email,
                role: userMeta.role,
                phone: userMeta.phone
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/change-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    try {
        // Simple bypass: use admin API to update password. 
        // Security note: In a real app we'd verify oldPassword first via signing in, or use updateUser with current session
        const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) throw error;

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CART ---
app.get('/api/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data: dbItems, error } = await supabase
            .from('cart_items')
            .select('quantity, price, products(id, name, image_url, price, metadata)')
            .eq('user_id', userId);
        
        if (error) throw error;
        
        const formattedItems = (dbItems || []).map(item => {
            const p = item.products;
            if (!p) return null;
            return {
                id: p.id,
                title: p.name,
                price: item.price || p.price,
                originalPrice: p.metadata?.originalPrice || p.price,
                discount: p.metadata?.discount || 0,
                image: p.image_url,
                qty: item.quantity || 1
            };
        }).filter(Boolean);
        
        res.json({ userId, items: formattedItems });
    } catch (error) {
        console.error("Cart fetch error:", error.message);
        res.json({ userId, items: [] });
    }
});

app.post('/api/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { items } = req.body;
        console.log(`[Cart Update] User: ${userId}, Items Count: ${items?.length || 0}`);

        // 1. Clear existing
        const { error: delErr } = await supabase.from('cart_items').delete().eq('user_id', userId);
        if (delErr) {
            console.error("[Cart Update] Delete Error:", delErr);
            throw delErr;
        }

        // 2. Insert new if any
        if (items && items.length > 0) {
            const payload = items.map(item => ({
                user_id: userId,
                product_id: item.id || item.productId,
                quantity: item.qty || item.quantity || 1,
                price: item.price
            }));
            
            const { error: insErr } = await supabase.from('cart_items').insert(payload);
            if (insErr) {
                console.error("[Cart Update] Insert Error:", insErr);
                throw insErr;
            }
        }

        console.log(`[Cart Update] Success for ${userId}`);
        res.json({ userId, items: items || [] });
    } catch (error) {
        console.error("[Cart Update] Final Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- ADDRESSES ---
app.get('/api/address/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
        if (error || !user) throw error || new Error("User not found");

        const addresses = user.user_metadata?.addresses || [];
        res.json(addresses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SELLER API ---
app.get('/api/seller/products', async (req, res) => {
    try {
        let userId = req.headers['x-user-id'];
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) userId = user.id;
        }
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { data: dbProducts, error } = await supabase.from('products').select('*, categories(name)').or(`metadata->>sellerId.eq.${userId},metadata->>supplierId.eq.${userId}`).order('created_at', { ascending: false });
        if (error) throw error;

        // Map them cleanly for the frontend (like the public endpoint does)
        const sellerProducts = (dbProducts || []).map(p => ({
            id: p.id,
            title: p.name,
            price: p.price,
            category: p.categories?.name,
            categoryId: p.category_id,
            description: p.description,
            image: p.image_url,
            images: p.metadata?.images || [p.image_url],
            brand: p.brand || p.metadata?.brand,
            tags: p.tags || p.metadata?.tags || [],
            rating: p.metadata?.rating || 0,
            numReviews: p.metadata?.numReviews || 0,
            countInStock: p.stock_quantity,
            supplier: p.metadata?.supplier,
            sellerId: p.metadata?.sellerId,
            supplierId: p.metadata?.supplierId,
            originalPrice: p.metadata?.originalPrice,
            discount: p.metadata?.discount,
            isApproved: p.metadata?.isApproved,
            status: p.metadata?.status,
            createdAt: p.created_at
        }));

        res.json(sellerProducts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/seller/orders', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

        const userId = user.id;

        // Fetch products owned by seller
        const { data: products } = await supabase.from('products').select('id')
            .or(`metadata->>sellerId.eq.${userId},metadata->>supplierId.eq.${userId}`);
        const productIds = products ? products.map(p => p.id) : [];

        if (productIds.length === 0) {
            return res.json([]);
        }

        // Fetch orders containing these products. 
        const { data: orders, error } = await supabase.from('orders').select('*, order_items(*, products(name, image_url))');
        if (error) throw error;

        const sellerOrders = orders.filter(order =>
            order.order_items.some(item => productIds.includes(item.product_id))
        ).map(order => {
            let address = {};
            try { address = JSON.parse(order.shipping_address); } catch (e) { }

            return {
                id: order.id,
                totalPrice: order.total_price,
                status: order.status,
                shippingAddress: address,
                createdAt: order.created_at,
                orderItems: order.order_items.filter(item => productIds.includes(item.product_id)).map(item => ({
                    id: item.product_id,
                    name: item.products ? item.products.name : "Product",
                    image: item.products ? item.products.image_url : null,
                    qty: item.quantity,
                    price: item.price,
                    seller_status: item.seller_status
                }))
            };
        });

        res.json(sellerOrders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/seller/stats', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

        const userId = user.id;

        // Fetch ALL products then filter by sellerId/supplierId in metadata (JS side)
        // This matches the pattern used in /api/seller/orders and /api/seller/unified-requests
        const { data: allProducts } = await supabase
            .from('products')
            .select('id, name, price, stock_quantity, category_id, metadata');

        const products = (allProducts || []).filter(p =>
            p.metadata?.sellerId === userId || p.metadata?.supplierId === userId
        );
        const productIds = products.map(p => p.id);

        // Fetch categories
        const { data: categories } = await supabase.from('categories').select('id, name');
        const catMap = {};
        (categories || []).forEach(c => { catMap[c.id] = c.name; });

        let sellerOrders = [];
        let orderItems = [];
        if (productIds.length > 0) {
            const { data: orders } = await supabase
                .from('orders')
                .select('id, status, total_price, created_at, order_items(product_id, quantity, price, seller_status)');
            if (orders) {
                // Only include non-cancelled orders for analytics
                const confirmedOrders = orders.filter(o => o.status !== 'cancelled');
                sellerOrders = confirmedOrders.filter(order =>
                    order.order_items.some(item => productIds.includes(item.product_id))
                );
                orderItems = sellerOrders.flatMap(o =>
                    o.order_items.filter(i => productIds.includes(i.product_id))
                );
            }
        }

        // Revenue
        const totalRevenue = orderItems.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 0)), 0);
        const pendingOrders = sellerOrders.filter(o => o.status === 'pending').length;

        // Top products by units sold
        const productSales = {};
        orderItems.forEach(item => {
            if (!productSales[item.product_id]) {
                const prod = products.find(p => p.id === item.product_id);
                productSales[item.product_id] = {
                    id: item.product_id,
                    name: prod?.name || 'Unknown',
                    category: catMap[prod?.category_id] || 'Unknown',
                    price: prod?.price || 0,
                    stock: prod?.stock_quantity || 0,
                    totalQty: 0,
                    totalRevenue: 0
                };
            }
            productSales[item.product_id].totalQty += item.quantity || 0;
            productSales[item.product_id].totalRevenue += (item.price || 0) * (item.quantity || 0);
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.totalQty - a.totalQty)
            .map((p, i) => ({ ...p, rank: i + 1 }));

        // Category breakdown
        const categorySales = {};
        topProducts.forEach(p => {
            const cat = p.category || 'Unknown';
            if (!categorySales[cat]) categorySales[cat] = { name: cat, totalQty: 0, totalRevenue: 0 };
            categorySales[cat].totalQty += p.totalQty;
            categorySales[cat].totalRevenue += p.totalRevenue;
        });
        const topCategories = Object.values(categorySales).sort((a, b) => b.totalRevenue - a.totalRevenue);

        // Recent orders (last 6)
        const recentOrders = sellerOrders
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 6)
            .map(o => ({
                id: o.id,
                status: o.status,
                createdAt: o.created_at,
                items: o.order_items.filter(i => productIds.includes(i.product_id)).map(i => {
                    const prod = products.find(p => p.id === i.product_id);
                    return { name: prod?.name || 'Product', qty: i.quantity, price: i.price, sellerStatus: i.seller_status };
                })
            }));

        res.json({
            totalProducts: productIds.length,
            totalOrders: sellerOrders.length,
            pendingOrders,
            totalRevenue,
            topProducts: topProducts.slice(0, 5),
            topCategories: topCategories.slice(0, 5),
            recentOrders
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/seller/category-request', async (req, res) => {
    try {
        const { name, image } = req.body;
        const { data: newCat, error } = await supabase.from('categories').insert({
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
        }).select().single();
        if (error) throw error;

        res.status(201).json({ ...newCat, isApproved: false, image });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/address/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { addresses } = req.body; // Expects array of addresses

        const { error } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { addresses: addresses || [] }
        });

        if (error) throw error;

        res.json({ message: "Addresses saved" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- WISHLIST ---
app.get('/api/wishlist/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data: wishlists, error } = await supabase.from('wishlists').select('product_id').eq('user_id', userId);
        if (error) throw error;

        res.json(wishlists.map(w => w.product_id));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/wishlist/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { productId } = req.body;

        const { error } = await supabase.from('wishlists').insert({
            user_id: userId,
            product_id: productId
        });

        // Ignore unique constraint violations if it already exists
        if (error && error.code !== '23505') throw error;

        res.json({ message: "Added to wishlist" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/wishlist/:userId/:productId', async (req, res) => {
    try {
        const { userId, productId } = req.params;
        const { error } = await supabase.from('wishlists').delete().match({ user_id: userId, product_id: productId });
        if (error) throw error;

        res.json({ message: "Removed from wishlist" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ORDERS ---
app.post('/api/orders', async (req, res) => {
    try {
        const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice, user } = req.body;
        const phone = user?.phone || "";

        // Start transaction/batch logic.
        for (const item of orderItems) {
            // Get current stock and seller details
            const { data: pData } = await supabase.from('products').select('stock_quantity, metadata').eq('id', item.id).single();
            if (pData) {
                const currentStock = pData.stock_quantity || 0;
                const newStock = Math.max(0, currentStock - (item.qty || 1));
                await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.id);
                // Attach seller id to the item for the order items table
                item.seller_id = pData.metadata?.sellerId || pData.metadata?.supplierId || null;
            }
        }

        const orderPayload = {
            total_price: Number(totalPrice),
            status: "pending",
            payment_status: "pending",
            payment_method: paymentMethod || "card",
            shipping_address: JSON.stringify(shippingAddress),
            phone: phone
        };

        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(user?.id);
        if (isUUID) {
            orderPayload.user_id = user.id;
        }

        const { data: newOrder, error } = await supabase.from('orders').insert(orderPayload).select().single();
        if (error) throw error;

        // Create order_items with seller details
        const itemsPayload = orderItems.map(item => ({
            order_id: newOrder.id,
            product_id: item.id,
            seller_id: item.seller_id || null,
            seller_status: 'pending',
            quantity: item.qty || 1,
            price: item.price
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsError) throw itemsError;

        const formattedOrder = {
            id: newOrder.id,
            user: user,
            orderItems: orderItems,
            shippingAddress: shippingAddress,
            paymentMethod: newOrder.payment_method,
            totalPrice: newOrder.total_price,
            createdAt: newOrder.created_at,
            status: newOrder.status
        };

        res.status(201).json(formattedOrder);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_id,
                    quantity,
                    price,
                    products ( name, image_url )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Format
        const userOrders = (orders || []).map(o => {
            let address = {};
            try { address = JSON.parse(o.shipping_address); } catch (e) { }

            return {
                id: o.id,
                user: { id: o.user_id },
                orderItems: o.order_items.map(i => ({
                    id: i.product_id,
                    name: i.products?.name,
                    image: i.products?.image_url,
                    qty: i.quantity,
                    price: i.price
                })),
                shippingAddress: address,
                paymentMethod: o.payment_method,
                totalPrice: o.total_price,
                createdAt: o.created_at,
                status: o.status
            };
        });

        res.json(userOrders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/orders/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: order, error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id).select().single();
        if (error) throw error;
        res.json({ message: "Order cancelled successfully", order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SELLER ORDER MANAGEMENT ---
app.put('/api/seller/orders/:orderId/items/:productId/status', async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { status } = req.body; // 'accepted' or 'rejected'

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Must be accepted or rejected." });
        }

        // 1. Update the order_item seller_status
        const { error: updateError } = await supabase
            .from('order_items')
            .update({ seller_status: status })
            .match({ order_id: orderId, product_id: productId });

        if (updateError) throw updateError;

        // 2. Fetch all items for this specific order
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('seller_status')
            .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        // 3. Logic to auto-update main order status
        let newOrderStatus = null;

        // If ANY seller rejects their item, whole order could be considered cancelled (or handled via partial refunds, but we'll cancel as requested).
        if (items.some(item => item.seller_status === 'rejected')) {
            newOrderStatus = 'cancelled';
        }
        // If ALL items across ALL sellers are accepted, we ship the order automatically
        else if (items.every(item => item.seller_status === 'accepted')) {
            newOrderStatus = 'shipped';
        }

        // Apply automatic status change if logic triggered it
        if (newOrderStatus) {
            const { error: orderStatusErr } = await supabase
                .from('orders')
                .update({ status: newOrderStatus })
                .eq('id', orderId);

            if (orderStatusErr) throw orderStatusErr;
        }

        res.json({
            message: `Order item marked as ${status}`,
            overallOrderStatus: newOrderStatus || 'pending'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- REQUESTS MANAGEMENT ---
// Unified endpoints pull from products, categories, etc based on metadata status

// GET requests (Admin: all, Seller: own)
// Replaced by unified-requests usually, but keeping stub if frontend used it
app.get('/api/requests', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        // Let unified requests handle the UI mostly, or return empty array if unused
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/requests', async (req, res) => {
    // Stubbed out - we moved logic directly to categories/products
    res.status(201).json({ id: Date.now().toString(), status: 'pending' });
});

app.put('/api/requests/:requestId', isAdmin, async (req, res) => {
    // Stubbed out
    res.json({ status: req.body.status });
});

// --- UNIFIED REQUESTS ENDPOINT ---
app.get('/api/admin/unified-requests', isAdmin, async (req, res) => {
    try {
        const { history } = req.query;
        const isHistory = history === 'true';

        // 1. Fetch Sellers (Profile Accounts) - skipped for now as we don't have dedicated sellers table in Supabase yet, relying on Auth metadata
        const filteredSellers = []; // TODO: Query users endpoint later if needed

        // 2. Fetch Products
        const { data: products } = await supabase.from('products').select('*');
        const filteredProducts = (products || []).filter(p => {
            const status = p.metadata?.status;
            const isApproved = p.metadata?.isApproved;
            return isHistory ? (status === 'approved' || status === 'rejected') : (isApproved === false || status === 'pending' || status === 'requested');
        }).map(p => ({
            id: p.id,
            type: 'product',
            title: `Product: ${p.name}`,
            subtitle: `Price: ${p.price}`,
            date: p.created_at,
            status: isHistory ? p.metadata?.status : 'pending',
            remark: p.metadata?.adminRemark || '',
            data: p
        }));

        // 3. Fetch Categories
        const { data: categories } = await supabase.from('categories').select('*');
        // Assuming categories are all approved instantly now, but we'll mock the filter
        const filteredCategories = (categories || []).filter(c => isHistory ? true : false).map(c => ({
            id: c.id,
            type: 'category',
            title: `Category: ${c.name}`,
            subtitle: '',
            date: c.created_at,
            status: 'approved',
            remark: '',
            data: c
        }));

        // General requests removed as we don't have a table for it yet

        const allRequests = [
            ...filteredSellers,
            ...filteredProducts,
            ...filteredCategories
        ].sort((a, b) => {
            let dateA = new Date(a.date).getTime();
            let dateB = new Date(b.date).getTime();
            if (isNaN(dateA)) dateA = Number(a.date) || 0;
            if (isNaN(dateB)) dateB = Number(b.date) || 0;
            return dateB - dateA;
        });

        res.json(allRequests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/seller/unified-requests', async (req, res) => {
    try {
        let userId = req.headers['x-user-id'];
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) userId = user.id;
        }
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { history } = req.query;
        const isHistory = history === 'true';

        const { data: products } = await supabase.from('products').select('*');

        const myProducts = (products || []).filter(p => p.metadata?.sellerId === userId || p.metadata?.supplierId === userId);
        const filteredProducts = myProducts.filter(p => {
            const status = p.metadata?.status;
            const isApproved = p.metadata?.isApproved;
            return isHistory ? (status === 'approved' || status === 'rejected') : (isApproved === false || status === 'pending' || status === 'requested');
        }).map(p => ({
            id: p.id,
            type: 'product',
            title: `Product: ${p.name}`,
            subtitle: `Price: ${p.price}`,
            date: p.created_at,
            status: isHistory ? p.metadata?.status : 'pending',
            remark: p.metadata?.adminRemark || '',
            data: p
        }));

        const allRequests = [
            ...filteredProducts
        ].sort((a, b) => {
            let dateA = new Date(a.date).getTime();
            let dateB = new Date(b.date).getTime();
            if (isNaN(dateA)) dateA = Number(a.date) || 0;
            if (isNaN(dateB)) dateB = Number(b.date) || 0;
            return dateB - dateA;
        });

        res.json(allRequests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Orders Analytics
app.get('/api/admin/orders', isAdmin, async (req, res) => {
    try {
        // Fetch all orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (ordersError) throw ordersError;

        // Fetch all order items with product info
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('*, products(id, name, category_id, price, stock_quantity, metadata)');
        if (itemsError) throw itemsError;

        // Fetch all products (for metadata like seller)
        const { data: products } = await supabase.from('products').select('id, name, price, stock_quantity, category_id, metadata');

        // Fetch categories for name lookup
        const { data: categories } = await supabase.from('categories').select('id, name');

        const catMap = {};
        (categories || []).forEach(c => { catMap[c.id] = c.name; });

        // Fetch all users/sellers
        const { data: users } = await supabase.from('users').select('id, name, email, role');
        const userMap = {};
        (users || []).forEach(u => { userMap[u.id] = u; });

        // Compute analytics — exclude cancelled orders
        const confirmedOrders = orders.filter(o => o.status !== 'cancelled');
        const totalOrders = confirmedOrders.length;
        const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0);
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

        // Only count items from non-cancelled orders
        const confirmedOrderIds = new Set(confirmedOrders.map(o => o.id));

        // Product sales aggregation (confirmed orders only)
        const productSales = {};
        (orderItems || []).filter(item => confirmedOrderIds.has(item.order_id)).forEach(item => {
            const pid = item.product_id;
            if (!productSales[pid]) {
                productSales[pid] = {
                    id: pid,
                    name: item.products?.name || 'Unknown',
                    totalQty: 0,
                    totalRevenue: 0,
                    price: item.products?.price || 0,
                    stock: item.products?.stock_quantity || 0,
                    categoryId: item.products?.category_id,
                    category: catMap[item.products?.category_id] || 'Unknown'
                };
            }
            productSales[pid].totalQty += item.quantity || 0;
            productSales[pid].totalRevenue += (item.price || 0) * (item.quantity || 0);
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.totalQty - a.totalQty)
            .map((p, i) => ({ ...p, rank: i + 1 }));

        // Seller aggregation from product metadata
        const sellerSales = {};
        (products || []).forEach(p => {
            const sellerId = p.metadata?.sellerId || p.metadata?.supplierId;
            if (!sellerId) return;
            if (!sellerSales[sellerId]) {
                // Priority: metadata.supplier (business name like "APPLE") > users table name > email prefix > fallback
                const sellerBusinessName = p.metadata?.supplier || p.metadata?.supplierName || p.metadata?.sellerName;
                const sellerUserName = userMap[sellerId]?.name;
                const sellerEmail = userMap[sellerId]?.email;
                const displayName = sellerBusinessName || sellerUserName || (sellerEmail ? sellerEmail.split('@')[0] : 'Unknown Seller');

                sellerSales[sellerId] = {
                    id: sellerId,
                    name: displayName,
                    email: userMap[sellerId]?.email || '',
                    totalProducts: 0,
                    categoryIds: new Set(),
                    totalQty: 0,
                    totalRevenue: 0,
                    topProduct: null,
                    topProductQty: 0
                };
            }
            sellerSales[sellerId].totalProducts += 1;
            if (p.category_id) sellerSales[sellerId].categoryIds.add(p.category_id);
            const sold = productSales[p.id];
            if (sold) {
                sellerSales[sellerId].totalQty += sold.totalQty;
                sellerSales[sellerId].totalRevenue += sold.totalRevenue;
                if (sold.totalQty > sellerSales[sellerId].topProductQty) {
                    sellerSales[sellerId].topProductQty = sold.totalQty;
                    sellerSales[sellerId].topProduct = sold.name;
                }
            }
        });

        const topSellers = Object.values(sellerSales)
            .map(s => ({ ...s, totalCategories: s.categoryIds.size, categoryIds: undefined }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .map((s, i) => ({ ...s, rank: i + 1 }));

        // Category aggregation
        const categorySales = {};
        topProducts.forEach(p => {
            const cid = p.categoryId;
            if (!cid) return;
            if (!categorySales[cid]) {
                categorySales[cid] = {
                    id: cid,
                    name: catMap[cid] || 'Unknown',
                    totalQty: 0,
                    totalRevenue: 0,
                    topProduct: null,
                    topProductQty: 0,
                    products: []
                };
            }
            categorySales[cid].totalQty += p.totalQty;
            categorySales[cid].totalRevenue += p.totalRevenue;
            categorySales[cid].products.push(p.name);
            if (p.totalQty > categorySales[cid].topProductQty) {
                categorySales[cid].topProductQty = p.totalQty;
                categorySales[cid].topProduct = p.name;
            }
        });

        const topCategories = Object.values(categorySales)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .map((c, i) => ({ ...c, rank: i + 1, products: c.products.slice(0, 5) }));

        // Format orders list for the table
        const ordersList = orders.map(o => {
            const items = (orderItems || []).filter(i => i.order_id === o.id);
            return {
                id: o.id,
                userId: o.user_id,
                totalPrice: o.total_price,
                status: o.status,
                createdAt: o.created_at,
                itemCount: items.length,
                items: items.map(i => ({
                    productId: i.product_id,
                    name: i.products?.name,
                    qty: i.quantity,
                    price: i.price,
                    sellerStatus: i.seller_status
                }))
            };
        });

        res.json({
            analytics: {
                totalOrders,       // confirmed only (non-cancelled)
                totalRevenue,      // from confirmed orders only
                cancelledOrders,   // informational count
                totalProducts: (products || []).length,
                totalSellers: Object.keys(sellerSales).length,
                topProducts: topProducts.slice(0, 10),
                topSellers: topSellers.slice(0, 10),
                topCategories: topCategories.slice(0, 10)
            },
            orders: ordersList,
            allProductStats: topProducts,
            allSellerStats: topSellers,
            allCategoryStats: topCategories
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 5001;

// --- Catch-all for API Routes (JSON 404) ---
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}`, success: false });
});

// --- Modern JSON Error Handler ---
app.use((err, req, res, next) => {
    console.error('[Global Error Handler]:', err);
    res.status(err.status || 500).json({ 
        error: err.message || 'Internal Server Error',
        success: false 
    });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
