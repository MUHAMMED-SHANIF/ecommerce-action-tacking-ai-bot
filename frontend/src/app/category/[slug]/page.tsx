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
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products?category=${encodeURIComponent(categoryName)}${minPrice ? `&min_price=${minPrice}` : ''}${maxPrice ? `&max_price=${maxPrice}` : ''}`,
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
    }, [categoryName, minPrice, maxPrice]);

    const sorted = useMemo(() => {
        const list = [...products];
        if (sortBy === 'price_asc') return list.sort((a, b) => (a.price || 0) - (b.price || 0));
        if (sortBy === 'price_desc') return list.sort((a, b) => (b.price || 0) - (a.price || 0));
        if (sortBy === 'newest') return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return list;
    }, [products, sortBy]);

    return (
        <div className="min-h-screen bg-[#F5EFE6]">
            {/* Hero banner bar */}
            <div className="bg-gradient-to-r from-[#0B3D2E] to-[#145A3A] text-white shadow-sm">
                <div className="container mx-auto px-4 max-w-[1248px] py-6">
                    <div className="flex items-center gap-2 text-emerald-100/80 text-xs mb-2">
                        <Link href="/" className="hover:text-[#FFB020] transition">Home</Link>
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
                <div className="bg-white rounded-xl shadow-sm px-5 py-4 mb-5 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                        <p className="text-sm text-gray-500 font-medium">
                            Showing <span className="text-gray-800 font-semibold">{sorted.length}</span> results
                        </p>

                        <div className="flex items-center gap-3 border-l pl-6 border-gray-100">
                            <label className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Price Range</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    placeholder="Min" 
                                    min="0"
                                    value={minPrice} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === "" || parseFloat(val) >= 0) setMinPrice(val);
                                    }}
                                    className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#145A3A] outline-none"
                                />
                                <span className="text-gray-300">—</span>
                                <input 
                                    type="number" 
                                    placeholder="Max" 
                                    min="1"
                                    value={maxPrice} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === "" || parseFloat(val) >= 1) setMaxPrice(val);
                                    }}
                                    className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#145A3A] outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        <label className="text-sm text-gray-600 font-medium">Sort by:</label>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#145A3A] cursor-pointer"
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
                            className="px-6 py-2.5 bg-[#0B3D2E] text-white rounded-full text-sm font-semibold hover:bg-[#145A3A] transition shadow-sm"
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
