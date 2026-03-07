"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

export default function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("q");
    const category = searchParams.get("category");
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                let url = "http://localhost:5001/api/products";

                if (query) {
                    url += `?search=${encodeURIComponent(query)}`; // Fixed backend variable from `q` to `search` based on server.js code
                } else if (category) {
                    url += `?category=${encodeURIComponent(category)}`;
                }

                if (query || category) {
                    const res = await fetch(url, { cache: 'no-store' });
                    if (res.ok) {
                        const data = await res.json();
                        setProducts(Array.isArray(data) ? data : []);
                    } else {
                        setProducts([]);
                    }
                } else {
                    setProducts([]); // Show initial empty state if no query
                }
            } catch (err) {
                console.error(err);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [query, category]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-[1248px]">
            <h1 className="text-xl font-medium mb-6">
                Search results for <span className="font-bold">"{query}"</span>
            </h1>

            {loading ? (
                <div className="text-center py-20">Loading...</div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-md shadow-sm">
                    <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/error-no-search-results_2353c5.png" alt="No Results" className="w-64 mb-6" />
                    <h2 className="text-xl font-medium mb-2">Sorry, no results found!</h2>
                    <p className="text-gray-500 mb-6">Please check the spelling or try searching for something else</p>
                    <button
                        onClick={() => router.push("/")}
                        className="bg-[#2874f0] text-white px-8 py-2 font-medium shadow-sm hover:bg-[#1e6fd9]"
                    >
                        Go to Homepage
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((p) => (
                        <ProductCard key={p.id} {...p} />
                    ))}
                </div>
            )}
        </div>
    );
}
