"use client";

import { useWishlist } from "@/context/WishlistContext";
import Image from "next/image";
import { Trash2, Heart } from "lucide-react";
import Link from "next/link";

export default function WishlistSection() {
    const { items, removeFromWishlist } = useWishlist();

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <Heart className="w-5 h-5 text-emerald-600" />
                    My Wishlist ({items.length})
                </h2>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    <p className="mb-4">Your wishlist is empty.</p>
                    <Link href="/">
                        <button className="text-emerald-600 font-bold hover:underline">
                            Start Shopping
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="relative group">
                            <Link href={`/product/${item.id}`} className="block p-4 border border-slate-100 rounded-lg flex gap-4 hover:shadow-md transition-shadow">
                                <div className="relative w-20 h-20 shrink-0">
                                    <Image src={item.image} alt={item.title} fill className="object-contain" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{item.title}</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                                            4.5 ★
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-slate-900">₹{item.price.toLocaleString()}</span>
                                        {item.originalPrice && (
                                            <span className="text-xs text-slate-400 line-through">₹{item.originalPrice.toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                            <button
                                onClick={(e) => {
                                    e.preventDefault(); // Prevent navigation when clicking remove
                                    removeFromWishlist(item.id);
                                }}
                                className="text-slate-300 hover:text-red-500 p-2 rounded-full absolute top-2 right-2 transition-colors z-10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
