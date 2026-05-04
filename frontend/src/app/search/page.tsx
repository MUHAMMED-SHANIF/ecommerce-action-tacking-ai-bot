"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, ChevronRight, ArrowUpDown, Package } from "lucide-react";
import ProductCard from "@/components/ProductCard";

export default function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const categoryParam = searchParams.get("category") || "";
    const maxPriceParam = searchParams.get("maxPrice") || "";

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState(query);
    const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'newest'>('popular');

    useEffect(() => { setSearchInput(query); }, [query]);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products`;
                const params = new URLSearchParams();
                if (query) params.set("search", query);
                if (categoryParam) params.set("category", categoryParam);
                if (maxPriceParam) params.set("max_price", maxPriceParam);
                if (params.toString()) url += "?" + params.toString();

                const res = await fetch(url, { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    setProducts(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error(err);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [query, categoryParam]);

    const sorted = useMemo(() => {
        const list = [...products];
        if (sortBy === 'price_asc') return list.sort((a, b) => (a.price || 0) - (b.price || 0));
        if (sortBy === 'price_desc') return list.sort((a, b) => (b.price || 0) - (a.price || 0));
        if (sortBy === 'newest') return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        return list;
    }, [products, sortBy]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchInput.trim()) return;
        router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    };

    const title = query
        ? `Results for "${query}"`
        : categoryParam
            ? categoryParam
            : "All Products";

    return (
        <div className="min-h-screen bg-[#F5EFE6]">

            {/* Hero Search Bar */}
            <div className="bg-gradient-to-r from-[#0B3D2E] to-[#145A3A] text-white">
                <div className="container mx-auto px-4 max-w-[1248px] py-6">
                    <div className="flex items-center gap-2 text-emerald-100/80 text-xs mb-4">
                        <Link href="/" className="hover:text-[#FFB020] transition">Home</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-white font-semibold truncate">{title}</span>
                    </div>
                    <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Search for products, brands and more…"
                                className="w-full pl-12 pr-10 py-3 rounded-xl text-sm text-gray-800 bg-white shadow focus:outline-none focus:ring-2 focus:ring-[#145A3A]"
                            />
                            {searchInput && (
                                <button type="button" onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                                </button>
                            )}
                        </div>
                        <button type="submit" className="bg-[#F59E0B] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#FFB020] transition shadow text-sm">
                            Search
                        </button>
                    </form>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-[1248px] py-5">

                {/* Sort Bar */}
                <div className="bg-white rounded-xl shadow-sm px-5 py-3 mb-5 flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-gray-500 font-medium">
                        {loading
                            ? 'Searching…'
                            : <><span className="text-gray-800 font-semibold">{sorted.length}</span> result{sorted.length !== 1 ? 's' : ''} {query ? `for "${query}"` : ''}</>
                        }
                    </p>
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

                {/* Products */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm h-72 animate-pulse" />
                        ))}
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm flex flex-col items-center justify-center py-24 text-center px-6">
                        <Package className="w-16 h-16 text-gray-200 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">No results found</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            {query
                                ? `We couldn't find anything for "${query}". Try a different search term.`
                                : 'No products available in this category yet.'}
                        </p>
                        <button
                            onClick={() => router.push("/")}
                            className="px-6 py-2.5 bg-[#0B3D2E] text-white rounded-full text-sm font-semibold hover:bg-[#145A3A] transition shadow-sm"
                        >
                            Go to Homepage
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {sorted.map((p) => (
                            <div key={p.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                <ProductCard {...p} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
