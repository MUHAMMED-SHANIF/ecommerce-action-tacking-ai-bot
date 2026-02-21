"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Search, Filter, AlertCircle, CheckCircle } from "lucide-react";

export default function SellerProducts() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchProducts = async () => {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        try {
            const res = await fetch("http://localhost:5001/api/seller/products", {
                headers: { "x-user-id": user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        try {
            // Re-using admin delete endpoint or need specific seller delete?
            // Admin delete checks isAdmin. We need a seller delete endpoint or modify admin one.
            // Actually, let's use the admin one but we need to update backend to allow seller to delete OWN products.
            // For now, let's assume the backend will block it if not admin. 
            // Wait, I didn't add a specific DELETE for seller. 
            // I should update backend to allow DELETE /api/products/:id if owner.
            // Or just hide delete for now? 
            // Let's implement DELETE client side and if it fails, show error.
            // Actually, I'll skip delete implementation for now to stick to plan, or just show it but it might fail.
            // Let's just list them.
            alert("Delete functionality coming soon.");
        } catch (err) {
            console.error(err);
        }
    };

    const filteredProducts = products.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Loading products...</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Products</h1>
                    <p className="text-slate-500">Manage your product inventory</p>
                </div>
                <Link href="/seller/products/add">
                    <button className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm shadow-violet-200">
                        <Plus className="w-5 h-5" />
                        Add Product
                    </button>
                </Link>
            </div>

            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* <button className="px-4 py-2 border border-slate-200 rounded-lg flex items-center gap-2 text-slate-600 hover:bg-slate-50">
                    <Filter className="w-4 h-4" />
                    Filter
                </button> */}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold border-b border-slate-100">Product</th>
                                <th className="p-4 font-semibold border-b border-slate-100">Price</th>
                                <th className="p-4 font-semibold border-b border-slate-100">Stock</th>
                                <th className="p-4 font-semibold border-b border-slate-100">Approvel Status</th>
                                <th className="p-4 font-semibold border-b border-slate-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                            <Package className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-slate-800 line-clamp-1">{product.title}</h3>
                                                    <span className="text-xs text-slate-500">{product.category}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium text-slate-700">₹{product.price.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${product.countInStock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                {product.countInStock > 0 ? `${product.countInStock} in stock` : 'Out of Stock'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {product.isApproved ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    <CheckCircle className="w-3 h-3" /> Approved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                                                    <Clock className="w-3 h-3" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {/* <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button> */}
                                            {/* <button 
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button> */}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No products found. Start by adding one!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

import { Package, Clock } from 'lucide-react'; // Fix imports
