module.exports = {
    name: 'show_deals',
    description: 'User asks for current deals, sales, discounts, or offers.',
    parameters: {},
    requiresConfirmation: false,
    returnDirectText: true,
    execute: async ({ supabase }) => {
        const { data: banners } = await supabase.from('banners').select('*').eq('active', true);
        const count = banners?.length || 0;
        
        return { 
            text: count > 0 
                ? `There are ${count} active deals and promotions today! Taking you to the offers page.` 
                : "Checking for active deals. Taking you to the offers page.", 
            success: true 
        };
    }
};
