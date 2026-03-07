'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ProductFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function ProductForm({ initialData, isEdit = false }: ProductFormProps) {
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        originalPrice: '', // MRP
        discount: '',      // Percentage
        price: '',         // Selling Price
        category: '',      // Selected Category Name
        categoryId: '',    // Selected Category ID
        description: '',
        image: '',         // Main Image
        images: [''],      // Array of images
        brand: '',
        countInStock: '',
        supplier: '',      // Selected Supplier Name
        supplierId: '',    // Selected Supplier ID
        tags: [] as string[],
        tagInput: ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                originalPrice: initialData.originalPrice || '',
                discount: initialData.discount || '',
                price: initialData.price || '',
                category: initialData.category || '',
                categoryId: initialData.categoryId || '',
                description: initialData.description || '',
                image: initialData.image || '',
                images: initialData.images && initialData.images.length > 0 ? initialData.images : [initialData.image || ''],
                brand: initialData.brand || '',
                countInStock: initialData.countInStock || '',
                supplier: initialData.supplier || '',
                supplierId: initialData.supplierId || initialData.sellerId || '',
                tags: initialData.tags || [],
                tagInput: ''
            });
        }
    }, [initialData]);

    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, initialData]); // depend on user

    const fetchData = async () => {
        try {
            // content...

            const cRes = await fetch("http://localhost:5001/api/admin/categories");
            const cData = await cRes.json();
            setCategories(Array.isArray(cData) ? cData : []);

            if (user?.role === 'admin') {
                try {
                    const sRes = await fetch("http://localhost:5001/api/admin/sellers", { headers: { 'Authorization': `Bearer ${user?.token}` } });
                    const sData = await sRes.json();
                    setSuppliers(Array.isArray(sData) ? sData : []);
                } catch (err) {
                    console.error("Failed to fetch suppliers", err);
                    setSuppliers([]);
                }
            } else if (user?.role === 'seller') {
                // Auto-set supplier for seller
                setFormData(prev => ({
                    ...prev,
                    supplier: user?.name || '',
                    supplierId: user?.id || ''
                }));
            }
        } catch (err) {
            console.error("Failed to fetch dropdown data", err);
            setCategories([]);
        }
    };

    // Auto-Calculate Price
    useEffect(() => {
        const mrp = Number(formData.originalPrice);
        const disc = Number(formData.discount);

        if (mrp > 0 && disc >= 0) {
            const sellingPrice = mrp - (mrp * (disc / 100));
            setFormData(prev => ({ ...prev, price: Math.round(sellingPrice).toString() }));
        }
    }, [formData.originalPrice, formData.discount]);

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const catId = e.target.value;
        const cat = categories.find(c => c.id === catId);
        if (cat) {
            setFormData(prev => ({ ...prev, category: cat.name, categoryId: cat.id }));
        }
    };

    const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const supId = e.target.value;
        const sup = suppliers.find(s => s.id === supId);
        if (sup) {
            setFormData(prev => ({ ...prev, supplier: sup.name, supplierId: sup.id }));
        }
    };

    // Image Handlers
    const handleImageChange = (index: number, val: string) => {
        const newImages = [...formData.images];
        newImages[index] = val;
        setFormData(prev => ({ ...prev, images: newImages, image: index === 0 ? val : prev.image }));
    };

    const addImageField = () => {
        setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
    };

    const removeImageField = (index: number) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, images: newImages, image: index === 0 ? (newImages[0] || '') : prev.image }));
    };

    const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formDataPayload = new FormData();
        formDataPayload.append('image', file);

        try {
            setLoading(true);
            const res = await fetch("http://localhost:5001/api/upload", {
                method: 'POST',
                body: formDataPayload
            });

            if (res.ok) {
                const data = await res.json();
                handleImageChange(index, data.imageUrl);
            } else {
                const err = await res.json();
                alert(`Upload failed: ${err.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Error uploading image");
        } finally {
            setLoading(false);
        }
    };


    // Tag Handlers
    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = formData.tagInput;
            if (val.trim()) {
                const newTags = val.split(',')
                    .map(t => t.trim())
                    .filter(t => t !== '');

                setFormData(prev => {
                    const updatedTags = [...prev.tags];
                    newTags.forEach(tag => {
                        if (!updatedTags.includes(tag)) {
                            updatedTags.push(tag);
                        }
                    });
                    return {
                        ...prev,
                        tags: updatedTags,
                        tagInput: ''
                    };
                });
            } else {
                setFormData(prev => ({ ...prev, tagInput: '' }));
            }
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tagToRemove)
        }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert("User session not found. Please log in again.");
            return;
        }

        setLoading(true);

        const url = isEdit
            ? `http://localhost:5001/api/admin/products/${initialData.id}`
            : 'http://localhost:5001/api/admin/products';

        const method = isEdit ? 'PUT' : 'POST';

        // Filter empty images
        const cleanImages = formData.images.filter(img => img.trim() !== '');

        const payload = {
            ...formData,
            images: cleanImages,
            image: cleanImages[0] || formData.image, // Ensure main image is set
            tags: formData.tags
        };

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (user.role === 'seller') {
                    router.push('/seller/products');
                } else {
                    router.push('/admin/products');
                }
            } else {
                const err = await res.json();
                alert(`Failed to save product: ${err.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error saving product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Product Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g., iPhone 14 Pro Max"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">MRP (Original Price)</label>
                            <input
                                type="number"
                                required
                                value={formData.originalPrice}
                                onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                                className="w-full px-3 py-2 border rounded bg-white"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount (%)</label>
                            <input
                                type="number"
                                required
                                value={formData.discount}
                                onChange={e => setFormData({ ...formData, discount: e.target.value })}
                                className="w-full px-3 py-2 border rounded bg-white"
                                placeholder="0"
                            />
                        </div>

                        <div className="col-span-2 mt-2 pt-2 border-t border-gray-300 flex justify-between items-center">
                            <span className="text-sm text-gray-600 font-medium">Selling Price:</span>
                            <div className="flex items-baseline gap-2">
                                {formData.originalPrice && <span className="text-sm text-gray-400 line-through">₹{Number(formData.originalPrice).toLocaleString()}</span>}
                                <span className="text-xl font-bold text-green-600">₹{Number(formData.price).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                            <select
                                required
                                value={formData.categoryId || ''}
                                onChange={handleCategoryChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        {/* Show Supplier Dropdown ONLY for Admins */}
                        {user?.role === 'admin' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier</label>
                                <select
                                    required
                                    value={formData.supplierId || ''}
                                    onChange={handleSupplierChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Brand</label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Quantity</label>
                            <input
                                type="number"
                                required
                                value={formData.countInStock}
                                onChange={e => setFormData({ ...formData, countInStock: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Tags Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Tags / Keywords</label>
                        <div className="border rounded-lg p-2 bg-white flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                            {formData.tags.map((tag, idx) => (
                                <span key={idx} className="bg-blue-100 text-blue-700 text-sm px-2 py-1 rounded-md flex items-center gap-1">
                                    #{tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900">×</button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={formData.tagInput}
                                onChange={e => setFormData({ ...formData, tagInput: e.target.value })}
                                onKeyDown={handleAddTag}
                                placeholder="Type and press Enter..."
                                className="flex-1 min-w-[120px] outline-none text-sm py-1"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Press Enter or Comma to add tags. Used for search.</p>
                    </div>
                </div>

                {/* Right Column: Images & Description */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                            <span>Product Images</span>
                            <button type="button" onClick={addImageField} className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                                <Plus size={14} /> Add Another
                            </button>
                        </label>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {formData.images.map((img, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={img}
                                                onChange={e => handleImageChange(index, e.target.value)}
                                                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Image URL..."
                                            />
                                            <span className="text-gray-400 text-sm font-medium">OR</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(index, e)}
                                                className="text-sm border border-gray-300 rounded p-1.5 focus:outline-none"
                                            />
                                        </div>
                                        {img && <img src={img.startsWith('http') || img.startsWith('data:') ? img : `http://localhost:5001${img}`} alt="Preview" className="h-20 mt-1 object-contain rounded border bg-gray-50" />}
                                    </div>
                                    {formData.images.length > 1 && (
                                        <button type="button" onClick={() => removeImageField(index)} className="p-2 text-gray-400 hover:text-red-500 mt-1">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-md transition-transform active:scale-95"
                >
                    {loading ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
                </button>
            </div>
        </form >
    );
}
