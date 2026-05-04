"use client";

import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
    const { user } = useAuth();
    const { items, removeFromWishlist } = useWishlist();
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.push("/login");
        }
    }, [user, router]);

    if (!user) return null;

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center">
                <div className="bg-white p-10 rounded shadow-sm text-center">
                    <h2 className="text-xl font-medium mb-4">My Wishlist</h2>
                    <p className="text-gray-500 mb-6">You haven't added any items to your wishlist yet!</p>
                    <Link href="/">
                        <button className="bg-[#2874f0] text-white px-6 py-2 font-medium rounded shadow-sm">
                            Shop Now
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-[1248px] font-sans">
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-[#0B3D2E] mb-8 flex items-center gap-3">
                <span className="w-8 h-[2px] bg-[#F59E0B]"></span>
                MY WISHLIST ({items.length})
            </h2>
            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-100">
                {items.map((item) => (
                    <div key={item.id} className="relative group">
                        <Link href={`/product/${item.id}`} className="block p-6 border-b border-gray-100 flex gap-6 hover:bg-slate-50 transition-colors">
                            <div className="relative w-28 h-28 shrink-0 bg-white p-2 rounded-lg border border-slate-50">
                                <img src={item.image} alt={item.title} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[16px] font-medium text-slate-800 mb-2 truncate max-w-2xl">{item.title}</h3>

                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-[#0B3D2E] text-white text-[12px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                        {item.rating || '4.5'} <span className="text-[10px]">★</span>
                                    </span>
                                    <span className="text-slate-400 text-xs">({item.numReviews || '1,234'})</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-[18px] font-bold text-slate-900">₹{(item.price || 0).toLocaleString()}</span>
                                    {item.originalPrice && Number(item.originalPrice) > item.price && (
                                        <>
                                            <span className="text-[14px] text-slate-400 line-through">₹{Number(item.originalPrice).toLocaleString()}</span>
                                            <span className="text-[14px] text-[#0B3D2E] font-bold uppercase">{item.discount || 0}% OFF</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Link>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                removeFromWishlist(item.id);
                            }}
                            className="text-gray-400 hover:text-red-500 hover:bg-gray-100 p-2 rounded-full absolute top-4 right-4 z-10"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
