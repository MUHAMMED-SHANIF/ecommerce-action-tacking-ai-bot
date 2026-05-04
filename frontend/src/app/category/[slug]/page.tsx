'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowUpDown, Package } from 'lucide-react';
import ProductCard from '@/components/ProductCard';

export default function CategoryPage() {
    const params = useParams();
    const router = useRouter();
    const categoryName = decodeURIComponent(params.slug as string);

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'newest'>('popular');

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products?category=${encodeURIComponent(categoryName)}`,
                    { cache: 'no-store' }
                );
                if (res.ok) {
                    const data = await res.json();
                    setProducts(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error('Failed to fetch products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [categoryName]);

    const sorted = useMemo(() => {
        const list = [...products];
        if (sortBy === 'price_asc') return list.sort((a, b) => (a.price || 0) - (b.price || 0));
        if (sortBy === 'price_desc') return list.sort((a, b) => (b.price || 0) - (a.price || 0));
        if (sortBy === 'newest') return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return list;
    }, [products, sortBy]);

    return (
        <div className="min-h-screen bg-[#ffffff]">
            {/* Hero banner bar */}
            <div className="bg-gradient-to-r from-[#1b5e20] to-[#144216] text-white shadow-sm">
                <div className="container mx-auto px-4 max-w-[1248px] py-6">
                    <div className="flex items-center gap-2 text-emerald-100/80 text-xs mb-2">
                        <Link href="/" className="hover:text-yellow-200 transition">Home</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span>Categories</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-white font-semibold capitalize">{categoryName}</span>
                    </div>
                    <h1 className="text-2xl font-bold capitalize drop-shadow-sm">{categoryName}</h1>
                    <p className="text-emerald-100/90 text-sm mt-1 font-medium">
                        {loading ? 'Loading products…' : `${sorted.length} product${sorted.length !== 1 ? 's' : ''} available`}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-[1248px] py-5">

                {/* Sort Bar */}
                <div className="bg-white rounded-xl shadow-sm px-5 py-3 mb-5 flex items-center justify-between">
                    <p className="text-sm text-gray-500 font-medium">
                        Showing <span className="text-gray-800 font-semibold">{sorted.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        <label className="text-sm text-gray-600 font-medium">Sort by:</label>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                        >
                            <option value="popular">Popularity</option>
                            <option value="price_asc">Price — Low to High</option>
                            <option value="price_desc">Price — High to Low</option>
                            <option value="newest">Newest First</option>
                        </select>
                    </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm h-72 animate-pulse" />
                        ))}
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm flex flex-col items-center justify-center py-24 text-center px-6">
                        <Package className="w-16 h-16 text-gray-200 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">No products found</h2>
                        <p className="text-gray-400 text-sm mb-6">There are no products in this category yet.</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-2.5 bg-[#1b5e20] text-white rounded-full text-sm font-semibold hover:bg-[#144216] transition shadow-sm"
                        >
                            Browse Homepage
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {sorted.map((product: any) => (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                <ProductCard {...product} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
