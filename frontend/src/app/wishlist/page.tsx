"use client";

import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Trash2, Heart } from "lucide-react";
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
                <div className="bg-white p-12 rounded-2xl shadow-sm text-center max-w-sm w-full border border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Heart className="w-8 h-8 text-slate-300" />
                    </div>
                    <h2 className="text-[14px] font-bold uppercase tracking-widest text-[#0B3D2E] mb-2">My Wishlist</h2>
                    <p className="text-slate-400 text-sm mb-6">You haven't saved any items yet.</p>
                    <Link href="/">
                        <button className="bg-[#0B3D2E] text-white px-8 py-2.5 font-bold rounded-sm uppercase text-[13px] tracking-wide hover:bg-[#145A3A] transition-all shadow-sm">
                            Shop Now
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-[1248px] font-sans">
            {/* Page Heading */}
            <div className="flex items-center gap-3 mb-8">
                <span className="w-1 h-6 bg-[#F59E0B] rounded-full"></span>
                <h1 className="text-[20px] font-bold text-[#0B3D2E] uppercase tracking-wide">
                    My Wishlist <span className="text-slate-400 font-normal text-[16px] lowercase">({items.length} items)</span>
                </h1>
            </div>

            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-100">
                {items.map((item) => (
                    <div key={item.id} className="relative group border-b border-slate-50 last:border-0">
                        <Link href={`/product/${item.id}`} className="flex p-5 gap-5 hover:bg-slate-50 transition-colors">
                            {/* Product Image */}
                            <div className="w-24 h-24 shrink-0 bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-center">
                                {item.image ? (
                                    <img src={item.image} alt={item.title} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center text-slate-300 text-xs">No Image</div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[15px] font-medium text-slate-800 mb-3 line-clamp-2 leading-snug">
                                    {item.title || "Product"}
                                </h3>

                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <span className="text-[20px] font-bold text-slate-900">
                                        ₹{(item.price || 0).toLocaleString()}
                                    </span>
                                    {item.originalPrice && Number(item.originalPrice) > (item.price || 0) && (
                                        <>
                                            <span className="text-[13px] text-slate-400 line-through">
                                                ₹{Number(item.originalPrice).toLocaleString()}
                                            </span>
                                            <span className="text-[13px] text-[#0B3D2E] font-bold bg-green-50 px-2 py-0.5 rounded">
                                                {item.discount || 0}% OFF
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Link>

                        {/* Remove Button */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                removeFromWishlist(item.id);
                            }}
                            className="absolute top-4 right-4 p-2 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Remove from wishlist"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
