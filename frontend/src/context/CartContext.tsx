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
    totalAmount: number;
    totalDiscount: number;
    totalOriginal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const API_URL = "http://localhost:5001/api";

export function CartProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [items, setItems] = useState<CartItem[]>([]);

    // Fetch Cart when user changes
    useEffect(() => {
        if (user?.id) {
            fetch(`${API_URL}/cart/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    // Server returns { userId, items: [...] } or just items?
                    // server.js: res.json(cart); -> cart is { userId, items: [] }
                    // So data.items is the array.
                    if (data && Array.isArray(data.items)) {
                        setItems(data.items);
                    } else {
                        setItems([]);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch cart", err);
                    setItems([]);
                });
        } else {
            setItems([]);
        }
    }, [user]);

    const addToCart = async (product: any) => {
        if (!user?.id) {
            // In a real app we might redirect here, but for now we rely on the component to check login
            return;
        }

        // 1. Calculate New Cart State Locally
        let updatedItems = [...items];
        const existingIndex = updatedItems.findIndex(i => String(i.id) === String(product.id));

        if (existingIndex > -1) {
            // Update Quantity
            updatedItems[existingIndex].qty += 1;
        } else {
            // Add New Item
            updatedItems.push({
                ...product,
                qty: 1,
                // Ensure ID is string to match consistent types if needed
                id: String(product.id),
                deliveryDate: "Wed Oct 25" // Mock date
            });
        }

        // 2. Optimistic Update
        setItems(updatedItems);

        try {
            // 3. Sync Full Cart to Server
            // Server expects: { items: [...] }
            const res = await fetch(`${API_URL}/cart/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updatedItems })
            });

            if (res.ok) {
                // Server returns { userId, items: [...] }
                const data = await res.json();
                if (data && Array.isArray(data.items)) {
                    setItems(data.items);
                }
            }
        } catch (err) {
            console.error("Add to cart error", err);
            // Revert state if necessary, but keep simple for now
        }
    };

    const removeFromCart = async (itemId: number | string) => {
        if (!user?.id) return;

        // 1. Calculate New Cart State Locally
        const updatedItems = items.filter(i => String(i.id) !== String(itemId));

        // 2. Optimistic Update
        setItems(updatedItems);

        try {
            // 3. Sync to Server (Using POST to update full list is safer given current server logic, 
            // but server has a DELETE route too. Let's try DELETE if it works or fallback to POST)
            // server.js has DELETE /api/cart/:userId/:itemId? No, I don't see it in my view of lines 433-460.
            // Let me check lines 380-505 again. I missed checking for DELETE cart route explicitly.
            // Wait, looking at lines 433-460, I see GET and POST to /api/cart/:userId.
            // I do NOT see a DELETE route for cart items in lines 433-460.
            // Let's assume POST (full update) is the intended way if DELETE isn't there.
            // Actually, I'll just use POST to overwrite the list with the item removed. It's safer.

            const res = await fetch(`${API_URL}/cart/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: updatedItems })
            });

            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.items)) {
                    setItems(data.items);
                }
            }
        } catch (err) {
            console.error("Remove from cart error", err);
        }
    };

    const totalAmount = items.reduce((acc, item) => acc + (item.price || 0) * (item.qty || 1), 0);
    const totalOriginal = items.reduce((acc, item) => acc + (item.originalPrice || 0) * (item.qty || 1), 0);
    const totalDiscount = totalOriginal - totalAmount;

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, totalAmount, totalDiscount, totalOriginal }}>
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
