require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_check_inventory',
    description: "Check stock levels for the seller's products. Flags low stock and out-of-stock items.",
    roles: ['seller'],
    parameters: {
        product_id: 'string? - Specific product ID to check (optional, checks all if not provided)',
        low_stock_threshold: 'number? - Items below this count are flagged as low stock (default: 5)'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;
        const threshold = parseInt(params.low_stock_threshold) || 5;

        let query = serviceSupabase
            .from('products')
            .select('id, name, stock_quantity, metadata')
            .eq('metadata->>sellerId', sellerId);

        if (params.product_id) {
            query = query.eq('id', params.product_id);
        }

        const { data: products, error } = await query;
        if (error) throw error;
        if (!products || products.length === 0) {
            return { text: "You don't have any products listed yet.", inventory: [] };
        }

        const inventory = products.map(p => ({
            id: p.id,
            name: p.name,
            current_stock: p.stock_quantity,
            status: p.stock_quantity === 0 ? 'out_of_stock' : p.stock_quantity <= threshold ? 'low' : 'ok',
            paused: p.metadata?.isPaused === true
        }));

        const outOfStock = inventory.filter(i => i.status === 'out_of_stock');
        const lowStock = inventory.filter(i => i.status === 'low');
        const ok = inventory.filter(i => i.status === 'ok');

        return {
            text: `📦 Inventory Check (${inventory.length} products):\n` +
                  (outOfStock.length > 0 ? `\n🔴 OUT OF STOCK (${outOfStock.length}):\n` + outOfStock.map(p => `  - ${p.name}`).join('\n') : '') +
                  (lowStock.length > 0 ? `\n🟡 LOW STOCK (${lowStock.length}) — below ${threshold} units:\n` + lowStock.map(p => `  - ${p.name}: ${p.current_stock} left`).join('\n') : '') +
                  (outOfStock.length === 0 && lowStock.length === 0 ? '\n✅ All products have sufficient stock!' :
                    `\n✅ OK (${ok.length} products)`),
            inventory,
            summary: { total: inventory.length, out_of_stock: outOfStock.length, low_stock: lowStock.length, ok: ok.length }
        };
    }
};
