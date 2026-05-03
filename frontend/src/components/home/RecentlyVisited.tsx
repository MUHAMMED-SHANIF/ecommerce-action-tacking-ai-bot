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

                // Fetch details for these IDs
                // In a real app we might have a bulk fetch API, but for now we'll do parallel requests
                // or just rely on what we *could* have stored. 
                // Better to fetch fresh data to get price updates etc.
                const promises = top10.map((h: any) =>
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products/${h.id}`).then(r => r.ok ? r.json() : null)
                );

                const results = await Promise.all(promises);
                const validProducts = results.filter(p => p !== null);
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
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Recently Visited</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {products.map(p => (
                    <ProductCard key={p.id} {...p} />
                ))}
            </div>
        </div>
    );
}
