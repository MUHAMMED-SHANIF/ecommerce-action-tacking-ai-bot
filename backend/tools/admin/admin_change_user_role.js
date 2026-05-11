require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_change_user_role',
    description: 'Promote or demote a user to a different role.',
    roles: ['admin'],
    parameters: {
        user_id: 'string - Full user ID',
        new_role: 'string - New role: "user", "seller", or "admin"'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Change role of user ${params.user_id} to "${params.new_role}"?`,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        if (!['user', 'seller', 'admin'].includes(params.new_role)) {
            return { text: "Invalid role specified.", success: false };
        }

        const { error } = await serviceSupabase.auth.admin.updateUserById(
            params.user_id,
            { user_metadata: { role: params.new_role } }
        );

        if (error) throw error;

        // Also update profiles table if role is cached there
        await serviceSupabase
            .from('profiles')
            .update({ role: params.new_role })
            .eq('id', params.user_id);

        return {
            text: `✅ User role updated to "${params.new_role}".`,
            success: true,
            message: "Role updated"
        };
    }
};
