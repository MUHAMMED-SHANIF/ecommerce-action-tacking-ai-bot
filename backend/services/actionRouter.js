require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create an authenticated Supabase client scoped to the user's JWT
const getAuthSupabase = (token) => {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
};

const handleIntent = async (intent, entities, user, token) => {
    const supabase = getAuthSupabase(token);
    let resultData = null;
    let replyText = '';

    try {
        switch (intent) {
            case 'SEARCH_PRODUCT': {
                let query = supabase.from('products').select('id, name, price, stock_quantity, category_id').limit(5);

                if (entities.product_name) query = query.ilike('name', `%${entities.product_name}%`);
                if (entities.max_price) query = query.lte('price', entities.max_price);

                const { data, error } = await query;
                if (error) throw error;

                resultData = data;
                replyText = data && data.length
                    ? `I found ${data.length} items matching your search.`
                    : `I couldn't find any products matching that description.`;
                break;
            }

            case 'ADD_TO_CART': {
                if (!entities.product_name) {
                    replyText = "Which product would you like to add to your cart?";
                    break;
                }

                // Find product ID
                const { data: prodData, error: prodErr } = await supabase
                    .from('products')
                    .select('id, name, price')
                    .ilike('name', `%${entities.product_name}%`)
                    .limit(1)
                    .single();

                if (prodErr || !prodData) {
                    replyText = `I couldn't find ${entities.product_name} in our catalog.`;
                    break;
                }

                const qty = entities.quantity || 1;

                // Check if already in cart to update qty or insert new
                const { data: existingCartItem } = await supabase
                    .from('cart_items')
                    .select('id, quantity')
                    .eq('user_id', user.id)
                    .eq('product_id', prodData.id)
                    .maybeSingle();

                if (existingCartItem) {
                    const { error } = await supabase
                        .from('cart_items')
                        .update({ quantity: existingCartItem.quantity + qty })
                        .eq('id', existingCartItem.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('cart_items').insert({
                        user_id: user.id,
                        product_id: prodData.id,
                        quantity: qty
                    });
                    if (error) throw error;
                }

                replyText = `I've added ${qty} ${prodData.name} to your cart.`;
                break;
            }

            case 'REMOVE_FROM_CART': {
                if (!entities.product_name) {
                    replyText = "Which product would you like to remove from your cart?";
                    break;
                }

                const { data: prodData } = await supabase
                    .from('products')
                    .select('id')
                    .ilike('name', `%${entities.product_name}%`)
                    .limit(1)
                    .single();

                if (prodData) {
                    // RLS ensures they can only delete their own
                    const { error } = await supabase
                        .from('cart_items')
                        .delete()
                        .match({ user_id: user.id, product_id: prodData.id });

                    if (error) throw error;
                    replyText = `I've removed it from your cart.`;
                } else {
                    replyText = "I couldn't find that product to remove.";
                }
                break;
            }

            case 'VIEW_CART': {
                const { data, error } = await supabase
                    .from('cart_items')
                    .select('quantity, products(name, price)')
                    .eq('user_id', user.id);

                if (error) throw error;

                resultData = data;
                replyText = data && data.length
                    ? `You have ${data.length} types of items in your cart.`
                    : `Your cart is currently empty.`;
                break;
            }

            case 'PLACE_ORDER': {
                replyText = "Please proceed to the checkout page to review your cart and complete payment.";
                break;
            }

            case 'TRACK_ORDER': {
                let query = supabase.from('orders').select('id, status, total_amount, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);

                if (entities.order_id) {
                    query = supabase.from('orders').select('id, status, total_amount, created_at').eq('id', entities.order_id).eq('user_id', user.id).single();
                }

                const { data, error } = await query;

                if (error || !data || (Array.isArray(data) && data.length === 0)) {
                    replyText = "I couldn't find an order with those details.";
                } else {
                    const order = Array.isArray(data) ? data[0] : data;
                    replyText = `Your order ${order.id ? '(#' + order.id.split('-')[0] + ')' : ''} is currently ${order.status}.`;
                }
                break;
            }

            case 'REORDER': {
                replyText = "I've pulled up your past orders. Which one would you like to add back into your cart?";
                // Would optionally fetch latest order items here
                break;
            }

            case 'UPDATE_ADDRESS': {
                if (!entities.new_address) {
                    replyText = "What is the new address you would like to use?";
                    break;
                }

                // Usually an address has multiple fields (city, zip). We can store a simple string if needed
                // or just ask them to update it in UI. If we want to insert directly:
                replyText = "I see you want to update your address. Please visit your Profile settings to save the new exact address details (City, Zip, etc.).";
                break;
            }

            case 'RECOMMEND_PRODUCT': {
                replyText = "Based on our popular items, I recommend checking out our top electronics and new arrivals!";
                break;
            }

            case 'GENERIC_DB_ACTION': {
                const { db_table, db_action, db_match, db_payload, db_response_text } = entities || {};

                if (!db_table || !db_action) {
                    replyText = "I couldn't quite understand which data you wanted to modify.";
                    break;
                }

                // SECURITY: Limit allowed tables to user-owned data
                const allowedTables = ['profiles', 'addresses', 'cart_items', 'orders'];
                if (!allowedTables.includes(db_table)) {
                    replyText = "I don't have permission to modify that data.";
                    break;
                }

                try {
                    let query = supabase.from(db_table);

                    if (db_action === 'select') {
                        query = query.select('*');
                        if (db_match) query = query.match(db_match);
                        const { data, error } = await query;
                        if (error) throw error;
                        resultData = data;
                    }
                    else if (db_action === 'insert') {
                        // Ensure user_id is set to the authenticated user for safety
                        const finalPayload = { ...db_payload, user_id: user.id };
                        const { data, error } = await query.insert(finalPayload).select();
                        if (error) throw error;
                        resultData = data;
                    }
                    else if (db_action === 'update') {
                        if (!db_match) throw new Error("Match conditions required for update");
                        // We rely on RLS, but we can also force match on user_id
                        const { data, error } = await query.update(db_payload).match({ ...db_match, user_id: user.id }).select();
                        if (error) throw error;
                        resultData = data;
                    }
                    else if (db_action === 'delete') {
                        if (!db_match) throw new Error("Match conditions required for delete");
                        const { data, error } = await query.delete().match({ ...db_match, user_id: user.id }).select();
                        if (error) throw error;
                        resultData = data;
                    }

                    replyText = db_response_text || `I have successfully executed the ${db_action} action on ${db_table}.`;
                } catch (err) {
                    console.error("Dynamic DB Action Error:", err);
                    replyText = "I encountered an error trying to modify your data: " + err.message;
                }
                break;
            }

            case 'GENERAL_QUERY':
            default:
                replyText = "I am your personal shopping assistant! I can help you find products, manage your cart, and track orders. How can I help today?";
                break;
        }

        return { message: replyText, data: resultData };

    } catch (e) {
        console.error("Action Router Error:", e);
        return { message: "I'm sorry, I encountered an issue while trying to fulfill that request." };
    }
};

module.exports = { handleIntent };
