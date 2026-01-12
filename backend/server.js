const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

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
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BANNERS_FILE = path.join(DATA_DIR, 'banners.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const BANNER_SETTINGS_FILE = path.join(DATA_DIR, 'banner_settings.json');
const SELLERS_FILE = path.join(DATA_DIR, 'sellers.json');
const HOME_LAYOUT_FILE = path.join(DATA_DIR, 'home_layout.json');

// --- Helper Functions ---
const readJSON = async (file) => {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is empty/invalid, return default empty array/object
        if (file === HOME_LAYOUT_FILE) {
            return { navbar: [], sections: [] };
        }
        return [];
    }
};

const writeJSON = async (file, data) => {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
};

// --- Init Data ---
const initDB = async () => {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Initialize files if they don't exist
    for (const file of [PRODUCTS_FILE, USERS_FILE, BANNERS_FILE, CATEGORIES_FILE, SELLERS_FILE, HOME_LAYOUT_FILE]) {
        try {
            await fs.access(file);
        } catch {
            if (file === HOME_LAYOUT_FILE) {
                await writeJSON(file, {
                    navbar: [], // { position: 1, category: "Mobiles" }
                    sections: [] // { id: 1, title: "Best Mobiles", category: "Mobiles" }
                });
            } else {
                await writeJSON(file, []);
            }
        }
    }

    // Banner Settings Init (special case for object structure)
    try {
        await fs.access(BANNER_SETTINGS_FILE);
    } catch {
        await writeJSON(BANNER_SETTINGS_FILE, { autoPlay: true, showCarousel: true });
    }
};
initDB();

// --- Auth Middleware ---
const isAdmin = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === userId);

    if (user && user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: "Forbidden: Admin access only" });
    }
};

// --- Routes ---

