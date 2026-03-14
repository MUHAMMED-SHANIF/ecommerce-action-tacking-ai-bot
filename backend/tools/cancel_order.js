module.exports = {
    name: 'cancel_order',
    description: 'Cancel a user\'s order. Only works if order has not yet been shipped. Requires confirmation before executing.',
    parameters: {
        order_id: 'string? - specific order ID to cancel (uses most recent pending order if not given)'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Are you sure you want to cancel this order? This action cannot be undone.`,
    execute: async ({ params, user, supabase }) => {
        const { order_id } = params;

        // Find the order
        let dbQuery = supabase
            .from('orders')
            .select('id, status, total_price')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (order_id) {
            dbQuery = supabase.from('orders').select('id, status, total_price').eq('id', order_id).maybeSingle();
        }

        const isUUID = /^[0-9a-f-]{36}$/i.test(user.id);
        // We apply user_id filter via RLS in the actual update

        const { data: order, error: fetchErr } = await (order_id
            ? supabase.from('orders').select('id, status, total_price').eq('id', order_id).eq('user_id', user.id).maybeSingle()
            : supabase.from('orders').select('id, status, total_price').eq('user_id', user.id).in('status', ['pending', 'paid']).order('created_at', { ascending: false }).limit(1).maybeSingle()
        );

        if (fetchErr) throw fetchErr;
        if (!order) {
            return { text: "I couldn't find a cancellable order. Either there's no order or it may already be shipped/delivered." };
        }

        if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
            return { text: `This order is already **${order.status}** and cannot be cancelled.` };
        }

        // Perform cancellation
        const { error: cancelErr } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', order.id);

        if (cancelErr) throw cancelErr;

        const shortId = order.id.split('-')[0].toUpperCase();
        return {
            text: `✅ Order **#${shortId}** (₹${order.total_price}) has been cancelled successfully. If you paid online, a refund will be processed within 5-7 business days.`
        };
    }
};
