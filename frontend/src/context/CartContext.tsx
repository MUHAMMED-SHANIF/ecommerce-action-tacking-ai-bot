"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

interface CartItem {
    id: string;
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

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api`;

export function CartProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState<CartItem[]>([]);
    const userRef = useRef<any>(null);

    // Keep ref in sync with user for use inside async callbacks
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // On auth change: load from server (or clear on logout)
    useEffect(() => {
        if (authLoading) return;

        if (!user?.id) {
            // Logged out — clear everything
            setItems([]);
            localStorage.removeItem("cart");
            return;
        }

        // Logged in — fetch from DB
        const loadFromServer = async () => {
            try {
                const res = await fetch(`${API_URL}/cart/${user.id}`);
                if (!res.ok) throw new Error("Failed to fetch cart");
                const data = await res.json();
                const serverItems: CartItem[] = Array.isArray(data.items) ? data.items : [];

                // Merge any local-only items (added while logged out)
                const local: CartItem[] = (() => {
                    try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
                    catch { return []; }
                })();

                const merged = [...serverItems];
                local.forEach((li) => {
                    if (!merged.find(si => String(si.id) === String(li.id))) {
                        merged.push({ ...li, id: String(li.id) });
                    }
                });

                setItems(merged);
                localStorage.setItem("cart", JSON.stringify(merged));

                // Push merged state back if we had extra local items
                if (local.length > 0 && merged.length > serverItems.length) {
                    await pushToServer(user.id, merged);
                }
            } catch (err) {
                console.error("[Cart] Load error:", err);
                // Fallback to localStorage
                try {
                    const local = JSON.parse(localStorage.getItem("cart") || "[]");
                    if (Array.isArray(local)) setItems(local);
                } catch { /* ignore */ }
            }
        };

        loadFromServer();
    }, [user?.id, authLoading]);

    // Always push current items to server and localStorage
    const pushToServer = async (userId: string, updatedItems: CartItem[]) => {
        localStorage.setItem("cart", JSON.stringify(updatedItems));
        try {
            const res = await fetch(`${API_URL}/cart/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updatedItems })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error("[Cart] Save failed:", err);
            }
        } catch (err) {
            console.error("[Cart] Save network error:", err);
        }
    };

    const persist = (updatedItems: CartItem[]) => {
        setItems(updatedItems);
        localStorage.setItem("cart", JSON.stringify(updatedItems));
        const uid = userRef.current?.id;
        if (uid) {
            pushToServer(uid, updatedItems);
        }
    };

    const addToCart = async (product: any) => {
        const updatedItems = [...items];
        const existingIndex = updatedItems.findIndex(i => String(i.id) === String(product.id));

        if (existingIndex > -1) {
            updatedItems[existingIndex].qty += 1;
        } else {
            updatedItems.push({
                id: String(product.id),
                title: product.title || product.name || '',
                price: product.price || 0,
                originalPrice: product.originalPrice || product.price || 0,
                discount: product.discount || 0,
                image: product.image || product.image_url || '',
                qty: 1,
                countInStock: product.countInStock,
                deliveryDate: "Wed Oct 25"
            });
        }

        persist(updatedItems);
        showToast(`Added ${product.title || product.name || 'item'} to cart!`);
    };

    const removeFromCart = async (itemId: number | string) => {
        const updatedItems = items.filter(i => String(i.id) !== String(itemId));
        persist(updatedItems);
    };

    const updateCartItemQty = async (itemId: number | string, delta: number) => {
        const updatedItems = items.map(i => {
            if (String(i.id) === String(itemId)) {
                return { ...i, qty: Math.max(1, i.qty + delta) };
            }
            return i;
        });
        persist(updatedItems);
    };

    const clearCart = async () => {
        persist([]);
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
