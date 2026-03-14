module.exports = {
    name: 'update_address',
    description: 'Update the delivery address for a pending order. Requires confirmation before executing.',
    parameters: {
        order_id: 'string? - order ID to update address for (uses most recent pending order if omitted)',
        city: 'string? - new city',
        street: 'string? - new street/address line',
        state: 'string? - new state',
        zip: 'string? - new postal code',
        country: 'string? - new country'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => {
        const parts = [params.street, params.city, params.state, params.zip].filter(Boolean);
        return `Would you like to update the delivery address to: ${parts.join(', ')}?`;
    },
    execute: async ({ params, user, supabase }) => {
        const { order_id, city, street, state, zip, country } = params;

        // Find the order
        const orderQuery = order_id
            ? supabase.from('orders').select('id, status, shipping_address').eq('id', order_id).eq('user_id', user.id).maybeSingle()
            : supabase.from('orders').select('id, status, shipping_address').eq('user_id', user.id).in('status', ['pending']).order('created_at', { ascending: false }).limit(1).maybeSingle();

        const { data: order, error: fetchErr } = await orderQuery;
        if (fetchErr) throw fetchErr;
        if (!order) {
            return { text: "I couldn't find a pending order to update the address for." };
        }

        if (!['pending'].includes(order.status)) {
            return { text: `This order is already **${order.status}** — the address can only be updated for pending orders.` };
        }

        // Parse existing address
        let existingAddress = {};
        try { existingAddress = JSON.parse(order.shipping_address); } catch (_) {}

        // Merge new fields
        const newAddress = {
            ...existingAddress,
            ...(street && { street }),
            ...(city && { city }),
            ...(state && { state }),
            ...(zip && { zip }),
            ...(country && { country })
        };

        const { error: updateErr } = await supabase
            .from('orders')
            .update({ shipping_address: JSON.stringify(newAddress) })
            .eq('id', order.id);

        if (updateErr) throw updateErr;

        const addressParts = [newAddress.street, newAddress.city, newAddress.state, newAddress.zip, newAddress.country].filter(Boolean);
        const shortId = order.id.split('-')[0].toUpperCase();

        return {
            text: `✅ Delivery address for order **#${shortId}** has been updated to:\n📍 ${addressParts.join(', ')}`
        };
    }
};
