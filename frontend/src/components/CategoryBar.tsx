"use client";

import Image from "next/image";
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
        const fetchLayout = async () => {
            try {
                const res = await fetch("http://localhost:5001/api/home-layout");
                const data = await res.json();

                if (data.navbar && Array.isArray(data.navbar) && data.navbar.length > 0) {
                    // Map navbar string items to objects with images
                    // ideally we should fetch images too, but for now we'll generate placeholder or map if we have details
                    // The admin config just saves "category name". 

                    const newCats = data.navbar.map((item: any) => ({
                        name: item.category,
                        img: `https://placehold.co/128x128/png?text=${encodeURIComponent(item.category)}`
                    }));

                    // If less than 3, fallback logic as requested? 
                    // User said: "if there is less that 3 catgery then show what have dont crash the page"
                    // So we just show what we have.

                    setCategories(newCats);
                }
            } catch (err) {
                console.error("Failed to load nav layout", err);
            }
        };
        fetchLayout();
    }, []);

    if (categories.length === 0) return null;

    return (
        <div className="bg-white shadow-sm border-b border-gray-200 py-3">
            <div className="container mx-auto px-4 max-w-[1248px] overflow-x-auto no-scrollbar">
                <div className="flex justify-between min-w-[300px] md:min-w-0">
                    {categories.map((cat, idx) => (
                        <Link href={`/category/${encodeURIComponent(cat.name)}`} key={idx} className="flex flex-col items-center gap-1 group cursor-pointer hover:text-[#22c55e] min-w-[80px]">
                            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-50">
                                <Image
                                    src={cat.img}
                                    alt={cat.name}
                                    fill
                                    className="object-contain hover:scale-105 transition-transform duration-200"
                                />
                            </div>
                            <span className="text-[14px] font-medium text-gray-800 group-hover:text-[#22c55e] text-center w-full truncate px-1">
                                {cat.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
