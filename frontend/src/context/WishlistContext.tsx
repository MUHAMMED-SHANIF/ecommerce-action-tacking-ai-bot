"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface WishlistItem {
    id: string; // Uniform ID type
    title: string;
    price: number;
    originalPrice: number;
    discount: number;
    image: string;
}

interface WishlistContextType {
    items: WishlistItem[];
    addToWishlist: (item: any) => Promise<void>;
    removeFromWishlist: (itemId: number | string) => Promise<void>;
    isInWishlist: (itemId: number | string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}`}/api`;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api`;
};
const API_URL = getApiUrl();


import { useToast } from "./ToastContext";

export function WishlistProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState<WishlistItem[]>([]);

    useEffect(() => {
        const fetchWishlist = async () => {
            if (user?.id) {
                try {
                    const res = await fetch(`${API_URL}/wishlist/${user.id}`);
                    const data = await res.json();
                    setItems(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error("Failed to sync wishlist", err);
                    setItems([]);
                }
            } else {
                setItems([]); // Clear on logout
            }
        };

        fetchWishlist();
    }, [user]);

    const addToWishlist = async (product: any) => {
        if (!user?.id) return;

        const newItem: WishlistItem = {
            id: (product.id || product._id).toString(),
            title: product.title || product.name,
            price: product.price,
            originalPrice: product.originalPrice || product.price,
            discount: product.discount || 0,
            image: product.image || product.image_url
        };

        if (!items.some(i => i.id === newItem.id)) {
            setItems(prev => [...prev, newItem]);
        }
        
        showToast(`Added to your wishlist!`);

        try {
            await fetch(`${API_URL}/wishlist/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: newItem.id })
            });
        } catch (err) {
            console.error("Add to wishlist error", err);
        }
    };

    const removeFromWishlist = async (itemId: number | string) => {
        if (!user?.id) return;
        const idStr = itemId.toString();

        setItems(prev => prev.filter(i => i.id !== idStr));

        try {
            await fetch(`${API_URL}/wishlist/${user.id}/${idStr}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error("Remove from wishlist error", err);
        }
    };

    const isInWishlist = (itemId: number | string) => {
        return items.some(i => i.id === itemId.toString());
    };

    return (
        <WishlistContext.Provider value={{ items, addToWishlist, removeFromWishlist, isInWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error("useWishlist must be used within a WishlistProvider");
    }
    return context;
}
