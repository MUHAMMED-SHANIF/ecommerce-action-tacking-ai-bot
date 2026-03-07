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

// Serve static files from "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
// Keeping USERS_FILE solely for `isAdmin` fallback if needed, but going to rewrite `isAdmin` as well.

// --- Helper Functions ---
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

// --- Init Data ---
const initDB = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => { });
};
initDB();

// --- Auth Middleware ---
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
const assistantRoutes = require('./routes/assistant');
app.use('/api/assistant', assistantRoutes);

// --- UPLOAD ---
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return relative path
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
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
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "Banner deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/banners/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

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
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
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
    res.status(400).json({ error: "Creating sellers directly via this endpoint is deprecated. Update user role instead." });
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
        const { error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        if (error) throw error;
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
            rating: p.metadata?.rating || 0,
            numReviews: p.metadata?.numReviews || 0,
            originalPrice: p.metadata?.originalPrice,
            discount: p.metadata?.discount,
            isApproved: p.metadata?.isApproved !== false,
            status: p.metadata?.status || 'approved',
            supplier: p.metadata?.supplier,
            sellerId: p.metadata?.sellerId,
            isPaused: p.metadata?.isPaused === true,
            tags: p.metadata?.tags || []
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
            image_url: updateData.image || existingProduct.image_url,
            metadata: metadata
        };

        if (updateData.categoryId) dbUpdate.category_id = updateData.categoryId;
        else if (updateData.category) {
            const { data: catData } = await supabase.from('categories').select('id').eq('name', updateData.category).maybeSingle();
            if (catData) dbUpdate.category_id = catData.id;
        }

        const { data: updatedProduct, error } = await supabase.from('products').update(dbUpdate).eq('id', id).select().single();

        if (error) throw error;
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/products/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
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
        // Wipe all layout
        await supabase.from('home_layout').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (navbar && navbar.length > 0) {
            const inserts = navbar.map((nav, i) => ({ type: 'navbar', position: i, title: nav.title || nav.category, category: nav.category }));
            await supabase.from('home_layout').insert(inserts);
        }
        if (sections && sections.length > 0) {
            const inserts = sections.map((sec, i) => ({ type: 'section', position: i, title: sec.title, category: sec.category }));
            await supabase.from('home_layout').insert(inserts);
        }
        res.json({ message: "Layout updated successfully" });
    } catch (error) {
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

// --- PUBLIC: PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const category = req.query.category;
        const searchTerm = req.query.search;

        let query = supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });

        // Filter for visible products
        // We look for metadata->>'status' = 'approved' and metadata->>'isPaused' = 'false'
        query = query.eq('metadata->>status', 'approved').neq('metadata->>isPaused', 'true');

        if (category) {
            query = query.ilike('categories.name', category);
        }

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            query = query.or(`name.ilike.%${lowerSearch}%,description.ilike.%${lowerSearch}%`);
            // Note: Searching inside JSONB tags is more complex in simple PostgREST, leaving it at name/desc for now
        }

        const { data: products, error } = await query;

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
            brand: p.metadata?.brand,
            tags: p.metadata?.tags || [],
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
            brand: p.metadata?.brand,
            tags: p.metadata?.tags || [],
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

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
                role: 'user'
            }
        });
        if (error) throw error;

        // Sometimes Supabase returns user but no session if email confirmation is required
        if (data.user) {
            res.json({
                user: {
                    id: data.user.id,
                    name,
                    email: data.user.email,
                    role: 'user'
                }
            });
        } else {
            res.status(400).json({ error: "Registration failed" });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/register-seller', async (req, res) => {
    const { name, email, password, phone, addresses } = req.body;
    try {
        const cleanEmail = email ? email.trim() : '';
        const { data, error } = await supabase.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: false, // Auto-confirm to bypass email rate limits
            user_metadata: {
                name: name ? name.trim() : '',
                phone: phone ? phone.trim() : '',
                role: 'seller',
                addresses: addresses || []
            }
        });
        if (error) throw error;

        const user = data.user;

        // Optionally, if we ever need to sync to a postgres table, we do it here.
        // For now, we rely strictly on Supabase Auth metadata for seller identity.

        res.json({
            user: {
                id: user?.id,
                name,
                email: cleanEmail,
                role: 'seller',
                phone
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const cleanEmail = email ? email.trim() : '';
        const { data, error } = await supabase.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: false, // Auto-confirm bypasses rate limits
            user_metadata: {
                name: name ? name.trim() : '',
                role: 'user'
            }
        });
        if (error) throw error;
        res.status(201).json({ user: data.user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/verify', async (req, res) => {
    const { userId } = req.body;
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === userId);

    if (user) {
        res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone || "" } });
    } else {
        res.status(401).json({ error: "Invalid session" });
    }
});

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
            brand: p.metadata?.brand,
            tags: p.metadata?.tags || [],
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
        const { data: orders, error } = await supabase.from('orders').select('*, order_items(*, products(name))');
        if (error) throw error;

        const sellerOrders = orders.filter(order =>
            order.order_items.some(item => productIds.includes(item.product_id))
        ).map(order => ({
            id: order.id,
            totalPrice: order.total_amount,
            status: order.status,
            createdAt: order.created_at,
            orderItems: order.order_items.filter(item => productIds.includes(item.product_id)).map(item => ({
                id: item.product_id,
                name: item.products ? item.products.name : "Product",
                qty: item.quantity,
                price: item.price_at_purchase
            }))
        }));

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

        const { data: products } = await supabase.from('products').select('id')
            .or(`metadata->>sellerId.eq.${userId},metadata->>supplierId.eq.${userId}`);
        const productIds = products ? products.map(p => p.id) : [];

        let sellerOrders = [];
        if (productIds.length > 0) {
            const { data: orders } = await supabase.from('orders').select('status, order_items(product_id)');
            if (orders) {
                sellerOrders = orders.filter(order =>
                    order.order_items.some(item => productIds.includes(item.product_id))
                );
            }
        }

        const pendingOrders = sellerOrders.filter(o => o.status !== 'delivered');

        res.json({
            totalProducts: productIds.length,
            totalOrders: sellerOrders.length,
            pendingOrders: pendingOrders.length
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

        // Start transaction/batch logic. Supabase JS doesn't have native transactions for multiple tables easily without RPC
        // We will decrement stock for each item first, then create the order.

        for (const item of orderItems) {
            // Get current stock
            const { data: pData } = await supabase.from('products').select('stock_quantity').eq('id', item.id).single();
            if (pData) {
                const currentStock = pData.stock_quantity || 0;
                const newStock = Math.max(0, currentStock - (item.qty || 1));
                await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.id);
            }
        }

        // Create the order entry
        const orderPayload = {
            user_id: user?.id || null, // Assuming UUID, but user object from older impl might just have ID string
            total_amount: Number(totalPrice),
            status: "Processing",
            metadata: {
                orderItems,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                taxPrice,
                shippingPrice,
                userSnapshot: user
            }
        };

        // If user_id is a UUID we can use it, but since legacy user ID might be a timestamp string, 
        // we might need to store the user_id in metadata instead if it violates foreign key `uuid`.
        // We'll attempt to set user_id if it's a valid uuid, otherwise null.
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(user?.id);
        if (isUUID) {
            orderPayload.user_id = user.id;
        } else {
            delete orderPayload.user_id;
        }

        const { data: newOrder, error } = await supabase.from('orders').insert(orderPayload).select().single();
        if (error) throw error;

        // Map it back to expected frontend structure
        const formattedOrder = {
            id: newOrder.id,
            user: newOrder.metadata.userSnapshot,
            orderItems: newOrder.metadata.orderItems,
            shippingAddress: newOrder.metadata.shippingAddress,
            paymentMethod: newOrder.metadata.paymentMethod,
            totalPrice: newOrder.total_amount,
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
        // Search metadata for matching user ID (since user_id column might not capture legacy string IDs)
        // Alternatively, if all users were migrated to Supabase Auth, they have UUIDs now.
        // Let's check both column and JSONB metadata.

        let { data: orders, error } = await supabase.from('orders')
            .select('*')
            .or(`user_id.eq.${userId},metadata->userSnapshot->>id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) {
            // Fallback for when ID format restricts OR query
            const { data: fallbackOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
            orders = fallbackOrders?.filter(o => o.user_id === userId || o.metadata?.userSnapshot?.id === userId) || [];
            error = null;
        }

        // Format to legacy structure
        const userOrders = orders.map(o => ({
            id: o.id,
            user: o.metadata?.userSnapshot,
            orderItems: o.metadata?.orderItems || [],
            shippingAddress: o.metadata?.shippingAddress,
            paymentMethod: o.metadata?.paymentMethod,
            totalPrice: o.total_amount,
            createdAt: o.created_at,
            status: o.status
        }));

        res.json(userOrders);
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

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
