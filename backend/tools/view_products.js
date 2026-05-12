/**
 * Fallback tool for LLMs that hallucinate a 'view_products' action after searching.
 * This tool does nothing but returns success to prevent error messages in the chat.
 */
module.exports = {
    name: 'view_products',
    description: 'Display products previously found in search (fallback tool)',
    parameters: {
        products: 'array - list of products to view'
    },
    roles: ['user'],
    execute: async ({ params }) => {
        // We don't actually need to do anything here because the products are already in the context
        // and the frontend handles the rendering of the previous step's data.
        return {
            success: true,
            message: '', // Silent success
            data: {}
        };
    }
};
