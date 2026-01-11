"use client";

import { ChevronDown, Star } from "lucide-react";
import { useState } from "react";

export default function SidebarFilter() {
    const [priceRange, setPriceRange] = useState(25000);

    return (
        <div className="bg-white shadow-sm h-full hidden lg:block mr-2 w-[280px] flex-shrink-0">
            <div className="p-4 border-b border-gray-100">
                <h2 className="text-[18px] font-medium mb-1">Filters</h2>
            </div>

            {/* Categories */}
            <div className="p-4 border-b border-gray-100">
                <div className="text-[12px] font-medium text-gray-500 uppercase mb-2">Categories</div>
                <ul className="text-[14px] text-gray-700 space-y-2 pl-4">
                    <li className="font-semibold text-black -ml-4">Mobiles & Accessories</li>
                    <li className="cursor-pointer hover:text-blue-500">Mobiles</li>
                    <li className="cursor-pointer hover:text-blue-500">Power Banks</li>
                    <li className="cursor-pointer hover:text-blue-500">Cases & Covers</li>
                </ul>
            </div>

            {/* Price */}
            <div className="p-4 border-b border-gray-100">
                <div className="text-[13px] font-medium uppercase mb-4">Price</div>
                <div className="h-6 bg-gray-200 relative mb-4">
                    <div className="absolute left-0 top-0 h-full bg-[#22c55e]" style={{ width: '60%' }}></div>
                    <div className="absolute right-0 top-0 h-6 w-6 bg-white border shadow rounded-full -mt-0 cursor-pointer" style={{ left: '60%' }}></div>
                </div>
                <div className="flex justify-between text-[14px]">
                    <select className="border p-1 rounded"><option>Min</option></select>
                    <span className="text-gray-400">to</span>
                    <select className="border p-1 rounded"><option>30000+</option></select>
                </div>
            </div>

            {/* Brand */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between cursor-pointer">
                    <div className="text-[13px] font-medium uppercase">Brand</div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 text-[14px] cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                        <span>Apple</span>
                    </label>
                    <label className="flex items-center gap-2 text-[14px] cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                        <span>Samsung</span>
                    </label>
                    <label className="flex items-center gap-2 text-[14px] cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                        <span>Xiaomi</span>
                    </label>
                    <label className="flex items-center gap-2 text-[14px] cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                        <span>Realme</span>
                    </label>
                </div>
            </div>

            {/* Customer Rating */}
            <div className="p-4 border-b border-gray-100">
                <div className="text-[13px] font-medium uppercase mb-3">Customer Ratings</div>
                <div className="space-y-2">
                    {[4, 3, 2].map((r) => (
                        <label key={r} className="flex items-center gap-2 text-[14px] cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                            <span className="flex items-center gap-1">{r} <Star className="w-3 h-3 fill-black" /> & above</span>
                        </label>
                    ))}
                </div>
            </div>

        </div>
    );
}
