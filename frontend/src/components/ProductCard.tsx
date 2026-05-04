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
            className={`bg-white/60 backdrop-blur-md p-3.5 rounded-[24px] transition-all duration-500 cursor-pointer border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative group text-left flex flex-col h-full
                ${isAnimating 
                    ? 'z-50 shadow-2xl scale-[1.15] opacity-0 blur-[2px] pointer-events-none' 
                    : 'hover:-translate-y-1'
                }
            `}
            style={{ 
                perspective: '1000px',
                transformStyle: 'preserve-3d'
            }}
        >
            {/* Image Section */}
            <div className={`relative h-48 w-full mb-4 rounded-[18px] bg-[#f4f5f7] p-3 transition-colors duration-500 flex flex-col justify-between items-center group-hover:bg-[#ebedf0]`}>
                
                {/* Top Badges */}
                <div className="w-full flex justify-between items-start z-10">
                    <span className="bg-white/80 backdrop-blur-sm text-gray-600 text-[11px] font-medium px-3 py-1.5 rounded-full shadow-sm">
                        {offer || "Best Seller"}
                    </span>
                    <button 
                        onClick={handleWishlistClick} 
                        className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm hover:scale-110 transition-transform"
                    >
                        <Heart className={`w-4 h-4 ${isInList ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                    </button>
                </div>

                {/* Image */}
                <div className="w-full flex-1 relative my-2 flex items-center justify-center">
                    <img 
                        src={displayImage} 
                        alt={title} 
                        className={`max-w-full max-h-full object-contain drop-shadow-md ${isAnimating ? 'scale-[0.85]' : 'group-hover:scale-110 transition-transform duration-500'}`} 
                    />
                </div>

                {/* Dots */}
                <div className="flex gap-1.5 justify-center mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#059669]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d1d5db]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d1d5db]"></div>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-1 flex flex-col flex-1 justify-between">
                <div>
                    <p className="text-[#059669] text-[11px] font-medium mb-1">Premium</p>
                    <h3 className="text-[15px] font-bold text-gray-800 line-clamp-2 leading-snug mb-1" title={title}>{title}</h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                         <span className="text-[15px] text-gray-600 font-medium">₹{safePrice.toLocaleString()}</span>
                         {safeDiscount > 0 && <span className="text-[11px] text-gray-400 line-through">₹{safeOriginalPrice.toLocaleString()}</span>}
                    </div>
                </div>

                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        router.push(`/product/${id}`); 
                    }}
                    className="w-full bg-[#262626] text-white py-2.5 rounded-full mt-3 text-[13px] font-medium hover:bg-black transition-colors"
                >
                    Buy Now
                </button>
            </div>
        </div>
    );
}
