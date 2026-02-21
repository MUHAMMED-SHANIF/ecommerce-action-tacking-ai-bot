'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Save, Plus, X } from 'lucide-react';
import Link from 'next/link';

interface Category {
    id: string;
    name: string;
    image?: string;
    isApproved?: boolean;
}

interface Product {
    id: string;
    title: string;
    category: string;
    image: string;
    price: number;
}

export default function AdminCategories() {
    const { user } = useAuth();
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchCategories();
            fetchProducts();
        }
    }, [user]);

    const fetchCategories = async () => {
        const res = await fetch('http://localhost:5001/api/admin/categories');
        const data = await res.json();
        setCategories(data);
    };

    const fetchProducts = async () => {
        const res = await fetch('http://localhost:5001/api/products');
        const data = await res.json();
        setProducts(data);
    };

    const handleApprove = async (id: string) => {
        try {
            const res = await fetch(`http://localhost:5001/api/admin/categories/${id}/approve`, {
                method: 'PUT',
                headers: { 'x-user-id': user!.id }
            });
            if (res.ok) {
                setCategories(categories.map(c =>
                    c.id === id ? { ...c, isApproved: true } : c
                ));
            }
        } catch (error) {
            console.error('Failed to approve category', error);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this category?')) return;
        const res = await fetch(`http://localhost:5001/api/admin/categories/${id}`, {
            method: 'DELETE',
            headers: { 'x-user-id': user!.id }
        });
        if (res.ok) fetchCategories();
    };

    const getImageUrl = (img: string) => {
        if (!img) return '';
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        return `http://localhost:5001${img}`;
    };

    const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredProducts = selectedCategory ? products.filter(p => p.category === selectedCategory) : [];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Categories</h1>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search categories..."
                        className="border px-3 py-2 rounded"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Link href="/admin/categories/add">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <Plus size={18} /> Add Category
                        </button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List */}
                <div className="bg-white rounded shadow text-black">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="text-left p-3 w-16">Icon</th>
                                <th className="text-left p-3">Name</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-right p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map(cat => (
                                <tr key={cat.id} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedCategory === cat.name ? 'bg-blue-50' : ''}`} onClick={() => setSelectedCategory(cat.name)}>
                                    <td className="p-3">
                                        <img
                                            src={
                                                cat.image ? getImageUrl(cat.image) : `https://placehold.co/128x128/png?text=${encodeURIComponent(cat.name.substring(0, 2))}`
                                            }
                                            className="w-10 h-10 object-cover rounded bg-gray-100"
                                            alt={cat.name}
                                        />
                                    </td>
                                    <td className="p-3">
                                        {cat.name}
                                    </td>
                                    <td className="p-3">
                                        {cat.isApproved === false && (
                                            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Pending</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {cat.isApproved === false && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleApprove(cat.id); }}
                                                className="mr-2 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-200"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        <Link href={`/admin/categories/edit/${cat.id}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 mr-2 inline-block">
                                            <Edit size={18} />
                                        </Link>
                                        <button onClick={(e) => handleDelete(cat.id, e)} className="text-red-600"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Info Panel */}
                <div className="bg-white rounded shadow p-4 text-black h-fit sticky top-4">
                    {selectedCategory ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Products in "{selectedCategory}"</h2>
                                <button onClick={() => setSelectedCategory(null)}><X /></button>
                            </div>
                            {filteredProducts.length === 0 ? (
                                <p className="text-gray-500">No products found in this category.</p>
                            ) : (
                                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                                    {filteredProducts.map(p => (
                                        <li key={p.id} className="flex gap-2 items-center border-b pb-2 justify-between group">
                                            <div className="flex gap-2 items-center">
                                                <img src={getImageUrl(p.image)} className="w-10 h-10 object-cover rounded" />
                                                <div>
                                                    <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                                                    <p className="text-xs text-gray-500">₹{p.price}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={`/admin/products/edit/${p.id}`} className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded">
                                                    <Edit size={14} />
                                                </Link>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            <p>Select a category to view products</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
