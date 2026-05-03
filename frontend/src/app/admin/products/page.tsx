"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import Link from "next/link";

interface Product {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    category: string;
    countInStock: number;
    image: string;
    rating: number;
    supplier?: string;
    sellerId?: string;
    isApproved?: boolean;
    isPaused?: boolean;
    tags?: string[];
}

export default function AdminProducts() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            router.push("/login");
            return;
        }
        fetchProducts();

        // Auto-fill search from URL param
        const supplierParam = searchParams.get('supplier');
        if (supplierParam) {
            setSearchTerm(supplierParam);
        }
    }, [user, searchParams]);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredProducts(products.filter(p =>
            p.title.toLowerCase().includes(lower) ||
            p.category?.toLowerCase().includes(lower) ||
            (p.supplier && p.supplier.toLowerCase().includes(lower)) ||
            (p.tags && p.tags.some(tag => tag.toLowerCase().includes(lower)))
        ));
    }, [searchTerm, products]);

    // Poll for updates every 5 seconds
    useEffect(() => {
        if (!user || user.role !== 'admin') return;
        const interval = setInterval(() => {
            fetchProducts(true); // true = silent update (no loading spinner)
        }, 5000);
        return () => clearInterval(interval);
    }, [user]);

    const fetchProducts = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/products/all`, {
                headers: { 'Authorization': `Bearer ${user?.token}` },
                cache: 'no-store'
            });
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
            // Only update filtered if not searching, or re-apply filter?
            // Simple approach: just update filtering logic in useEffect
            if (!silent) setLoading(false);
        } catch (err) {
            console.error(err);
            if (!silent) setLoading(false);
        }
    };

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/products/${id}/approve`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (res.ok) fetchProducts(true);
        } catch (err) {
            console.error("Failed to approve", err);
        }
    };

    const handleTogglePause = async (id: string, currentStatus: boolean | undefined, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
                body: JSON.stringify({ isPaused: !currentStatus })
            });

            if (res.ok) fetchProducts(true);
        } catch (err) {
            console.error("Failed to toggle pause", err);
        }
    };


    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (res.ok) fetchProducts(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteAll = async () => {
        if (confirm("CRITICAL WARNING: This will delete ALL products in the store. This action cannot be undone. Are you absolutely sure?")) {
            const secondConfirm = prompt("Type 'DELETE' to confirm deletion of all products.");
            if (secondConfirm === 'DELETE') {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/products/all`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${user?.token}` },
                    });
                    if (res.ok) fetchProducts();
                } catch (err) {
                    console.error(err);
                }
            }
        }
    };

    // Helper to get safe image URL
    const getSafeImageUrl = (img: string | undefined): string => {
        const fallback = "https://placehold.co/100?text=No+Image";
        if (!img || typeof img !== 'string' || !img.trim()) return fallback;
        return img.trim();
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading inventory...</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Product Inventory</h1>
                    <p className="text-gray-500">Manage all products in the store</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDeleteAll}
                        className="bg-red-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-red-700 shadow-sm text-sm font-medium transition-colors"
                    >
                        <Trash2 size={16} /> Delete All
                    </button>
                    <Link href="/admin/products/add">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm font-medium">
                            <Plus className="w-5 h-5" />
                            Add Product
                        </button>
                    </Link>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products by name, category, or supplier..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold border-b border-gray-100">Product</th>
                                <th className="p-4 font-semibold border-b border-gray-100">Price</th>
                                <th className="p-4 font-semibold border-b border-gray-100">Stock</th>
                                <th className="p-4 font-semibold border-b border-gray-100">Status</th>
                                <th className="p-4 font-semibold border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.map((product) => (
                                <tr
                                    key={product.id}
                                    onClick={() => router.push(`/admin/products/edit/${product.id}`)}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                                {product.image ? (
                                                    <img src={getSafeImageUrl(product.image)} alt={product.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <span className="text-xs">No Img</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-800 line-clamp-1">{product.title}</h3>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>{product.category}</span>
                                                    {product.supplier && <span className="text-blue-500">• {product.supplier}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-gray-700">₹{product.price.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${product.countInStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {product.countInStock > 0 ? `${product.countInStock} Left` : 'Out of Stock'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1 items-start">
                                            {/* @ts-ignore */}
                                            {product.isApproved === false ? (
                                                <button
                                                    onClick={(e) => handleApprove(product.id, e)}
                                                    className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors"
                                                >
                                                    Approve Now
                                                </button>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                                                    Active
                                                </span>
                                            )}
                                            {/* @ts-ignore */}
                                            {product.isPaused && (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                    Paused
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Pause Toggle */}
                                            <button
                                                /* @ts-ignore */
                                                onClick={(e) => handleTogglePause(product.id, product.isPaused, e)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    /* @ts-ignore */
                                                    product.isPaused ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-orange-500 hover:bg-orange-50'
                                                    }`}
                                                /* @ts-ignore */
                                                title={product.isPaused ? "Resume Product" : "Pause Product"}
                                            >
                                                {/* @ts-ignore */}
                                                {product.isPaused ? <Plus className="w-4 h-4 rotate-45" /> : <div className="w-4 h-4 font-bold border-2 border-current rounded-full flex items-center justify-center text-[10px]">||</div>}
                                            </button>

                                            <Link href={`/admin/products/edit/${product.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={(e) => handleDelete(product.id, e)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">No products found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
