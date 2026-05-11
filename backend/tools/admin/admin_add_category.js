require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_add_category',
    description: 'Add a new product category to the platform.',
    roles: ['admin'],
    parameters: {
        name: 'string - Category name',
        slug: 'string? - URL-friendly slug (auto-generated if missing)',
        description: 'string? - Category description'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const slug = params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const { data, error } = await serviceSupabase
            .from('categories')
            .insert({
                name: params.name,
                slug: slug,
                description: params.description || ''
            })
            .select()
            .single();

        if (error) throw error;

        return {
            text: `✅ Category "${params.name}" added successfully.`,
            data: { category_id: data.id, message: "Category created" }
        };
    }
};
