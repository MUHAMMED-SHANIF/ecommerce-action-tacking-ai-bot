"use client";

import { Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";

interface ProductCardProps {
    id: string;
    title: string;
    image: string;
    price: number;
    originalPrice: number;
    discount: number;
    offer?: string;
}

export default function ProductCard({ id, title, image, price, originalPrice, discount, offer }: ProductCardProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const safePrice = typeof price === 'number' ? price : 0;
    const safeOriginalPrice = typeof originalPrice === 'number' ? originalPrice : 0;
    const safeDiscount = typeof discount === 'number' ? discount : 0;

    // Strict Image Validation
    let displayImage = "https://placehold.co/400x400/png?text=No+Image";

    if (image && typeof image === 'string' && image.trim().length > 0) {
        const trimmed = image.trim();
        // Check for common valid patterns
        if (trimmed.startsWith('/') || trimmed.startsWith('http') || trimmed.startsWith('data:')) {
            displayImage = trimmed;
        }
    }

    const handleWishlistClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!user) {
            router.push("/login");
        } else {
            if (isInWishlist(id)) {
                await removeFromWishlist(id);
            } else {
                await addToWishlist({ id, title, image: displayImage, price: safePrice, originalPrice: safeOriginalPrice, discount: safeDiscount });
            }
        }
    };

    const isInList = isInWishlist(id);

    return (
        <div
            onClick={() => router.push(`/product/${id}`)}
            className="bg-white p-4 rounded-sm hover:shadow-lg transition-shadow duration-200 cursor-pointer min-w-[200px] border border-transparent hover:border-gray-200 relative group"
        >
            <div className="relative h-40 w-full mb-2">
                {/* Usage of standard img tag to allow external URLs without next.config.js changes */}
                <img src={displayImage} alt={title} className="w-full h-full object-contain" />
            </div>

            {/* Like Button - Always Visible */}
            <div
                className="absolute top-3 right-3 z-10"
                onClick={handleWishlistClick}
            >
                <Heart
                    className={`w-5 h-5 transition-colors ${isInList ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'}`}
                />
            </div>

            <div className="text-center">
                <h3 className="text-[14px] font-medium text-gray-800 truncate mb-1" title={title}>{title}</h3>

                <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="bg-[#388e3c] text-white text-[12px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        4.5 <span className="text-[10px]">★</span>
                    </span>
                    <span className="text-gray-500 text-xs">(1,234)</span>
                </div>

                <div className="flex items-center justify-center gap-2">
                    <span className="text-[16px] font-semibold text-black">₹{safePrice.toLocaleString()}</span>
                    <span className="text-[12px] text-gray-500 line-through">₹{safeOriginalPrice.toLocaleString()}</span>
                    <span className="text-[13px] text-[#388e3c] font-bold">{safeDiscount}% off</span>
                </div>

                {offer && (
                    <p className="text-[12px] text-gray-500 mt-1">{offer}</p>
                )}
            </div>
        </div>
    );
}
