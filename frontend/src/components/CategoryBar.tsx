"use client";


import Link from "next/link";
import { useEffect, useState } from "react";

// Default Categories in case of API failure or empty config
const DEFAULT_CATEGORIES = [
    { name: "Mobiles", img: "https://placehold.co/128x128/png?text=Mobiles" },
    { name: "Fashion", img: "https://placehold.co/128x128/png?text=Fashion" },
    { name: "Electronics", img: "https://placehold.co/128x128/png?text=Electronics" },
    { name: "Appliances", img: "https://placehold.co/128x128/png?text=Appliances" },
];

export default function CategoryBar() {
    const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Layout (What to show)
                const lRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/home-layout`);
                if (!lRes.ok) throw new Error(`Layout fetch failed: ${lRes.status}`);
                const lData = await lRes.json();

                // Fetch Full Categories (Details including images)
                const cRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/categories`, { cache: 'no-store' });
                if (!cRes.ok) throw new Error(`Categories fetch failed: ${cRes.status}`);
                const cData = await cRes.json();
                const allCats = Array.isArray(cData) ? cData : [];

                if (lData.navbar && Array.isArray(lData.navbar) && lData.navbar.length > 0) {
                    const newCats = lData.navbar.map((item: any) => {
                        const catName = (item.category || "Unknown").trim();
                        
                        // Find matching category details (Case-Insensitive)
                        const details = allCats.find((c: any) => 
                            c.name.toLowerCase().trim() === catName.toLowerCase()
                        );

                        const safeName = typeof catName === 'string' ? catName : String(catName);

                        // Use the image from details, or fall back to placeholder
                        const rawImg = details?.image || details?.image_url;
                        const img = rawImg
                            ? getImageUrl(rawImg)
                            : `https://placehold.co/128x128/png?text=${encodeURIComponent(safeName.substring(0, 10))}`;

                        return {
                            name: safeName,
                            img: img
                        };
                    });
                    setCategories(newCats);
                }
            } catch (err) {
                console.error("Failed to load nav layout:", err);
            }
        };
        fetchData();
    }, []);

    const getImageUrl = (img: string) => {
        if (!img) return '';
        // If it's already a full URL (Supabase/External), return it
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        // Otherwise, it's a relative path from the backend
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        // Ensure no double slashes
        const cleanPath = img.startsWith('/') ? img : `/${img}`;
        return `${baseUrl}${cleanPath}`;
    };

    if (categories.length === 0) return null;

    return (
        <div className="bg-white shadow-sm border-b border-gray-100 py-3">
            <div className="container mx-auto px-4 max-w-[1024px] overflow-x-auto no-scrollbar">
                <div className="flex justify-between items-center min-w-[400px] md:min-w-0">
                    {categories.map((cat, idx) => (
                        <Link 
                            href={`/category/${encodeURIComponent(cat.name)}`} 
                            key={idx} 
                            className="flex flex-col items-center gap-2 group cursor-pointer min-w-[72px] transition-all"
                        >
                            <div className="relative w-14 h-14 rounded-full p-0.5 border-2 border-[#0B3D2E]/10 group-hover:border-[#F59E0B] transition-all duration-300 shadow-sm">
                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-50 border border-gray-100">
                                    <img
                                        src={cat.img}
                                        alt={cat.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-[#0B3D2E] uppercase tracking-widest group-hover:text-[#F59E0B] transition-colors text-center w-full truncate px-1">
                                {cat.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
