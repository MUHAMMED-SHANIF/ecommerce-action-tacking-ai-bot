'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';

interface CategoryFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function CategoryForm({ initialData, isEdit = false }: CategoryFormProps) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setImage(initialData.image || '');
        }
    }, [initialData]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
                setImage(data.imageUrl);
            }
        } catch (error) {
            console.error('Upload failed', error);
            alert('Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        const url = isEdit
            ? `http://localhost:5001/api/admin/categories/${initialData.id}`
            : 'http://localhost:5001/api/admin/categories';

        const method = isEdit ? 'PUT' : 'POST';

        const payload = {
            name,
            image,
            isApproved: true // Admin actions are auto-approved
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
                router.push('/admin/categories');
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Failed to save category: ${errData.error || 'Unknown server error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error saving category');
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (img: string) => {
        if (!img) return '';
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        return `http://localhost:5001${img}`;
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
                {isEdit ? 'Edit Category' : 'Add New Category'}
            </h2>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g., Electronics"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category Image</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {uploading ? (
                            <div className="text-sm text-blue-600">Uploading...</div>
                        ) : image ? (
                            <div className="relative">
                                <img src={getImageUrl(image)} alt="Preview" className="h-40 object-contain rounded" />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setImage('');
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                                <p className="text-sm font-medium">Click to upload image</p>
                                <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
                            </div>
                        )}
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
                    disabled={loading || uploading || !name}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-md transition-transform active:scale-95"
                >
                    {loading ? 'Saving...' : (isEdit ? 'Update Category' : 'Create Category')}
                </button>
            </div>
        </form>
    );
}
