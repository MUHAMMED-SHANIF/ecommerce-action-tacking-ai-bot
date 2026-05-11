require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_add_seller',
    description: 'Manually add a new seller account.',
    roles: ['admin'],
    parameters: {
        name: 'string - Seller full name',
        email: 'string - Seller email address',
        phone: 'string? - Seller phone number'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Create new seller account for ${params.name} (${params.email})?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        // Generate a random temporary password
        const tempPassword = Math.random().toString(36).slice(-10) + '!';

        const { data, error } = await serviceSupabase.auth.admin.createUser({
            email: params.email,
            password: tempPassword,
            user_metadata: { 
                full_name: params.name, 
                role: 'seller',
                phone: params.phone 
            },
            email_confirm: true
        });

        if (error) throw error;

        return {
            text: `✅ Seller account created successfully.\nEmail: ${params.email}\nTemp Password: ${tempPassword}`,
            data: {
                seller_id: data.user.id,
                credentials: { email: params.email, password: tempPassword }
            }
        };
    }
};
