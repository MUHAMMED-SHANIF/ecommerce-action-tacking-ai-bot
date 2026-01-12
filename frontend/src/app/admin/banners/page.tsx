'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Plus, Info, Settings, Upload, Edit } from 'lucide-react';

interface Banner {
    id: string;
    title: string;
    image: string;
    actionType: string;
    targetId: string;
    active: boolean;
    duration?: number;
}

interface BannerSettings {
    autoPlay: boolean;
    showCarousel: boolean;
}

export default function AdminBanners() {
    const { user } = useAuth();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [settings, setSettings] = useState<BannerSettings>({ autoPlay: true, showCarousel: true });

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const [actionType, setActionType] = useState('none');
    const [targetId, setTargetId] = useState('');
    const [duration, setDuration] = useState(5);

    const [editingId, setEditingId] = useState<string | null>(null);

    // Options for Actions
    const [products, setProducts] = useState<{ id: string, title: string }[]>([]);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);

    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchBannersAndSettings();
            fetchOptions();
        }
    }, [user]);

    const fetchBannersAndSettings = async () => {
        const res = await fetch('http://localhost:5001/api/banners');
        const data = await res.json();
        setBanners(data.banners);
        setSettings(data.config || { autoPlay: true, showCarousel: true });
    };

    const fetchOptions = async () => {
        const pRes = await fetch('http://localhost:5001/api/products');
        setProducts(await pRes.json());

        const cRes = await fetch('http://localhost:5001/api/admin/categories');
        setCategories(await cRes.json());
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleEdit = (banner: Banner) => {
        setEditingId(banner.id);
        setNewTitle(banner.title);
        setActionType(banner.actionType);
        setTargetId(banner.targetId);
        setDuration(banner.duration || 5);
        setImagePreview(getImageUrl(banner.image));
        // We don't set selectedFile here, user only sets if they want to change it.
        // But we need a way to track if we keep old image.
        // logic below in handleSave will handle "if selectedFile, upload, else use old".
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewTitle('');
        setSelectedFile(null);
        setImagePreview('');
        setActionType('none');
        setTargetId('');
        setDuration(5);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) {
            alert("Title is required");
            return;
        }

        // For Create: Image is required. For Edit: Optional (keep existing)
        if (!editingId && !selectedFile) {
            alert("Image is required for new banner");
            return;
        }

        setUploading(true);
        try {
            let finalImageUrl = imagePreview; // Default to current preview (which might be old URL)

            // 1. Upload Image (if new file selected)
            if (selectedFile) {
                const formData = new FormData();
                formData.append('image', selectedFile);

                const uploadRes = await fetch('http://localhost:5001/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) throw new Error("Image upload failed");
                const { imageUrl } = await uploadRes.json();
                finalImageUrl = imageUrl;
            } else if (editingId) {
                // Keep existing image logic is handled by backend usually, OR we send the old string back.
                // In my server.js PUT logic, it merges fields.
                // I need to ensure if I don't send image, it keeps old.
                // But my viewer shows I'm constructing `bannerData` with `image: imageUrl`.
                // If I am editing and didn't upload new, `imagePreview` holds the old URL.
                // However, `getImageUrl` returns full localhost path for display but server stores relative.
                // I need to be careful. The `banner.image` from API is relative.
                // Let's rely on `banners.find` to get clean relative path if NO new file?
                // Or easier:
                if (!selectedFile && editingId) {
                    const original = banners.find(b => b.id === editingId);
                    if (original) finalImageUrl = original.image;
                }
            }

            // 2. Create/Update Banner
            const bannerData = {
                title: newTitle,
                image: finalImageUrl,
                actionType,
                targetId,
                active: true,
                duration: Number(duration) || 5
            };

            const url = editingId
                ? `http://localhost:5001/api/admin/banners/${editingId}`
                : 'http://localhost:5001/api/admin/banners';

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user!.id
                },
                body: JSON.stringify(bannerData)
            });

            if (res.ok) {
                handleCancelEdit();
                fetchBannersAndSettings();
            } else {
                alert(`Failed to ${editingId ? 'update' : 'add'} banner`);
            }
        } catch (error) {
            console.error(error);
            alert("Error saving banner");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this banner?')) return;
        const res = await fetch(`http://localhost:5001/api/admin/banners/${id}`, {
            method: 'DELETE',
            headers: { 'x-user-id': user!.id }
        });
        if (res.ok) fetchBannersAndSettings();
    };

    const saveSettings = async () => {
        const res = await fetch('http://localhost:5001/api/admin/banner-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id },
            body: JSON.stringify(settings)
        });
        if (res.ok) {
            alert('Settings Saved');
            setShowSettings(false);
        }
    };

    const getTargetName = (b: Banner) => {
        if (b.actionType === 'product') return products.find(p => p.id === b.targetId)?.title || 'Unknown Product';
        if (b.actionType === 'category') return categories.find(c => c.name === b.targetId || c.id === b.targetId)?.name || b.targetId;
        return 'No Action';
    };

    const getImageUrl = (img: string | undefined) => {
        if (!img) return 'https://placehold.co/128x128?text=No+Image';
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        return `http://localhost:5001${img}`;
    };

    return (
        <div className="text-black">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Banner Management</h1>
                <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-black">
                    <Settings size={18} /> Global Settings
                </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="bg-blue-50 p-4 rounded mb-6 border border-blue-200">
                    <h3 className="font-bold mb-3">Carousel Configuration</h3>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={settings.showCarousel}
                                onChange={e => setSettings({ ...settings, showCarousel: e.target.checked })}
                                className="w-5 h-5 accent-blue-600"
                            />
                            <span>Enable Carousel Mode</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={settings.autoPlay}
                                onChange={e => setSettings({ ...settings, autoPlay: e.target.checked })}
                                className="w-5 h-5 accent-blue-600"
                            />
                            <span>Auto-Play / Circulate</span>
                        </label>
                        <button onClick={saveSettings} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 ml-auto">
                            Save Config
                        </button>
                    </div>
                </div>
            )}

            {/* Add/Edit Form */}
            <div className="bg-white p-6 rounded shadow mb-8">
                <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Banner' : 'Add New Banner'}</h2>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Banner Title (Reference)"
                            className="border px-3 py-2 rounded"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                        <div className="border px-3 py-2 rounded flex items-center gap-2 bg-gray-50">
                            <Upload size={18} />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="bg-transparent w-full"
                            />
                        </div>
                        {imagePreview && (
                            <div className="col-span-2 md:col-span-2">
                                <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded border" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Duration (seconds)</label>
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="border px-3 py-2 rounded w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select
                            className="border px-3 py-2 rounded"
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value)}
                        >
                            <option value="none">No Click Action</option>
                            <option value="product">Navigate to Product</option>
                            <option value="category">Navigate to Category</option>
                        </select>

                        {actionType !== 'none' && (
                            <select
                                className="border px-3 py-2 rounded md:col-span-2"
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                            >
                                <option value="">Select Target...</option>
                                {actionType === 'product' && products.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                                {actionType === 'category' && categories.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button disabled={uploading} type="submit" className={`bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-medium w-fit ${uploading ? 'opacity-50' : ''}`}>
                            {uploading ? 'Saving...' : (editingId ? 'Update Banner' : 'Upload & Create Banner')}
                        </button>
                        {editingId && (
                            <button type="button" onClick={handleCancelEdit} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 font-medium w-fit">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="bg-white rounded shadow bg-opacity-90">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="text-left p-4">Image</th>
                            <th className="text-left p-4">Title</th>
                            <th className="text-left p-4">Duration</th>
                            <th className="text-left p-4">Action</th>
                            <th className="text-right p-4">Controls</th>
                        </tr>
                    </thead>
                    <tbody>
                        {banners.map((banner) => (
                            <tr key={banner.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">
                                    <img
                                        src={getImageUrl(banner.image)}
                                        alt={banner.title || 'Banner'}
                                        className="h-16 w-32 object-cover rounded border"
                                    />
                                </td>
                                <td className="p-4 font-medium">{banner.title || 'Untitled'}</td>
                                <td className="p-4 text-sm text-gray-500">{banner.duration || 5}s</td>
                                <td className="p-4 text-sm text-gray-600">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${(banner.actionType || 'none') === 'none' ? 'bg-gray-100' : 'bg-blue-100 text-blue-700'}`}>
                                        {(banner.actionType || 'none').toUpperCase()}
                                    </span>
                                    {(banner.actionType || 'none') !== 'none' && (
                                        <div className="mt-1">{getTargetName(banner)}</div>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleEdit(banner)}
                                        className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded mr-2"
                                        title="Edit"
                                    >
                                        <Edit size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(banner.id)}
                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                                        title="Delete"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {banners.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    No banners created yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
