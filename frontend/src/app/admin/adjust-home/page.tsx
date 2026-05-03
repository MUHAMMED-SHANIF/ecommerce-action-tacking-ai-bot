"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";

interface NavbarItem {
    id: string;
    category: string;
}

interface HomeSection {
    id: string;
    title: string;
    category: string;
}

export default function AdjustHomePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);

    // Config State
    const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);
    const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            router.push("/login"); // Or admin login
            return;
        }

        const fetchAll = async () => {
            try {
                // 1. Fetch Categories for dropdowns
                const catRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/categories`, {
                    headers: user?.token ? { 'Authorization': `Bearer ${user.token}` } : {}
                });
                const catData = await catRes.json();
                setCategories(Array.isArray(catData) ? catData : []);

                // 2. Fetch Current Layout
                const layoutRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/home-layout`, {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                const layoutData = await layoutRes.json();

                // Initialize Navbar (ensure min 3)
                let initialNav = layoutData.navbar || [];
                // If empty or less than 3, might want to prepopulate or let user add? 
                // User requirement: "3-8 need to select"

                setNavbarItems(initialNav);
                setHomeSections(layoutData.sections || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [user]);

    const saveLayout = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/home-layout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({
                    navbar: navbarItems,
                    sections: homeSections
                })
            });
            if (res.ok) {
                alert("Home Layout Saved Successfully!");
            } else {
                alert("Failed to save.");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving.");
        }
    };

    // --- Navbar Handlers ---
    const addNavbarItem = () => {
        if (navbarItems.length >= 8) return alert("Maximum 8 items allowed");
        setNavbarItems([...navbarItems, { id: Date.now().toString(), category: "" }]);
    };

    const removeNavbarItem = (index: number) => {
        if (navbarItems.length <= 3) return alert("Minimum 3 items required");
        const newItems = navbarItems.filter((_, i) => i !== index);
        setNavbarItems(newItems);
    };

    const updateNavbarItem = (index: number, val: string) => {
        const newItems = [...navbarItems];
        newItems[index].category = val;
        setNavbarItems(newItems);
    };

    // --- Section Handlers ---
    const addSection = () => {
        setHomeSections([...homeSections, { id: Date.now().toString(), title: "", category: "" }]);
    };

    const removeSection = (index: number) => {
        const newSecs = homeSections.filter((_, i) => i !== index);
        setHomeSections(newSecs);
    };

    const updateSection = (index: number, field: keyof HomeSection, val: string) => {
        const newSecs = [...homeSections];
        newSecs[index] = { ...newSecs[index], [field]: val };
        setHomeSections(newSecs);
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto pb-20">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Adjust Home Page</h1>

            {/* Navbar Configuration */}
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
                    Navbar Navigation (3-8 Items)
                    <button onClick={addNavbarItem} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                        <Plus size={16} /> Add Position
                    </button>
                </h2>
                <div className="space-y-3">
                    {navbarItems.map((item, index) => (
                        <div key={index} className="flex gap-4 items-center bg-gray-50 p-3 rounded border">
                            <span className="font-bold text-gray-400 w-8 text-center">{index + 1}</span>
                            <div className="flex-1">
                                <select
                                    value={item.category}
                                    onChange={(e) => updateNavbarItem(index, e.target.value)}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="">Select Category to Show</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => removeNavbarItem(index)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded"
                                title="Remove Position"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {navbarItems.length === 0 && <div className="text-center text-gray-500 py-4">No navigation items set. Add some!</div>}
                </div>
            </div>

            {/* Home Sections Configuration */}
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
                    Custom Home Sections
                    <button onClick={addSection} className="text-sm bg-purple-50 text-purple-600 px-3 py-1 rounded hover:bg-purple-100 flex items-center gap-1">
                        <Plus size={16} /> Add Section
                    </button>
                </h2>
                <div className="space-y-4">
                    {homeSections.map((sec, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end bg-gray-50 p-4 rounded border">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Section Heading</label>
                                <input
                                    type="text"
                                    value={sec.title}
                                    onChange={(e) => updateSection(index, 'title', e.target.value)}
                                    placeholder="e.g. Best Mobiles"
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Source Category</label>
                                <select
                                    value={sec.category}
                                    onChange={(e) => updateSection(index, 'category', e.target.value)}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => removeSection(index)}
                                    className="text-red-600 bg-white border px-3 py-2 rounded hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 size={16} /> Remove
                                </button>
                            </div>
                        </div>
                    ))}
                    {homeSections.length === 0 && <div className="text-center text-gray-500 py-4">No custom sections. Add one to display products on home page.</div>}
                </div>
            </div>

            {/* Save Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50 flex justify-end px-10">
                <button
                    onClick={saveLayout}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700 flex items-center gap-2 shadow-md"
                >
                    <Save size={20} /> Save Changes
                </button>
            </div>
        </div>
    );
}
