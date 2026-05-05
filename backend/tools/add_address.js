module.exports = {
    name: 'add_address',
    description: 'Save a new delivery address to the user\'s profile. Ask user for name, mobile (numbers only), address line, city, state, and pincode. Optionally give the address a label like "home" or "office".',
    parameters: {
        label: 'string? - label for the address e.g. "home", "office", "work" (default: "home")',
        name: 'string - recipient full name',
        mobile: 'string - 10-digit phone number (digits only)',
        addressLine: 'string - street / area / locality',
        city: 'string - city',
        state: 'string - state',
        pincode: 'string - postal/pin code'
    },
    requiresConfirmation: false,
    execute: async ({ params, user, supabase }) => {
        const { label = 'home', name, mobile, addressLine, city, state, pincode } = params;

        // Validate required fields
        const missing = [];
        if (!name) missing.push('name');
        if (!mobile) missing.push('mobile number');
        if (!addressLine) missing.push('address line');
        if (!city) missing.push('city');
        if (!state) missing.push('state');
        if (!pincode) missing.push('pincode');

        if (missing.length > 0) {
            return {
                text: `To save your address, I still need: **${missing.join(', ')}**. Could you please provide ${missing.length === 1 ? 'it' : 'them'}?`
            };
        }

        // Validate mobile is numeric only
        if (!/^\d+$/.test(mobile)) {
            return {
                text: `📱 The mobile number must contain **digits only** (no spaces, dashes, or letters). Please resend it as a plain number like \`9876543210\`.`
            };
        }

        // We must use the admin client to update user metadata because the anon client lacks a session
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Fetch fresh existing addresses from user metadata
        const { data: { user: authUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(user.id);
        if (userErr || !authUser) {
            return { text: "I couldn't access your profile. Please try again." };
        }

        const existingAddresses = authUser.user_metadata?.addresses || [];

        // Check if a label with same name already exists and replace it
        const labelLower = label.toLowerCase();
        const updatedAddresses = existingAddresses.filter(a => (a.label || '').toLowerCase() !== labelLower);

        const newAddress = {
            label: labelLower,
            name,
            mobile,
            addressLine,
            city,
            state,
            pincode
        };

        updatedAddresses.push(newAddress);

        // Save back to user metadata
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: { ...authUser.user_metadata, addresses: updatedAddresses }
        });

        if (updateErr) throw updateErr;

        return {
            text: `✅ Address saved as **"${labelLower}"**!\n📍 ${name}, ${addressLine}, ${city}, ${state} - ${pincode}\n📱 ${mobile}\n\nYou can now order items to this address!`
        };
    }
};
