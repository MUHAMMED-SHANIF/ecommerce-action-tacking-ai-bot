"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
                        setProducts(data.slice(0, 5)); // Strictly one row
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
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[20px] font-bold text-gray-800 uppercase tracking-tight">Recommended For You</h2>
                <Link 
                    href={`/search?category=${encodeURIComponent(categoryName)}`}
                    className="flex items-center gap-1 bg-[#0B3D2E] text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-[#145A3A] transition-all shadow-sm"
                >
                    View All
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.map(p => (
                    <ProductCard key={p.id} {...p} />
                ))}
            </div>
        </div>
    );
}
