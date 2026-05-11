require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

module.exports = {
    name: 'admin_add_category',
    description: 'Add a new product category.',
    roles: ['admin'],
    parameters: {
        name: 'string - Category name',
        slug: 'string? - URL slug',
        description: 'string? - Description',
        parent_category_id: 'string? - Parent category for sub-categories'
    },
    requiresConfirmation: false,

    execute: async ({ params, user, supabase }) => {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const slug = params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const { data, error } = await serviceSupabase
            .from('categories')
            .insert({
                name: params.name,
                slug: slug,
                description: params.description || '',
                parent_id: params.parent_category_id || null
            })
            .select()
            .single();

        if (error) throw error;

        return {
            text: `✅ Category "${params.name}" has been created.`,
            data: { category_id: data.id, message: "Category created" }
        };
    }
};
