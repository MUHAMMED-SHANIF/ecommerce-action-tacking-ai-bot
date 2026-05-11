module.exports = {
    name: 'track_order',
    description: 'Track the status of a user order. Use when user asks about their order status, delivery, or "where is my order". Can look up a specific order or the most recent one.',
    parameters: {
        order_id: 'string? - specific order ID to track (optional, uses latest order if not given)',
        result_ref: 'string? - internal order ID passed from previous steps'
    },
    requiresConfirmation: false,
    execute: async ({ params, user, supabase }) => {
        const { order_id, result_ref } = params;
        const targetOrderId = order_id || result_ref;

        let dbQuery = supabase
            .from('orders')
            .select('id, status, total_price, created_at, payment_method, shipping_address, order_items(quantity, price, products(name, image_url))')
            .order('created_at', { ascending: false });

        if (targetOrderId) {
            dbQuery = dbQuery.eq('id', targetOrderId);
        }

        // Scope to user if UUID
        const isUUID = /^[0-9a-f-]{36}$/i.test(user.id);
        if (isUUID) {
            dbQuery = dbQuery.eq('user_id', user.id);
        }

        dbQuery = dbQuery.limit(1).maybeSingle();

        const { data: order, error } = await dbQuery;
        if (error) throw error;
        if (!order) {
            return { text: "I couldn't find any orders for your account. Have you placed an order yet?", order: null };
        }

        const statusEmoji = {
            pending: '🕐', paid: '✅', shipped: '🚚', delivered: '📦', cancelled: '❌'
        };
        const emoji = statusEmoji[order.status] || '📋';

        let address = {};
        try { address = JSON.parse(order.shipping_address); } catch (_) {}

        const items = (order.order_items || []).map(i => ({
            name: i.products?.name || 'Product',
            qty: i.quantity,
            price: i.price,
            image: i.products?.image_url
        }));

        const shortId = order.id.split('-')[0].toUpperCase();
        return {
            text: `${emoji} Order **#${shortId}**\n📅 Placed: ${new Date(order.created_at).toLocaleDateString('en-IN')}\n🔖 Status: **${order.status.toUpperCase()}**\n💰 Total: ₹${order.total_price}\n🏠 Delivering to: ${address.city || 'address on file'}`,
            order: { ...order, items, shortId }
        };
    }
};
