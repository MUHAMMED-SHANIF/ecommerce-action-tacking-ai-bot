require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_update_order_status',
    description: 'Update the shipping status of an order item to "shipped" or "delivered". Requires confirmation.',
    roles: ['seller'],
    parameters: {
        order_id: 'string? - Full or partial order ID to update',
        new_status: 'string - New status: "shipped" or "delivered"',
        tracking_number: 'string? - Optional tracking/AWB number for shipped orders',
        result_ref: 'string? - internal order ID passed from previous steps'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => {
        const id = params.result_ref || params.order_id;
        return `Update order #${id?.split('-')[0] || id} to "${params.new_status}"?` +
               (params.tracking_number ? ` (Tracking: ${params.tracking_number})` : '');
    },

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const sellerId = user.id;
        const { order_id, new_status, tracking_number, result_ref } = params;
        const targetOrderId = result_ref || order_id;

        if (!['shipped', 'delivered'].includes(new_status)) {
            return { text: `Invalid status "${new_status}". Use "shipped" or "delivered".`, success: false };
        }

        // Verify this order contains seller's products
        const { data: products } = await serviceSupabase
            .from('products').select('id').eq('metadata->>sellerId', sellerId);

        const { data: orderItems } = await serviceSupabase
            .from('order_items')
            .select('orders!inner(id)')
            .in('product_id', products.map(p => p.id))
            .ilike('orders.id', `${targetOrderId}%`);

        if (!orderItems || orderItems.length === 0) {
            return { text: `Order #${targetOrderId} not found or doesn't contain your products.`, success: false };
        }

        const fullOrderId = orderItems[0].orders.id;

        const updateData = { status: new_status };
        if (tracking_number) {
            // Merge tracking into metadata
            const { data: existing } = await serviceSupabase.from('orders').select('metadata').eq('id', fullOrderId).single();
            updateData.metadata = { ...(existing?.metadata || {}), tracking_number };
        }

        const { error } = await serviceSupabase
            .from('orders')
            .update(updateData)
            .eq('id', fullOrderId);

        if (error) throw error;

        return {
            text: `✅ Order #${targetOrderId?.split('-')[0]} updated to "${new_status}" successfully!` +
                  (tracking_number ? ` Tracking: ${tracking_number}` : ''),
            success: true,
            order_id: fullOrderId,
            new_status
        };
    }
};
