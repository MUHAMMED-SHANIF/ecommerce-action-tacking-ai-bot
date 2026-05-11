require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_change_user_role',
    description: 'Promote or demote a user to a different role.',
    roles: ['admin'],
    parameters: {
        user_id: 'string? - Full user ID',
        new_role: 'string - New role: "user", "seller", or "admin"',
        result_ref: 'string? - internal user ID passed from previous steps'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => {
        const id = params.result_ref || params.user_id;
        return `Change role of user ${id} to "${params.new_role}"?`;
    },

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const targetUserId = params.result_ref || params.user_id;
        
        if (!['user', 'seller', 'admin'].includes(params.new_role)) {
            return { text: "Invalid role specified.", success: false };
        }

        const { error } = await serviceSupabase.auth.admin.updateUserById(
            targetUserId,
            { user_metadata: { role: params.new_role } }
        );

        if (error) throw error;

        // Also update profiles table if role is cached there
        await serviceSupabase
            .from('profiles')
            .update({ role: params.new_role })
            .eq('id', targetUserId);

        return {
            text: `✅ User role updated to "${params.new_role}".`,
            success: true,
            message: "Role updated"
        };
    }
};
