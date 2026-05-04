"use client";

import { useState } from "react";
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
    brand?: string;
}

export default function ProductCard({ id, title, image, price, originalPrice, discount, offer, brand }: ProductCardProps) {
    const { user } = useAuth();
    const router = useRouter();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const safePrice = Number(price) || 0;
    const safeDiscount = Number(discount) || 0;
    // Compute originalPrice from price & discount if not provided
    let safeOriginalPrice = Number(originalPrice) || 0;
    if (safeOriginalPrice === 0 && safeDiscount > 0 && safePrice > 0) {
        safeOriginalPrice = Math.round(safePrice / (1 - safeDiscount / 100));
    }

    // Strict Image Validation
    let displayImage = "https://placehold.co/400x400/png?text=No+Image";
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

    // Accept any non-empty string as a potential image URL
    if (image && typeof image === 'string' && image.trim().length > 0) {
        const trimmed = image.trim();
        if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('//')) {
            displayImage = trimmed;
        } else if (trimmed.startsWith('/')) {
            displayImage = `${API}${trimmed}`;
        } else {
            // Could be a relative path or other format — try it anyway
            displayImage = trimmed;
        }
    }

    const [isAnimating, setIsAnimating] = useState(false);

    const handleCardClick = () => {
        setIsAnimating(true);
        // Wait for 500ms animation to visually complete, then route
        setTimeout(() => {
            router.push(`/product/${id}`);
            // State resets when route changes, but give it a moment
            setTimeout(() => setIsAnimating(false), 200);
        }, 500);
    };

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
            onClick={handleCardClick}
            className={`bg-white p-4 rounded-[24px] transition-all duration-500 cursor-pointer min-w-[200px] border border-transparent hover:border-gray-200 relative group shadow-sm
                ${isAnimating 
                    ? 'z-50 shadow-2xl scale-[1.15] opacity-0 blur-[2px] pointer-events-none' 
                    : 'hover:shadow-md hover:-translate-y-1'
                }
            `}
            style={{ 
                perspective: '1000px',
                transformStyle: 'preserve-3d'
            }}
        >
            <div 
                className={`relative h-44 w-full mb-2 transition-transform duration-500
                    ${isAnimating ? 'scale-[0.85] -translate-z-10' : 'group-hover:scale-105'}
                `}
            >
                {/* Usage of standard img tag to allow external URLs without next.config.js changes */}
                <img
                    src={displayImage}
                    alt={title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/400x400/png?text=No+Image";
                    }}
                />
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

            <div className="text-center mt-3">
                {brand && (
                    <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{brand}</p>
                )}
                <h3 className="text-[15px] font-medium text-gray-800 truncate mb-2" title={title}>{title}</h3>

                {safeDiscount > 0 && (
                    <p className="text-[14px] text-[#0B3D2E] font-bold mb-1">{safeDiscount}% OFF</p>
                )}

                <div className="flex items-baseline justify-center gap-2">
                    {safeOriginalPrice > 0 && safeOriginalPrice !== safePrice && (
                        <span className="text-[13px] text-gray-400 line-through">₹{safeOriginalPrice.toLocaleString()}</span>
                    )}
                    <span className="text-[18px] font-bold text-black">₹{safePrice.toLocaleString()}</span>
                </div>

                {offer && (
                    <p className="text-[11px] text-gray-500 mt-1.5">{offer}</p>
                )}
            </div>
        </div>
    );
}
