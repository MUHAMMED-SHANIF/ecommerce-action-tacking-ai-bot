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

    // Step 1: Initial load from LocalStorage (Sync)
    useEffect(() => {
        try {
            const stored = localStorage.getItem("cart");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setItems(parsed);
            }
        } catch (e) {
            console.error("Cart pre-init error", e);
        }
    }, []);

    // Step 2: Auth Sync (Async)
    useEffect(() => {
        if (authLoading) return;

        const syncWithServer = async () => {
            if (!user) {
                // If user just logged out, clear cart
                const wasLoggedIn = localStorage.getItem("user_was_logged_in");
                if (wasLoggedIn === "true") {
                    console.log("[Cart] Clearing after logout");
                    setItems([]);
                    localStorage.removeItem("cart");
                    localStorage.removeItem("user_was_logged_in");
                }
                setIsInitialized(true);
                return;
            }

            // User is logged in
            localStorage.setItem("user_was_logged_in", "true");
            console.log("[Cart] Syncing for user:", user.id);

            try {
                const res = await fetch(`${API_URL}/cart/${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    const serverItems = Array.isArray(data.items) ? data.items : [];
                    
                    // Merge local items into server items
                    const currentLocal = JSON.parse(localStorage.getItem("cart") || "[]");
                    const merged = [...serverItems];
                    
                    currentLocal.forEach((li: any) => {
                        if (!merged.find(si => String(si.id) === String(li.id))) {
                            merged.push(li);
                        }
                    });

                    setItems(merged);
                    localStorage.setItem("cart", JSON.stringify(merged));

                    // If we had local items, push merged state to server
                    if (currentLocal.length > 0) {
                        await saveToServer(merged);
                    }
                }
            } catch (err) {
                console.error("[Cart] Sync error", err);
            }
            setIsInitialized(true);
        };

        syncWithServer();
    }, [user, authLoading]);

    // Internal helper to keep Local + Server in sync
    const updateLocalAndServer = (updatedItems: CartItem[]) => {
        setItems(updatedItems);
        localStorage.setItem("cart", JSON.stringify(updatedItems));
        if (user?.id && isInitialized) {
            saveToServer(updatedItems);
        }
    };

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

        updateLocalAndServer(updatedItems);
        showToast(`Added ${product.title || product.name || 'item'} to cart!`);
    };

    const removeFromCart = async (itemId: number | string) => {
        const updatedItems = items.filter(i => String(i.id) !== String(itemId));
        updateLocalAndServer(updatedItems);
    };

    const updateCartItemQty = async (itemId: number | string, delta: number) => {
        const updatedItems = items.map(i => {
            if (String(i.id) === String(itemId)) {
                return { ...i, qty: Math.max(1, i.qty + delta) };
            }
            return i;
        });
        updateLocalAndServer(updatedItems);
    };

    const clearCart = async () => {
        updateLocalAndServer([]);
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
