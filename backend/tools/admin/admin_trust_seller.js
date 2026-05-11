require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_trust_seller',
    description: 'Mark a seller as trusted to enable auto-approval of their products.',
    roles: ['admin'],
    parameters: {
        seller_id: 'string - Full seller ID'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Mark seller ${params.seller_id} as TRUSTED? Their future products will be auto-approved.`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { error } = await serviceSupabase.auth.admin.updateUserById(
            params.seller_id,
            { user_metadata: { isTrusted: true } }
        );

        if (error) throw error;

        return {
            text: `✅ Seller is now trusted. Their new products will go live automatically.`,
            success: true,
            message: "Seller trusted"
        };
    }
};
