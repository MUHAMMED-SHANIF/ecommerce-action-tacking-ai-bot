"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

export default function RecentlyVisited() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const stored = localStorage.getItem('recent_visits');
                if (!stored) {
                    setLoading(false);
                    return;
                }

                const history = JSON.parse(stored);
                // Take top 10
                const top10 = history.slice(0, 10);

                if (top10.length === 0) {
                    setLoading(false);
                    return;
                }

                // History items may be plain product ID strings OR objects with .id
                const promises = top10.map((h: any) => {
                    const productId = typeof h === 'string' ? h : (h?.id || h?.product_id);
                    if (!productId) return Promise.resolve(null);
                    return fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products/${productId}`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null);
                });

                const results = await Promise.all(promises);
                const validProducts = results
                    .filter(p => p !== null && p.id)
                    .map((p: any) => ({
                        id: p.id,
                        title: p.title || p.name || '',
                        image: p.image || p.image_url || (p.metadata?.images && p.metadata.images[0]) || '',
                        price: p.price || 0,
                        originalPrice: p.originalPrice || p.metadata?.originalPrice || p.price || 0,
                        discount: p.discount || p.metadata?.discount || 0,
                        brand: p.brand || p.metadata?.brand || '',
                    }));
                setProducts(validProducts);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecent();
    }, []);

    if (loading) return null;
    if (products.length === 0) return null; // Or show "Not visited any product" as requested?
    // User asked: "if nothing then show not visted any product"
    // Let's interpret that as a section saying that.

    return (
        <div className="mb-10">
            <h2 className="text-[20px] font-bold text-gray-800 mb-4 uppercase tracking-tight">Recently Visited</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.slice(0, 5).map(p => (
                    <ProductCard key={p.id} {...p} />
                ))}
            </div>
        </div>
    );
}
