"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

interface WishlistItem {
    id: string;
    title: string;
    price: number;
    originalPrice: number;
    discount: number;
    image: string;
}

interface WishlistContextType {
    items: WishlistItem[];
    addToWishlist: (item: any) => Promise<void>;
    removeFromWishlist: (itemId: number | string | undefined | null) => Promise<void>;
    isInWishlist: (itemId: number | string | undefined | null) => boolean;
    fetchWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api`;

export function WishlistProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState<WishlistItem[]>([]);
    const userRef = useRef<any>(null);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Load from server on login, clear on logout
    useEffect(() => {
        if (authLoading) return;

        if (!user?.id) {
            setItems([]);
            return;
        }

        const fetchWishlist = async () => {
            if (!user?.id) return;
            try {
                const res = await fetch(`${API_URL}/wishlist/${user.id}`);
                if (!res.ok) throw new Error("Wishlist fetch failed");
                const data = await res.json();

                // Normalize: server may return full objects or plain ID strings
                const normalized: WishlistItem[] = (Array.isArray(data) ? data : [])
                    .map((entry: any) => {
                        if (typeof entry === 'string' || typeof entry === 'number') {
                            return { id: String(entry), title: '', price: 0, originalPrice: 0, discount: 0, image: '' };
                        }
                        return {
                            id: String(entry.id || entry.product_id || ''),
                            title: entry.title || entry.name || '',
                            price: entry.price || 0,
                            originalPrice: entry.originalPrice || entry.price || 0,
                            discount: entry.discount || 0,
                            image: entry.image || entry.image_url || ''
                        };
                    })
                    .filter(e => e.id);

                // Re-fetch product details for any ghost items (missing image or title)
                const enriched = await Promise.all(normalized.map(async (item) => {
                    if (!item.image || !item.title) {
                        try {
                            const r = await fetch(`${API_URL}/products/${item.id}`);
                            if (r.ok) {
                                const p = await r.json();
                                return {
                                    id: item.id,
                                    title: p.title || p.name || item.title,
                                    price: p.price || item.price,
                                    originalPrice: p.originalPrice || p.price || item.originalPrice,
                                    discount: p.discount || item.discount,
                                    image: p.image || p.image_url || item.image
                                };
                            }
                        } catch { /* keep existing */ }
                    }
                    return item;
                }));

                setItems(enriched.filter(e => e.id));
            } catch (err) {
                console.error("[Wishlist] Load error:", err);
                setItems([]);
            }
        };

        fetchWishlist();
    }, [user?.id, authLoading]);

    const addToWishlist = async (product: any) => {
        if (!userRef.current?.id) return;

        const newItem: WishlistItem = {
            id: String(product.id || product._id || ''),
            title: product.title || product.name || '',
            price: product.price || 0,
            originalPrice: product.originalPrice || product.price || 0,
            discount: product.discount || 0,
            image: product.image || product.image_url || ''
        };

        if (!newItem.id) return;

        // Optimistic update
        setItems(prev => prev.some(i => i.id === newItem.id) ? prev : [...prev, newItem]);
        showToast(`Added to your wishlist!`);

        try {
            await fetch(`${API_URL}/wishlist/${userRef.current.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: newItem.id })
            });
        } catch (err) {
            console.error("[Wishlist] Add error:", err);
        }
    };

    const removeFromWishlist = async (itemId: number | string | undefined | null) => {
        if (!userRef.current?.id || itemId === undefined || itemId === null) return;
        const idStr = String(itemId);

        // Optimistic update
        setItems(prev => prev.filter(i => i.id !== idStr));

        try {
            await fetch(`${API_URL}/wishlist/${userRef.current.id}/${idStr}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error("[Wishlist] Remove error:", err);
        }
    };

    const isInWishlist = (itemId: number | string | undefined | null): boolean => {
        if (itemId === undefined || itemId === null) return false;
        return items.some(i => i.id === String(itemId));
    };

    const fetchWishlist = async () => {
        if (!userRef.current?.id) return;
        try {
            const res = await fetch(`${API_URL}/wishlist/${userRef.current.id}`);
            if (!res.ok) throw new Error("Wishlist fetch failed");
            const data = await res.json();
            const normalized: WishlistItem[] = (Array.isArray(data) ? data : [])
                .map((entry: any) => ({
                    id: String(entry.id || entry.product_id || ''),
                    title: entry.title || entry.name || '',
                    price: entry.price || 0,
                    originalPrice: entry.originalPrice || entry.price || 0,
                    discount: entry.discount || 0,
                    image: entry.image || entry.image_url || ''
                })).filter(e => e.id);
            setItems(normalized);
        } catch (err) {
            console.error("[Wishlist] Fetch error:", err);
        }
    };

    return (
        <WishlistContext.Provider value={{ items, addToWishlist, removeFromWishlist, isInWishlist, fetchWishlist }}>
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
