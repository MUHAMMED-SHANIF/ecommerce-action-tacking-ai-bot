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
            <div className="min-h-screen bg-[#f1f2f4] flex items-center justify-center">
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
            <h2 className="text-[22px] font-medium mb-6">My Wishlist ({items.length})</h2>
            <div className="bg-white shadow-sm rounded-[2px] overflow-hidden">
                {items.map((item) => (
                    <div key={item.id} className="relative group">
                        <Link href={`/product/${item.id}`} className="block p-6 border-b border-gray-100 flex gap-6 hover:bg-gray-50 transition-colors">
                            <div className="relative w-28 h-28 shrink-0">
                                <Image src={item.image} alt={item.title} fill className="object-contain" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[16px] font-medium text-gray-800 mb-2 truncate max-w-2xl">{item.title}</h3>

                                <div className="flex items-center gap-3 mb-2">
                                    <span className="bg-[#388e3c] text-white text-[12px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                        4.5 <span className="text-[10px]">★</span>
                                    </span>
                                    <span className="text-gray-500 text-xs">(1,234)</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-[18px] font-semibold text-black">₹{item.price.toLocaleString()}</span>
                                    <span className="text-[14px] text-gray-500 line-through">₹{item.originalPrice.toLocaleString()}</span>
                                    <span className="text-[14px] text-[#388e3c] font-bold">{item.discount}% off</span>
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
