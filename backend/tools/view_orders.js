module.exports = {
    name: 'view_orders',
    description: 'User wants to see their past orders, order history, or recent orders.',
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ user, supabase }) => {
        const { data: orders } = await supabase
            .from('orders')
            .select('id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
        const count = orders?.length || 0;
        
        if (count > 0) {
            return { 
                text: `You have ${count} past orders on record. Showing your order history now.`, 
                success: true 
            };
        }
        
        return { text: "You don't have any past orders yet. Opening the orders page anyway!", success: true };
    }
};
