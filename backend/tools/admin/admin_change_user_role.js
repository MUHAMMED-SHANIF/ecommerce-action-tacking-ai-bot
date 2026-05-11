require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_change_user_role',
    description: 'Change a user role (promote/demote). Requires confirmation.',
    roles: ['admin'],
    parameters: {
        user_id: 'string - Full user ID',
        new_role: 'string - New role: "user", "seller", or "admin"'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Change role for user ${params.user_id} to "${params.new_role}"?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        if (!['user', 'seller', 'admin'].includes(params.new_role)) {
            return { text: "Invalid role. Must be 'user', 'seller', or 'admin'.", success: false };
        }

        const { data, error } = await serviceSupabase.auth.admin.updateUserById(
            params.user_id,
            { user_metadata: { role: params.new_role } }
        );

        if (error) throw error;

        return {
            text: `✅ User role updated to "${params.new_role}" successfully.`,
            success: true,
            message: "Role updated"
        };
    }
};
