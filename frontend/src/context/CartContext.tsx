"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface CartItem {
    id: number | string;
    title: string;
    price: number;
    originalPrice: number;
    discount: number;
    image: string;
    qty: number;
    deliveryDate?: string;
    offer?: string;
    countInStock?: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: any) => Promise<void>;
    removeFromCart: (itemId: number | string) => Promise<void>;
    updateCartItemQty: (itemId: number | string, delta: number) => Promise<void>;
    clearCart: () => Promise<void>;
    totalAmount: number;
    totalDiscount: number;
    totalOriginal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}`}/api`;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api`;
};
const API_URL = getApiUrl();


import { useToast } from "./ToastContext";

export function CartProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Single initialization effect
    useEffect(() => {
        if (authLoading) return;

        const initCart = async () => {
            console.log("[Cart Init] Starting initialization for user:", user?.id || "Guest");
            // 1. Get Guest Cart from LocalStorage
            let localItems: CartItem[] = [];
            try {
                const stored = localStorage.getItem("cart");
                if (stored) {
                    localItems = JSON.parse(stored);
                    console.log("[Cart Init] Loaded from LocalStorage:", localItems);
                }
            } catch (e) {
                console.error("Local cart parse error", e);
            }

            // 2. If User is logged in, sync with server
            if (user?.id) {
                try {
                    console.log("[Cart Init] Fetching server cart for:", user.id);
                    const res = await fetch(`${API_URL}/cart/${user.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        const serverItems = Array.isArray(data.items) ? data.items : [];
                        console.log("[Cart Init] Loaded from Server:", serverItems);

                        // Merge logic: Combine both, avoid duplicates
                        const merged = [...serverItems];
                        localItems.forEach(li => {
                            if (!merged.find(si => String(si.id) === String(li.id))) {
                                merged.push(li);
                            }
                        });

                        console.log("[Cart Init] Merged Cart:", merged);
                        setItems(merged);
                        localStorage.setItem("cart", JSON.stringify(merged));

                        // If we had new local items, push the merged state back to server
                        if (localItems.length > 0) {
                            console.log("[Cart Init] Pushing merged cart to server...");
                            await fetch(`${API_URL}/cart/${user.id}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ items: merged })
                            });
                        }
                    } else {
                        console.warn("[Cart Init] Server fetch failed, using local items");
                        setItems(localItems);
                    }
                } catch (err) {
                    console.error("[Cart Init] Server cart sync error", err);
                    setItems(localItems);
                }
            } else {
                console.log("[Cart Init] Initializing as Guest with items:", localItems);
                setItems(localItems);
            }
            setIsInitialized(true);
        };

        initCart();
    }, [user, authLoading]);

    // Save to LocalStorage whenever items change (after initialization)
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem("cart", JSON.stringify(items));
        }
    }, [items, isInitialized]);

    const saveToServer = async (updatedItems: CartItem[]) => {
        if (!user?.id) return;
        console.log(`[Cart Sync] Saving to server for user ${user.id}:`, updatedItems);
        try {
            const res = await fetch(`${API_URL}/cart/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updatedItems })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error("[Cart Sync] Server rejected update:", err);
            } else {
                console.log("[Cart Sync] Successfully saved to DB");
            }
        } catch (err) {
            console.error("[Cart Sync] Network error sync cart to server", err);
        }
    };

    const addToCart = async (product: any) => {
        const updatedItems = [...items];
        const existingIndex = updatedItems.findIndex(i => String(i.id) === String(product.id));

        if (existingIndex > -1) {
            updatedItems[existingIndex].qty += 1;
        } else {
            updatedItems.push({
                ...product,
                qty: 1,
                id: String(product.id),
                deliveryDate: "Wed Oct 25" 
            });
        }

        setItems(updatedItems);
        showToast(`Added ${product.title || product.name || 'item'} to cart!`);
        saveToServer(updatedItems);
    };

    const removeFromCart = async (itemId: number | string) => {
        const updatedItems = items.filter(i => String(i.id) !== String(itemId));
        setItems(updatedItems);
        saveToServer(updatedItems);
    };

    const updateCartItemQty = async (itemId: number | string, delta: number) => {
        const updatedItems = items.map(i => {
            if (String(i.id) === String(itemId)) {
                return { ...i, qty: Math.max(1, i.qty + delta) };
            }
            return i;
        });
        setItems(updatedItems);
        saveToServer(updatedItems);
    };

    const clearCart = async () => {
        setItems([]);
        saveToServer([]);
    };

    const totalAmount = items.reduce((acc, item) => acc + (item.price || 0) * (item.qty || 1), 0);
    const totalOriginal = items.reduce((acc, item) => acc + (item.originalPrice || 0) * (item.qty || 1), 0);
    const totalDiscount = totalOriginal - totalAmount;

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateCartItemQty, clearCart, totalAmount, totalDiscount, totalOriginal }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
