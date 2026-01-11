'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Edit, Save, Plus, X } from 'lucide-react';

interface Category {
    id: string;
    name: string;
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
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
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

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        const res = await fetch('http://localhost:5001/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
            body: JSON.stringify({ name: newCategory })
        });
        if (res.ok) {
            setNewCategory('');
            fetchCategories();
        } else {
            alert('Failed to add category');
        }
    };

    const handleUpdate = async (id: string) => {
        const res = await fetch(`http://localhost:5001/api/admin/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
            body: JSON.stringify({ name: editName })
        });
        if (res.ok) {
            setEditingId(null);
            fetchCategories();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this category?')) return;
        const res = await fetch(`http://localhost:5001/api/admin/categories/${id}`, {
            method: 'DELETE',
            headers: { 'x-user-id': user!.id }
        });
        if (res.ok) fetchCategories();
    };

    const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredProducts = selectedCategory ? products.filter(p => p.category === selectedCategory) : [];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Categories</h1>
                <input
                    type="text"
                    placeholder="Search categories..."
                    className="border px-3 py-2 rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white p-4 rounded shadow mb-6 flex gap-4">
                <input
                    type="text"
                    placeholder="New Category Name"
                    className="border px-3 py-2 rounded flex-1"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                />
                <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                    <Plus size={18} /> Add
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List */}
                <div className="bg-white rounded shadow text-black">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="text-left p-3">Name</th>
                                <th className="text-right p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map(cat => (
                                <tr key={cat.id} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedCategory === cat.name ? 'bg-blue-50' : ''}`} onClick={() => setSelectedCategory(cat.name)}>
                                    <td className="p-3">
                                        {editingId === cat.id ? (
                                            <input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="border px-2 py-1 rounded w-full"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            cat.name
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {editingId === cat.id ? (
                                            <button onClick={(e) => { e.stopPropagation(); handleUpdate(cat.id); }} className="text-green-600 mr-2"><Save size={18} /></button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); setEditingId(cat.id); setEditName(cat.name); }} className="text-blue-600 mr-2"><Edit size={18} /></button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }} className="text-red-600"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Info Panel */}
                <div className="bg-white rounded shadow p-4 text-black">
                    {selectedCategory ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Products in "{selectedCategory}"</h2>
                                <button onClick={() => setSelectedCategory(null)}><X /></button>
                            </div>
                            {filteredProducts.length === 0 ? (
                                <p className="text-gray-500">No products found in this category.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {filteredProducts.map(p => (
                                        <li key={p.id} className="flex gap-2 items-center border-b pb-2">
                                            <img src={p.image} className="w-10 h-10 object-cover rounded" />
                                            <div>
                                                <p className="font-medium text-sm">{p.title}</p>
                                                <p className="text-xs text-gray-500">${p.price}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <p className="text-gray-500 text-center mt-10">Select a category to see its products</p>
                    )}
                </div>
            </div>
        </div>
    );
}
