require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const getServiceSupabase = () =>
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

        const supabase = getServiceSupabase();
        
        // Create user with admin API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'user', name: name || email.split('@')[0] }
        });

        if (authError) throw authError;

        // Try to insert profile
        const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            full_name: name || email.split('@')[0],
            role: 'user'
        });

        if (profileError && profileError.code === '23505') {
            await supabase.from('profiles').update({ role: 'user', full_name: name || email.split('@')[0] }).eq('id', authData.user.id);
        } else if (profileError) {
            console.error('Profile creation error:', profileError);
        }

        res.status(201).json({ message: "User registered successfully", user: authData.user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/register-seller
router.post('/register-seller', async (req, res) => {
    try {
        const { name, email, password, phone, addresses } = req.body;
        if (!email || !password || !name) return res.status(400).json({ error: "Name, email, and password are required" });

        const supabase = getServiceSupabase();

        // Create user with admin API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'seller', name, phone, addresses }
        });

        if (authError) throw authError;

        const userId = authData.user.id;

        // Try to insert profile
        const { error: profileError } = await supabase.from('profiles').insert({
            id: userId,
            full_name: name,
            phone_number: phone,
            role: 'seller'
        });

        if (profileError && profileError.code === '23505') {
            await supabase.from('profiles').update({
                full_name: name,
                phone_number: phone,
                role: 'seller'
            }).eq('id', userId);
        }

        // Insert addresses if provided
        if (addresses && Array.isArray(addresses) && addresses.length > 0) {
            const mappedAddresses = addresses.map(addr => ({
                user_id: userId,
                full_name: name,
                phone: phone || '',
                address_line1: addr.street || addr.address_line1 || '',
                address_line2: addr.building || addr.address_line2 || '',
                city: addr.city || '',
                state: addr.state || '',
                postal_code: addr.zip || addr.postal_code || '',
                country: addr.country || 'India',
                is_default: true
            }));
            
            const { error: addrError } = await supabase.from('addresses').insert(mappedAddresses);
            if (addrError) console.error("Error inserting addresses", addrError);
        }

        res.status(201).json({ message: "Seller registered successfully", user: authData.user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/update-profile
// Mock implementation to satisfy frontend calls in seller settings
router.post('/update-profile', async (req, res) => {
    res.json({ message: "Profile updated (mock)" });
});

// POST /api/auth/change-password
// Mock implementation to satisfy frontend calls in seller settings
router.post('/change-password', async (req, res) => {
    res.json({ message: "Password updated (mock)" });
});

module.exports = router;
