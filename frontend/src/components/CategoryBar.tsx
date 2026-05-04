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
                        // Defensive check
                        const catName = item.category || "Unknown";

                        // Find matching category details
                        const details = allCats.find((c: any) => c.name === catName);
                        // Safe substring
                        const safeName = typeof catName === 'string' ? catName : String(catName);

                        const img = details?.image
                            ? getImageUrl(details.image)
                            : `https://placehold.co/128x128/png?text=${encodeURIComponent(safeName.substring(0, 10))}`;

                        return {
                            name: safeName,
                            img: img
                        };
                    });
                    setCategories(newCats);
                }
            } catch (err) {
                console.error("Failed to load nav layout", err);
            }
        };
        fetchData();
    }, []);

    const getImageUrl = (img: string) => {
        if (!img) return '';
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${img}`;
    };

    if (categories.length === 0) return null;

    return (
        <div className="bg-white shadow-sm border-b border-gray-200 py-2">
            <div className="container mx-auto px-4 max-w-[960px] overflow-x-auto no-scrollbar">
                <div className="flex justify-between min-w-[300px] md:min-w-0">
                    {categories.map((cat, idx) => (
                        <Link href={`/category/${encodeURIComponent(cat.name)}`} key={idx} className="flex flex-col items-center gap-1 group cursor-pointer hover:text-[#F59E0B] min-w-[64px]">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-50 border border-gray-100 group-hover:border-[#F59E0B] transition-colors">
                                <img
                                    src={cat.img}
                                    alt={cat.name}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                />
                            </div>
                            <span className="text-[12px] font-medium text-gray-800 group-hover:text-[#F59E0B] text-center w-full truncate px-1">
                                {cat.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
