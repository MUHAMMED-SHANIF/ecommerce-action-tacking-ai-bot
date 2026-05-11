require('dotenv').config();

module.exports = {
    name: 'seller_customer_reviews',
    description: 'Get recent reviews for your products.',
    roles: ['seller'],
    parameters: {
        product_id: 'string? - Filter by specific product'
    },
    requiresConfirmation: false,
    returnDirectText: true,

    execute: async ({ params, user, supabase }) => {
        // Approximating review table or metadata
        // In this schema, reviews are usually in a separate table
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('rating, comment, created_at, products(name, metadata)')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            // Table might not exist or be empty
            return { text: "No recent customer reviews found for your products yet.", data: [] };
        }

        // Filter by seller ID in metadata if joined
        const sellerReviews = reviews.filter(r => r.products?.metadata?.sellerId === user.id);

        if (sellerReviews.length === 0) {
            return { text: "You haven't received any customer reviews yet.", data: [] };
        }

        const avgRating = (sellerReviews.reduce((s, r) => s + r.rating, 0) / sellerReviews.length).toFixed(1);
        const list = sellerReviews.map(r => `⭐ ${r.rating}/5: "${r.comment}" (${r.products.name})`).join('\n');

        return {
            text: `⭐ Your Average Rating: ${avgRating}/5\n\nRecent Reviews:\n${list}`,
            data: sellerReviews
        };
    }
};
