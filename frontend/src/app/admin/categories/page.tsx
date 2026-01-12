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
    const [newImage, setNewImage] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editImage, setEditImage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('http://localhost:5001/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.imageUrl) {
                if (isEdit) {
                    setEditImage(data.imageUrl);
                } else {
                    setNewImage(data.imageUrl);
                }
            }
        } catch (error) {
            console.error('Upload failed', error);
            alert('Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        const res = await fetch('http://localhost:5001/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
            body: JSON.stringify({ name: newCategory, image: newImage })
        });
        if (res.ok) {
            setNewCategory('');
            setNewImage('');
            fetchCategories();
        } else {
            alert('Failed to add category');
        }
    };

    const startEditing = (cat: any) => {
        setEditingId(cat.id);
        setEditName(cat.name);
        setEditImage(cat.image || '');
    };

    const handleUpdate = async (id: string) => {
        const res = await fetch(`http://localhost:5001/api/admin/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
            body: JSON.stringify({ name: editName, image: editImage })
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
                <input
                    type="text"
                    placeholder="Search categories..."
                    className="border px-3 py-2 rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Add New Category */}
            <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                    <input
                        type="text"
                        placeholder="New Category Name"
                        className="border px-3 py-2 rounded w-full"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Icon/Image</label>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, false)}
                            className="border px-3 py-1.5 rounded w-full text-sm bg-gray-50"
                        />
                        {newImage && <img src={getImageUrl(newImage)} className="h-9 w-9 object-cover rounded border" alt="Preview" />}
                    </div>
                </div>
                <button onClick={handleAdd} disabled={uploading || !newCategory} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                    <Plus size={18} /> Add
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List */}
                <div className="bg-white rounded shadow text-black">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="text-left p-3 w-16">Icon</th>
                                <th className="text-left p-3">Name</th>
                                <th className="text-right p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map(cat => (
                                <tr key={cat.id} className={`border-b hover:bg-gray-50 cursor-pointer ${selectedCategory === cat.name ? 'bg-blue-50' : ''}`} onClick={() => setSelectedCategory(cat.name)}>
                                    <td className="p-3">
                                        {editingId === cat.id ? (
                                            <div className="relative w-10 h-10">
                                                <input
                                                    type="file"
                                                    onChange={(e) => handleFileUpload(e, true)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    title="Change Image"
                                                />
                                                <img
                                                    src={editImage ? getImageUrl(editImage) : 'https://placehold.co/40'}
                                                    className="w-10 h-10 object-cover rounded border border-blue-400"
                                                />
                                            </div>
                                        ) : (
                                            <img
                                                src={
                                                    // use stored image, or generate placeholder if missing
                                                    // but wait, `cat` might not have `image` property if old data.
                                                    (cat as any).image ? getImageUrl((cat as any).image) : `https://placehold.co/128x128/png?text=${encodeURIComponent(cat.name.substring(0, 2))}`
                                                }
                                                className="w-10 h-10 object-cover rounded bg-gray-100"
                                                alt={cat.name}
                                            />
                                        )}
                                    </td>
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
                                            <button onClick={(e) => { e.stopPropagation(); handleUpdate(cat.id); }} disabled={uploading} className="text-green-600 mr-2"><Save size={18} /></button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); startEditing(cat); }} className="text-blue-600 mr-2"><Edit size={18} /></button>
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
                                        <li key={p.id} className="flex gap-2 items-center border-b pb-2 justify-between group">
                                            <div className="flex gap-2 items-center">
                                                <img src={getImageUrl(p.image)} className="w-10 h-10 object-cover rounded" />
                                                <div>
                                                    <p className="font-medium text-sm">{p.title}</p>
                                                    <p className="text-xs text-gray-500">${p.price}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a href={`/admin/products/edit/${p.id}`} className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded">
                                                    <Edit size={14} />
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Delete product "${p.title}"?`)) {
                                                            await fetch(`http://localhost:5001/api/admin/products/${p.id}`, {
                                                                method: 'DELETE',
                                                                headers: { 'x-user-id': user!.id }
                                                            });
                                                            fetchProducts();
                                                        }
                                                    }}
                                                    className="p-1 px-2 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
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
