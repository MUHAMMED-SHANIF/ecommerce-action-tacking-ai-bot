const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with Service Role or Anon key for decoding.
// But mostly we just need Anon Key because we pass user token to supabase auth.
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        let token;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) {
            // Fallback for custom file-based auth (for local dev without real Supabase JWT)
            const localUserId = req.headers['x-user-id'];
            if (localUserId) {
                req.user = { id: localUserId };
                req.token = "local_dev_token";
                return next();
            }
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
        }

        // Verify the JWT with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            // Check fallback one more time
            const localUserId = req.headers['x-user-id'];
            if (localUserId) {
                req.user = { id: localUserId };
                req.token = "local_dev_token";
                return next();
            }
            console.error('Auth verification failed:', error?.message);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Inject verified user and token into request
        req.user = user;
        req.token = token;

        next();
    } catch (err) {
        console.error('Middleware Auth Error:', err);
        return res.status(500).json({ error: 'Internal Server Error during authentication' });
    }
};

module.exports = { requireAuth };
