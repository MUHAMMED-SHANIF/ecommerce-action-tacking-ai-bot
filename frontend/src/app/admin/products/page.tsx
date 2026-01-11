"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import Link from "next/link";

interface Product {
    id: string;
    title: string;
    price: number;
    category: string;
    countInStock: number;
    image: string;
    rating: number;
    supplier?: string;
    sellerId?: string;
}

export default function AdminProducts() {
    const { user } = useAuth();
    const router = useRouter();
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
    }, [user]);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredProducts(products.filter(p =>
            p.title.toLowerCase().includes(lower) ||
            p.category?.toLowerCase().includes(lower) ||
            (p.supplier && p.supplier.toLowerCase().includes(lower))
        ));
    }, [searchTerm, products]);

    const fetchProducts = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/products');
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
            setFilteredProducts(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            try {
                const res = await fetch(`http://localhost:5001/api/admin/products/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': user!.id },
                });
                if (res.ok) fetchProducts();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleDeleteAll = async () => {
        if (confirm("CRITICAL WARNING: This will delete ALL products in the store. This action cannot be undone. Are you absolutely sure?")) {
            const secondConfirm = prompt("Type 'DELETE' to confirm deletion of all products.");
            if (secondConfirm === 'DELETE') {
                try {
                    const res = await fetch(`http://localhost:5001/api/admin/products/all`, {
                        method: 'DELETE',
                        headers: { 'x-user-id': user!.id },
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

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Products</h1>
                <div className="flex gap-4">
                    <button
                        onClick={handleDeleteAll}
                        className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 shadow-sm"
                    >
                        <Trash2 size={18} /> Delete All
                    </button>
                    <Link
                        href="/admin/products/add"
                        className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 shadow-sm"
                    >
                        <Plus size={18} /> Add Product
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Search products by title, category, or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="bg-white rounded shadow overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-4 font-semibold">Image</th>
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Price</th>
                                <th className="p-4 font-semibold">Category</th>
                                <th className="p-4 font-semibold">Supplier</th>
                                <th className="p-4 font-semibold">Stock</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4">
                                        {/* Preview Link */}
                                        <Link href={`/product/${product.id}?preview=true`}>
                                            <div className="w-12 h-12 relative border rounded bg-white cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all" title="Click to Preview">
                                                {/* Use img tag instead of Next.js Image to allow external URLs */}
                                                <img
                                                    src={getSafeImageUrl(product.image)}
                                                    alt={product.title}
                                                    className="w-full h-full object-contain p-1"
                                                />
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="p-4 font-medium max-w-[200px] truncate" title={product.title}>{product.title}</td>
                                    <td className="p-4">₹{product.price.toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{product.category}</span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{product.supplier || "N/A"}</td>
                                    <td className="p-4 text-sm">{product.countInStock}</td>
                                    <td className="p-4 text-right">
                                        <Link
                                            href={`/admin/products/edit/${product.id}`}
                                            className="text-blue-600 hover:text-blue-800 mr-3 inline-block"
                                            title="Edit Product"
                                        >
                                            <Edit size={18} />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="text-red-500 hover:text-red-700 inline-block"
                                            title="Delete Product"
                                        >
                                            <Trash2 size={18} />
                                        </button>
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
            )}
        </div>
    );
}
