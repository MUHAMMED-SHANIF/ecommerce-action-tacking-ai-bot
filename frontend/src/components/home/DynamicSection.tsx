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
                let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products?category=${encodeURIComponent(category)}`;
                
                if (category === 'SPECIAL:RECENTLY_VISITED') {
                    url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products/recently-visited`;
                } else if (category === 'SPECIAL:MOST_SELLING') {
                    url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products/most-selling`;
                }

                const headers: any = {};
                const userData = localStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    if (user.token) headers['Authorization'] = `Bearer ${user.token}`;
                    if (user.id) headers['x-user-id'] = user.id;
                }

                const res = await fetch(url, { headers });
                if (res.ok) {
                    const data = await res.json();
                    // Normalize: handle both raw Supabase rows and pre-formatted objects
                    const normalized = (Array.isArray(data) ? data : []).map((p: any) => ({
                        id: p.id,
                        title: p.title || p.name || '',
                        image: p.image || p.image_url || (p.metadata?.images && p.metadata.images[0]) || '',
                        price: p.price || 0,
                        originalPrice: p.originalPrice || p.metadata?.originalPrice || p.price || 0,
                        discount: p.discount || p.metadata?.discount || 0,
                        brand: p.brand || p.metadata?.brand || '',
                        category: p.category || p.categories?.name || '',
                        countInStock: p.countInStock || p.stock_quantity || 0,
                    }));
                    setProducts(normalized.slice(0, 5));
                }
            } catch (err) {
                console.error(err);
            }
        };
        if (category) fetchProds();
    }, [category]);

    if (products.length === 0) return null;

    let href = `/search?category=${encodeURIComponent(category)}`;
    if (category === 'SPECIAL:RECENTLY_VISITED') {
        href = `/search?type=recently-visited`;
    } else if (category === 'SPECIAL:MOST_SELLING') {
        href = `/search?type=most-selling`;
    }

    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[20px] font-bold text-gray-800 uppercase tracking-tight">{title}</h2>
                <Link 
                    href={href}
                    className="flex items-center gap-1 bg-[#0B3D2E] text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-[#145A3A] transition-all shadow-sm"
                >
                    VIEW ALL
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
