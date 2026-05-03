"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

export default function RecommendedProducts() {
    const [products, setProducts] = useState<any[]>([]);
    const [categoryName, setCategoryName] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommended = async () => {
            try {
                const stored = localStorage.getItem('recent_visits');
                if (!stored) {
                    setLoading(false);
                    return;
                }

                const history = JSON.parse(stored);
                if (history.length === 0) {
                    setLoading(false);
                    return;
                }

                // Find most frequent category
                const catCounts: Record<string, number> = {};
                history.forEach((h: any) => {
                    if (h.category) {
                        catCounts[h.category] = (catCounts[h.category] || 0) + 1;
                    }
                });

                let topCategory = "";
                let maxCount = 0;
                for (const [cat, count] of Object.entries(catCounts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        topCategory = cat;
                    }
                }

                if (topCategory) {
                    setCategoryName(topCategory);
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products?category=${encodeURIComponent(topCategory)}`);
                    if (res.ok) {
                        const data = await res.json();
                        // Filter out duplicates from history if desired? Or just show top products.
                        // Let's just show top 10 from that category.
                        setProducts(data.slice(0, 10));
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommended();
    }, []);

    if (loading || products.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Recommended For You ({categoryName})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {products.map(p => (
                    <ProductCard key={p.id} {...p} />
                ))}
            </div>
        </div>
    );
}
