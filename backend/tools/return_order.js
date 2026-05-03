module.exports = {
    name: 'return_order',
    description: 'User wants to return a delivered order',
    parameters: {
        order_id: 'string? - specific order ID to return',
        return_reason: 'string - Reason given by the user for returning the product'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Are you sure you want to request a return for this order with reason: "${params.return_reason}"?`,
    execute: async ({ params, user, supabase }) => {
        const { order_id, return_reason } = params;

        let orderQuery;
        if (order_id) {
            const isFullUUID = /^[0-9a-f-]{36}$/i.test(order_id);
            if (isFullUUID) {
                orderQuery = supabase.from('orders').select('id, status, total_price').eq('id', order_id).eq('user_id', user.id).maybeSingle();
            } else {
                const { data: allOrders } = await supabase.from('orders').select('id, status, total_price').eq('user_id', user.id).order('created_at', { ascending: false });
                const matched = (allOrders || []).find(o => o.id.toLowerCase().startsWith(order_id.toLowerCase()));
                orderQuery = Promise.resolve({ data: matched, error: null });
            }
        } else {
            orderQuery = supabase.from('orders').select('id, status, total_price').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        }

        const { data: order, error } = await orderQuery;
        if (!order) return { text: "I couldn't find an order to return.", success: false };

        if (!['delivered'].includes(order.status)) {
            return { text: `This order is marked as **${order.status}** and is not currently eligible for return.`, success: false };
        }

        await supabase.from('orders').update({ status: 'return_requested' }).eq('id', order.id);

        return { text: `Return requested successfully for order #${order.id.split('-')[0].toUpperCase()}. Reason: ${return_reason}. Our team will contact you for pickup.`, success: true };
    }
};
