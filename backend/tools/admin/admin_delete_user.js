require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_delete_user',
    description: 'Permanently delete a user account.',
    roles: ['admin'],
    parameters: {
        user_id: 'string - Full user ID',
        reason: 'string? - Reason for deletion'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Are you sure you want to PERMANENTLY DELETE user ${params.user_id}? This cannot be undone.`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { error } = await serviceSupabase.auth.admin.deleteUser(params.user_id);

        if (error) throw error;

        return {
            text: `✅ User account has been deleted.`,
            success: true,
            message: "User deleted"
        };
    }
};
