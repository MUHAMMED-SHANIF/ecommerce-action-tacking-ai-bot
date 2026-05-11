require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'seller_add_product',
    description: 'Add a new product to your inventory.',
    roles: ['seller'],
    parameters: {
        name: 'string - Product name',
        price: 'number - Product price in ₹',
        category_id: 'string - Category ID',
        description: 'string? - Product description',
        stock: 'number? - Initial stock quantity (default: 10)',
        image_url: 'string? - Main product image URL'
    },
    requiresConfirmation: true,
    confirmationMessage: (params) => `Add new product "${params.name}" for ₹${params.price}?`,

    execute: async ({ params, user, supabase }) => {
        // Sellers use auth supabase for themselves
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

        const { data, error } = await supabase
            .from('products')
            .insert({
                name: params.name,
                price: params.price,
                category_id: params.category_id,
                description: params.description || '',
                stock_quantity: params.stock || 10,
                image_url: params.image_url || 'https://via.placeholder.com/300',
                metadata: {
                    status: 'pending',
                    isApproved: false,
                    sellerId: user.id,
                    sellerName: profile?.full_name || 'Seller'
                }
            })
            .select()
            .single();

        if (error) throw error;

        return {
            text: `✅ Product "${params.name}" added and is currently pending approval.`,
            data: { product_id: data.id }
        };
    }
};
