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
    const { user } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // 1. Initial Load from LocalStorage (Guest Cart)
    useEffect(() => {
        const localCart = localStorage.getItem("cart");
        if (localCart) {
            try {
                setItems(JSON.parse(localCart));
            } catch (e) {
                console.error("Failed to parse local cart", e);
            }
        }
        setIsInitialized(true);
    }, []);

    // 2. Sync/Merge with Server when user logs in
    useEffect(() => {
        if (!isInitialized) return;

        if (user?.id) {
            const syncCart = async () => {
                try {
                    // Fetch server cart
                    const res = await fetch(`${API_URL}/cart/${user.id}`);
                    const data = await res.json();
                    const serverItems = Array.isArray(data.items) ? data.items : [];

                    // Merge guest items into server items
                    // We prioritize server items but add any unique local items
                    const mergedItems = [...serverItems];
                    items.forEach(localItem => {
                        const existing = mergedItems.find(si => String(si.id) === String(localItem.id));
                        if (!existing) {
                            mergedItems.push(localItem);
                        } else {
                            // If it exists in both, maybe take the higher quantity?
                            existing.qty = Math.max(existing.qty || 1, localItem.qty || 1);
                        }
                    });

                    setItems(mergedItems);
                    localStorage.setItem("cart", JSON.stringify(mergedItems));

                    // Upload merged cart back to server to keep it in sync
                    await fetch(`${API_URL}/cart/${user.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items: mergedItems })
                    });
                } catch (err) {
                    console.error("Sync error", err);
                }
            };
            syncCart();
        } else {
            // If user logs out, we keep the items in state/localStorage (becomes guest cart again)
            // Or we could clear it if preferred, but usually keeping it is better for UX.
        }
    }, [user, isInitialized]);

    // 3. Save to LocalStorage whenever items change
    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem("cart", JSON.stringify(items));
    }, [items, isInitialized]);

    const saveToServer = async (updatedItems: CartItem[]) => {
        if (!user?.id) return;
        try {
            await fetch(`${API_URL}/cart/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updatedItems })
            });
        } catch (err) {
            console.error("Failed to sync cart to server", err);
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
