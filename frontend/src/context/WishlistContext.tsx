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
    const { user, isLoading: authLoading } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState<WishlistItem[]>([]);

    useEffect(() => {
        if (authLoading) return;

        const fetchWishlist = async () => {
            if (user?.id) {
                try {
                    const res = await fetch(`${API_URL}/wishlist/${user.id}`);
                    const data = await res.json();
                    // Normalize: server may return full objects or plain ID strings
                    const normalized = (Array.isArray(data) ? data : []).map((entry: any) => {
                        if (typeof entry === 'string' || typeof entry === 'number') {
                            return { id: String(entry), title: '', price: 0, originalPrice: 0, discount: 0, image: '' };
                        }
                        return { ...entry, id: String(entry.id || entry.product_id || '') };
                    }).filter(e => e.id);
                    setItems(normalized);
                } catch (err) {
                    console.error("Failed to sync wishlist", err);
                }
            } else {
                setItems([]); // Clear on logout
            }
        };

        fetchWishlist();
    }, [user, authLoading]);

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

    const removeFromWishlist = async (itemId: number | string | undefined | null) => {
        if (!user?.id || itemId === undefined || itemId === null) return;
        const idStr = String(itemId);

        setItems(prev => prev.filter(i => i.id !== idStr));

        try {
            await fetch(`${API_URL}/wishlist/${user.id}/${idStr}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error("Remove from wishlist error", err);
        }
    };

    const isInWishlist = (itemId: number | string | undefined | null) => {
        if (itemId === undefined || itemId === null) return false;
        return items.some(i => i.id === String(itemId));
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
