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
    return `http://${window.location.hostname}:5001/api`;
  }
  return "http://localhost:5001/api";
};
const API_URL = getApiUrl();


export function WishlistProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [items, setItems] = useState<WishlistItem[]>([]);

    useEffect(() => {
        const fetchWishlist = async () => {
            if (!user?.id) {
                setItems([]);
                return;
            }

            try {
                // 1. Fetch Wishlist IDs from Server
                const res = await fetch(`${API_URL}/wishlist/${user.id}`);
                const wishlistIds: string[] = await res.json(); // Explicitly expect IDs

                if (!Array.isArray(wishlistIds) || wishlistIds.length === 0) {
                    setItems([]);
                    return;
                }

                // 2. Fetch All Products to hydrate details
                // (Optimization: In a real app, use an endpoint to fetch specific IDs, e.g. /products?ids=...)
                // For now, fetching all is safe given the scale.
                const prodRes = await fetch(`${API_URL}/products`);
                const allProducts: WishlistItem[] = await prodRes.json();

                // 3. Map IDs to Products
                const hydratedItems = allProducts.filter(p => wishlistIds.includes(p.id.toString()));
                setItems(hydratedItems);

            } catch (err) {
                console.error("Failed to sync wishlist", err);
                setItems([]);
            }
        };

        fetchWishlist();
    }, [user]);

    const addToWishlist = async (product: any) => {
        if (!user?.id) return;

        // Optimistically Update UI
        const newItem = {
            id: product.id.toString(),
            title: product.title,
            price: product.price,
            originalPrice: product.originalPrice,
            discount: product.discount,
            image: product.image
        };

        // Avoid duplicates
        if (!items.some(i => i.id === newItem.id)) {
            setItems(prev => [...prev, newItem]);
        }

        try {
            await fetch(`${API_URL}/wishlist/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: product.id }) // Send ID as expected by server
            });
        } catch (err) {
            console.error("Add to wishlist error", err);
            // Revert on error? For now, keep it simple.
        }
    };

    const removeFromWishlist = async (itemId: number | string) => {
        if (!user?.id) return;
        const idStr = itemId.toString();

        // Optimistically Update UI
        setItems(prev => prev.filter(i => i.id !== idStr));

        try {
            await fetch(`${API_URL}/wishlist/${user.id}/${itemId}`, {
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
