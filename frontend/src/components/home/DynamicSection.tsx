"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

interface DynamicSectionProps {
    title: string;
    category: string;
}

export default function DynamicSection({ title, category }: DynamicSectionProps) {
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        const fetchProds = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products?category=${encodeURIComponent(category)}`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.slice(0, 5)); // Limit to 5 for creating a row
                }
            } catch (err) {
                console.error(err);
            }
        };
        if (category) fetchProds();
    }, [category]);

    if (products.length === 0) return null;

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {products.map(p => (
                    <ProductCard key={p.id} {...p} />
                ))}
            </div>
        </div>
    );
}
