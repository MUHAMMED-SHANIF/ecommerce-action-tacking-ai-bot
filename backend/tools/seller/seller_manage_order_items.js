require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

/**
 * seller_manage_order_items
 * Allows the seller to accept or reject order items in bulk or specifically,
 * with optional date-range filtering.
 */
module.exports = {
    name: 'seller_manage_order_items',
    description: 'Accept or reject pending order items in bulk or specifically. Supports filtering by date range (e.g. "accept all orders this week"). Can target all pending items, the last one, or specific orders/products.',
    roles: ['seller'],
    parameters: {
        action: 'string - The action to perform: "accepted" or "rejected"',
        scope: 'string? - "all" for all pending, "last" for the most recent one, "order" for a specific order ID, or "product" for a specific product name (default: all)',
        target_id: 'string? - The specific Order ID or Product Name if scope is "order" or "product"',
        date_filter: 'string? - Optional date range to filter which orders to act on: "today", "weekly", "monthly", "3months", "6months", "1year". If omitted, acts on all pending.'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => {
        const { action, scope, target_id, date_filter } = params;
        let targetText = "all pending items";
        if (scope === 'last') targetText = "the most recent pending item";
        if (scope === 'order') targetText = `items in order #${target_id?.split('-')[0] || target_id}`;
        if (scope === 'product') targetText = `orders for "${target_id}"`;

        const dateText = date_filter ? ` from the ${date_filter}` : '';
        return `Are you sure you want to mark ${targetText}${dateText} as ${action.toUpperCase()}?`;
    },

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;
        const { action, scope = 'all', target_id, date_filter } = params;

        if (!['accepted', 'rejected'].includes(action)) {
            return { text: `Invalid action "${action}". Use "accepted" or "rejected".`, success: false };
        }

        // 1. Build date cutoff from date_filter
        let sinceDateISO = null;
        if (date_filter) {
            const now = new Date();
            const dayMs = 24 * 60 * 60 * 1000;
            if (date_filter === 'today') {
                const d = new Date(); d.setHours(0, 0, 0, 0); sinceDateISO = d.toISOString();
            } else if (date_filter === 'weekly') {
                sinceDateISO = new Date(now.getTime() - 7 * dayMs).toISOString();
            } else if (date_filter === 'monthly') {
                sinceDateISO = new Date(now.getTime() - 30 * dayMs).toISOString();
            } else if (date_filter === '3months') {
                sinceDateISO = new Date(now.getTime() - 90 * dayMs).toISOString();
            } else if (date_filter === '6months') {
                sinceDateISO = new Date(now.getTime() - 180 * dayMs).toISOString();
            } else if (date_filter === '1year') {
                sinceDateISO = new Date(now.getTime() - 365 * dayMs).toISOString();
            }
        }

        // 2. Get seller's products
        const { data: products } = await serviceSupabase
            .from('products').select('id, name').eq('metadata->>sellerId', sellerId);

        if (!products || products.length === 0) {
            return { text: "You don't have any products listed yet.", success: false };
        }
        const productIds = products.map(p => p.id);

        // 3. Fetch orders filtered by date if needed
        let eligibleOrderIds = null;
        if (sinceDateISO) {
            const { data: recentOrders } = await serviceSupabase
                .from('orders')
                .select('id')
                .gte('created_at', sinceDateISO)
                .neq('status', 'cancelled');
            if (!recentOrders || recentOrders.length === 0) {
                return { text: `No orders found in the specified time period.`, success: false };
            }
            eligibleOrderIds = recentOrders.map(o => o.id);
        }

        // 4. Fetch pending order items
        let query = serviceSupabase
            .from('order_items')
            .select('id, order_id, product_id, seller_status, products(name)')
            .in('product_id', productIds)
            .eq('seller_status', 'pending');

        if (eligibleOrderIds) {
            query = query.in('order_id', eligibleOrderIds);
        }

        if (scope === 'order' && target_id) {
            query = query.ilike('order_id', `${target_id}%`);
        } else if (scope === 'product' && target_id) {
            const matchingProds = products.filter(p => p.name.toLowerCase().includes(target_id.toLowerCase()));
            if (matchingProds.length > 0) {
                query = query.in('product_id', matchingProds.map(p => p.id));
            } else {
                return { text: `No products found matching "${target_id}".`, success: false };
            }
        }

        const { data: pendingItems, error: fetchErr } = await query.order('id', { ascending: false });
        if (fetchErr) throw fetchErr;

        if (!pendingItems || pendingItems.length === 0) {
            return { text: "No pending order items found for the specified scope and date range.", success: false };
        }

        // 5. Narrow by scope
        let itemsToUpdate = pendingItems;
        if (scope === 'last') itemsToUpdate = [pendingItems[0]];

        const itemIds = itemsToUpdate.map(i => i.id);

        // 6. Perform update
        const { error: updateErr } = await serviceSupabase
            .from('order_items')
            .update({ seller_status: action })
            .in('id', itemIds);

        if (updateErr) throw updateErr;

        const count = itemIds.length;
        const actionVerb = action === 'accepted' ? 'accepted' : 'rejected';
        const dateLabel = date_filter ? ` from the ${date_filter}` : '';

        return {
            text: `✅ Successfully ${actionVerb} ${count} item(s)${dateLabel}.`,
            success: true,
            count,
            action,
            date_filter,
            item_ids: itemIds
        };
    }
};
