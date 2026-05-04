"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
                    setProducts(data.slice(0, 5)); // Strictly limit to one row (5 items)
                }
            } catch (err) {
                console.error(err);
            }
        };
        if (category) fetchProds();
    }, [category]);

    if (products.length === 0) return null;

    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[20px] font-bold text-gray-800 uppercase tracking-tight">{title}</h2>
                <Link 
                    href={`/search?category=${encodeURIComponent(category)}`}
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