// --- UPLOAD ---
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return relative path
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// --- ADMIN: BANNERS ---
app.get('/api/admin/banners', isAdmin, async (req, res) => {
    try {
        const banners = await readJSON(BANNERS_FILE);
        res.json(banners);
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

        const banners = await readJSON(BANNERS_FILE);
        const newBanner = {
            id: Date.now().toString(),
            title: title || "Untitled",
            image,
            link: link || "",
            actionType: actionType || "none",
            targetId: targetId || "",
            active: active !== undefined ? active : true,
            duration: Number(duration) || 5,
            createdAt: new Date().toISOString()
        };

        banners.push(newBanner);
        await writeJSON(BANNERS_FILE, banners);
        res.status(201).json(newBanner);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/banners/:id', isAdmin, async (req, res) => {
    try {
        let banners = await readJSON(BANNERS_FILE);
        banners = banners.filter(b => b.id !== req.params.id);
        await writeJSON(BANNERS_FILE, banners);
        res.json({ message: "Banner deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/banners/:id', isAdmin, async (req, res) => {
    try {
        let banners = await readJSON(BANNERS_FILE);
        const index = banners.findIndex(b => b.id === req.params.id);
        if (index !== -1) {
            banners[index] = { ...banners[index], ...req.body };
            await writeJSON(BANNERS_FILE, banners);
            res.json(banners[index]);
        } else {
            res.status(404).json({ error: "Banner not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: CATEGORIES ---
app.get('/api/admin/categories', async (req, res) => {
    try {
        const categories = await readJSON(CATEGORIES_FILE);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/categories', isAdmin, async (req, res) => {
    try {
        const categories = await readJSON(CATEGORIES_FILE);
        const newCat = { id: Date.now().toString(), ...req.body };
        categories.push(newCat);
        await writeJSON(CATEGORIES_FILE, categories);
        res.status(201).json(newCat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/categories/:id', isAdmin, async (req, res) => {
    try {
        let categories = await readJSON(CATEGORIES_FILE);
        const index = categories.findIndex(c => c.id === req.params.id);
        if (index !== -1) {
            categories[index] = { ...categories[index], ...req.body };
            await writeJSON(CATEGORIES_FILE, categories);
            res.json(categories[index]);
        } else {
            res.status(404).json({ error: "Category not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/categories/:id', isAdmin, async (req, res) => {
    try {
        let categories = await readJSON(CATEGORIES_FILE);
        const categoryToDelete = categories.find(c => c.id === req.params.id);
        categories = categories.filter(c => c.id !== req.params.id);
        await writeJSON(CATEGORIES_FILE, categories);

        // Cascade delete products
        if (categoryToDelete) {
            let products = await readJSON(PRODUCTS_FILE);
            const productsToKeep = products.filter(p => p.category !== categoryToDelete.name);
            await writeJSON(PRODUCTS_FILE, productsToKeep);
        }

        res.json({ message: "Category deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: SELLERS (Suppliers) ---
app.get('/api/admin/sellers', isAdmin, async (req, res) => {
    try {
        const sellers = await readJSON(SELLERS_FILE);
        res.json(sellers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/sellers', isAdmin, async (req, res) => {
    try {
        const sellers = await readJSON(SELLERS_FILE);
        const newSeller = { id: Date.now().toString(), ...req.body };
        sellers.push(newSeller);
        await writeJSON(SELLERS_FILE, sellers);
        res.status(201).json(newSeller);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/sellers/:id', isAdmin, async (req, res) => {
    try {
        let sellers = await readJSON(SELLERS_FILE);
        const index = sellers.findIndex(s => s.id === req.params.id);
        if (index !== -1) {
            sellers[index] = { ...sellers[index], ...req.body };
            await writeJSON(SELLERS_FILE, sellers);
            res.json(sellers[index]);
        } else {
            res.status(404).json({ error: "Seller not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/sellers/:id', isAdmin, async (req, res) => {
    try {
        let sellers = await readJSON(SELLERS_FILE);
        const sellerId = req.params.id;
        sellers = sellers.filter(s => s.id !== sellerId);
        await writeJSON(SELLERS_FILE, sellers);

        // Cascade delete products
        let products = await readJSON(PRODUCTS_FILE);
        const productsToKeep = products.filter(p => p.sellerId !== sellerId && p.supplierId !== sellerId); // check both just in case
        await writeJSON(PRODUCTS_FILE, productsToKeep);

        res.json({ message: "Seller deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: USERS ---
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        const users = await readJSON(USERS_FILE);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/users/:id/role', isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        let users = await readJSON(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === req.params.id);

        if (userIndex === -1) return res.status(404).json({ error: "User not found" });

        users[userIndex].role = role;
        await writeJSON(USERS_FILE, users);

        res.json({ message: "Role updated", user: { id: users[userIndex].id, role: users[userIndex].role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: PRODUCTS ---
app.delete('/api/admin/products/all', isAdmin, async (req, res) => {
    try {
        await writeJSON(PRODUCTS_FILE, []);
        res.json({ message: "All products deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/products', isAdmin, async (req, res) => {
    try {
        const { title, price, category, description, image, images, brand, rating, countInStock, supplier, sellerId, categoryId, originalPrice, discount } = req.body;
        let products = await readJSON(PRODUCTS_FILE);

        const newProduct = {
            id: Date.now().toString(),
            title,
            price: Number(price),
            category,
            categoryId,
            description,
            image, // Main image
            images: images || [image], // Array of images
            brand,
            rating: Number(rating) || 0,
            numReviews: 0,
            countInStock: Number(countInStock) || 0,
            supplier,
            sellerId: sellerId || req.body.supplierId, // Handle both names
            supplierId: sellerId || req.body.supplierId,
            originalPrice,
            discount,
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);
        await writeJSON(PRODUCTS_FILE, products);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/products/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        let products = await readJSON(PRODUCTS_FILE);
        const prodIndex = products.findIndex(p => p.id === id);

        if (prodIndex === -1) return res.status(404).json({ error: "Product not found" });

        products[prodIndex] = { ...products[prodIndex], ...updateData };
        await writeJSON(PRODUCTS_FILE, products);

        res.json(products[prodIndex]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/products/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        let products = await readJSON(PRODUCTS_FILE);
        products = products.filter(p => p.id !== id);
        await writeJSON(PRODUCTS_FILE, products);
        res.json({ message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN: HOME LAYOUT ---
app.get('/api/admin/home-layout', isAdmin, async (req, res) => {
    try {
        const layout = await readJSON(HOME_LAYOUT_FILE);
        // Ensure defaults if file was empty or partially defined
        if (!layout.navbar) layout.navbar = [];
        if (!layout.sections) layout.sections = [];
        res.json(layout);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/home-layout', isAdmin, async (req, res) => {
    try {
        // Expects { navbar: [...], sections: [...] }
        const layout = await readJSON(HOME_LAYOUT_FILE);
        const { navbar, sections } = req.body;

        if (navbar !== undefined) layout.navbar = navbar;
        if (sections !== undefined) layout.sections = sections;

        await writeJSON(HOME_LAYOUT_FILE, layout);
        res.json(layout);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- PUBLIC: BANNERS & CATEGORIES ---
app.get('/api/banners', async (req, res) => {
    try {
        const banners = await readJSON(BANNERS_FILE);
        const config = await readJSON(BANNER_SETTINGS_FILE);
        res.json({ banners, config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PUBLIC: HOME LAYOUT ---
app.get('/api/home-layout', async (req, res) => {
    try {
        const layout = await readJSON(HOME_LAYOUT_FILE);
        // Ensure defaults if file was empty or partially defined
        if (!layout.navbar) layout.navbar = [];
        if (!layout.sections) layout.sections = [];
        res.json(layout);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PUBLIC: PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        const category = req.query.category;

        if (category) {
            const lowerCat = category.toLowerCase();
            const filtered = products.filter(p => p.category && p.category.toLowerCase() === lowerCat);
            return res.json(filtered);
        }

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        const product = products.find(p => p.id === req.params.id);
        if (!product) return res.status(404).json({ error: "Not found" });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- LOGIN / REGISTER / VERIFY ---
const crypto = require('crypto');

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const users = await readJSON(USERS_FILE);
    const hashedPassword = hashPassword(password);

    console.log(`Login Attempt: ${email}`);
    console.log(`Input Password: ${password}`);
    console.log(`Generated Hash: ${hashedPassword}`);

    const user = users.find(u => u.email === email);
    if (user) {
        console.log(`User Found: ${user.email}`);
        console.log(`Stored Hash: ${user.password}`);
        console.log(`Match? ${user.password === hashedPassword}`);
    } else {
        console.log("User not found");
    }

    if (user && user.password === hashedPassword) {
        res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    const users = await readJSON(USERS_FILE);

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "User already exists" });
    }

    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password: hashPassword(password),
        role: 'user'
    };
    users.push(newUser);
    await writeJSON(USERS_FILE, users);
    res.json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
});

app.post('/api/auth/verify', async (req, res) => {
    const { userId } = req.body;
    const users = await readJSON(USERS_FILE);
    const user = users.find(u => u.id === userId);

    if (user) {
        res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } else {
        res.status(401).json({ error: "Invalid session" });
    }
});

// --- ORDERS ---
app.post('/api/orders', async (req, res) => {
    try {
        const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice, user } = req.body;
        // In a real app, save to orders.json
        // For now, just decrement stock

        let products = await readJSON(PRODUCTS_FILE);

        for (const item of orderItems) {
            const productIndex = products.findIndex(p => p.id === item.id);
            if (productIndex >= 0) {
                const currentStock = products[productIndex].countInStock || 0;
                products[productIndex].countInStock = Math.max(0, currentStock - (item.qty || 1));
            }
        }
        await writeJSON(PRODUCTS_FILE, products);

        const order = {
            id: Date.now().toString(),
            user,
            orderItems,
            shippingAddress,
            paymentMethod,
            totalPrice,
            createdAt: new Date().toISOString()
        };

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
