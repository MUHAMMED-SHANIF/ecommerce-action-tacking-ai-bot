require('dotenv').config();

module.exports = {
    name: 'seller_low_stock_alerts',
    description: 'List products that are running low on stock (less than 5 units).',
    roles: ['seller'],
    parameters: {
        threshold: 'number? - Stock threshold (default: 5)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const threshold = params.threshold || 5;
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, stock_quantity')
            .eq('metadata->>sellerId', user.id)
            .lt('stock_quantity', threshold)
            .order('stock_quantity', { ascending: true });

        if (error) throw error;

        if (!products || products.length === 0) {
            return { text: `✅ All your products are well-stocked (above ${threshold} units)!`, data: [] };
        }

        const list = products.map(p => `• ${p.name}: ${p.stock_quantity} left`).join('\n');
        return {
            text: `⚠️ Low Stock Alert:\n${list}\n\nWould you like me to update the stock for any of these?`,
            data: products
        };
    }
};
