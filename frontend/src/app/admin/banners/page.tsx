'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Info, Settings, Upload, Edit } from 'lucide-react';
import Link from 'next/link';

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
    const router = useRouter(); // Use router
    const [banners, setBanners] = useState<Banner[]>([]);
    const [settings, setSettings] = useState<BannerSettings>({ autoPlay: true, showCarousel: true });

    // Options for Actions (needed for display names? No, I can fetch or just show ID)
    // Actually, getTargetName uses products/categories. I should keep fetching them for display purposes.
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

        const headers: HeadersInit = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};
        const cRes = await fetch('http://localhost:5001/api/admin/categories', { headers });
        setCategories(await cRes.json());
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this banner?')) return;
        const res = await fetch(`http://localhost:5001/api/admin/banners/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        if (res.ok) fetchBannersAndSettings();
    };

    const saveSettings = async () => {
        const res = await fetch('http://localhost:5001/api/admin/banner-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
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
                <div className="flex gap-3">
                    <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-black">
                        <Settings size={18} /> Global Settings
                    </button>
                    <Link href="/admin/banners/add">
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <Plus size={18} /> Add Banner
                        </button>
                    </Link>
                </div>
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
                                    <Link href={`/admin/banners/edit/${banner.id}`}>
                                        <button
                                            className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded mr-2"
                                            title="Edit"
                                        >
                                            <Edit size={20} />
                                        </button>
                                    </Link>
                                    <button
                                        onClick={(e) => handleDelete(banner.id, e)}
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
                                <td colSpan={5} className="p-8 text-center text-gray-500">
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
