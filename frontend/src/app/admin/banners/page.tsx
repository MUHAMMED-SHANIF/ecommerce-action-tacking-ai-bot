'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Plus, Info, Settings, Upload } from 'lucide-react';

interface Banner {
    id: string;
    title: string;
    image: string;
    actionType: string;
    targetId: string;
    active: boolean;
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
    const [actionType, setActionType] = useState('none');
    const [targetId, setTargetId] = useState('');

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

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !selectedFile) {
            alert("Title and Image are required");
            return;
        }

        const formData = new FormData();
        formData.append('title', newTitle);
        formData.append('image', selectedFile);
        formData.append('actionType', actionType);
        formData.append('targetId', targetId);
        formData.append('active', 'true');

        const res = await fetch('http://localhost:5001/api/admin/banners', {
            method: 'POST',
            headers: { 'x-user-id': user!.id },
            body: formData
        });

        if (res.ok) {
            setNewTitle('');
            setSelectedFile(null);
            fetchBannersAndSettings();
        } else {
            alert("Failed to add banner");
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

    const getImageUrl = (img: string) => {
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

            {/* Add Form */}
            <div className="bg-white p-6 rounded shadow mb-8">
                <h2 className="text-lg font-bold mb-4">Add New Banner</h2>
                <form onSubmit={handleAdd} className="flex flex-col gap-4">
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
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                className="bg-transparent w-full"
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
                                    <option key={c.id} value={c.name}>{c.name}</option> // Store name for query param
                                ))}
                            </select>
                        )}
                    </div>

                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-medium w-fit">
                        Upload & Create Banner
                    </button>
                </form>
            </div>

            {/* List */}
            <div className="bg-white rounded shadow bg-opacity-90">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="text-left p-4">Image</th>
                            <th className="text-left p-4">Title</th>
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
                                        alt={banner.title}
                                        className="h-16 w-32 object-cover rounded border"
                                    />
                                </td>
                                <td className="p-4 font-medium">{banner.title}</td>
                                <td className="p-4 text-sm text-gray-600">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${banner.actionType === 'none' ? 'bg-gray-100' : 'bg-blue-100 text-blue-700'}`}>
                                        {banner.actionType.toUpperCase()}
                                    </span>
                                    {banner.actionType !== 'none' && (
                                        <div className="mt-1">{getTargetName(banner)}</div>
                                    )}
                                </td>
                                <td className="p-4 text-right">
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
