"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShieldCheck, Truck } from "lucide-react";

import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [orderPlaced, setOrderPlaced] = useState(false);
    const { items, totalAmount, totalDiscount, clearCart } = useCart();

    useEffect(() => {
        if (!user) {
            router.push("/login");
        }
    }, [user, router]);

    const handlePlaceOrder = async () => {
        if (!user) return;

        const orderData = {
            user: { id: user.id, name: user.name, email: user.email },
            orderItems: items,
            shippingAddress: {
                address: "Alyssa, Begonia & Clove Embassy Tech Village, Outer Ring Road",
                city: "Bengaluru",
                postalCode: "560103",
                country: "India"
            },
            paymentMethod: "COD",
            itemsPrice: totalAmount,
            taxPrice: 0,
            shippingPrice: 0,
            totalPrice: totalAmount
        };

        try {
            const res = await fetch('http://localhost:5001/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                setOrderPlaced(true);
                clearCart();
            } else {
                const err = await res.json();
                alert(`Order failed: ${err.error}`);
            }
        } catch (error) {
            console.error("Order placement failed", error);
            alert("Failed to place order. Please try again.");
        }
    };

    if (!user) return null;

    if (orderPlaced) {
        return (
            <div className="min-h-screen bg-[#f1f2f4] flex flex-col items-center justify-center p-4">
                <div className="bg-white p-10 rounded shadow-md text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-[#22c55e] rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-[24px] font-semibold text-gray-800 mb-2">Order Placed Successfully!</h2>
                    <p className="text-gray-600 mb-6">Thank you for your order. We will deliver it soon.</p>
                    <button onClick={() => router.push("/")} className="bg-[#2874f0] text-white px-6 py-2 rounded font-medium">
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-[1248px] font-sans">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Side */}
                <div className="flex-1">
                    {/* Step 1: Login */}
                    <div className="bg-white shadow-sm mb-4 p-4 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="bg-gray-200 text-gray-500 px-2 text-[12px] font-bold">1</span>
                            <div className="text-[14px]">
                                <span className="text-gray-500 uppercase font-medium">Login</span>
                                <div className="font-semibold">{user.email}</div>
                            </div>
                        </div>
                        <button className="text-[#2874f0] text-[14px] font-medium border border-gray-200 px-4 py-1">CHANGE</button>
                    </div>

                    {/* Step 2: Address */}
                    <div className="bg-white shadow-sm mb-4">
                        <div className="bg-[#2874f0] p-4 text-white font-medium text-[14px] uppercase flex items-center gap-3">
                            <span className="bg-white text-[#2874f0] px-2 text-[12px] font-bold">2</span>
                            Delivery Address
                        </div>
                        <div className="p-6">
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Name" className="border p-2 rounded w-full" defaultValue="John Doe" />
                                <input type="text" placeholder="10-digit mobile number" className="border p-2 rounded w-full" defaultValue="9876543210" />
                                <input type="text" placeholder="Pincode" className="border p-2 rounded w-full" defaultValue="560103" />
                                <input type="text" placeholder="Locality" className="border p-2 rounded w-full" defaultValue="Bellandur" />
                                <textarea placeholder="Address (Area and Street)" className="border p-2 rounded w-full md:col-span-2" rows={3}>Alyssa, Begonia & Clove Embassy Tech Village, Outer Ring Road</textarea>
                            </form>
                            <button className="bg-[#fb641b] text-white font-bold px-8 py-3 text-[14px] mt-4 uppercase rounded-[2px] shadow">
                                Deliver Here
                            </button>
                        </div>
                    </div>

                    {/* Step 4: Payment */}
                    <div className="bg-white shadow-sm mb-4">
                        <div className="bg-[#2874f0] p-4 text-white font-medium text-[14px] uppercase flex items-center gap-3">
                            <span className="bg-white text-[#2874f0] px-2 text-[12px] font-bold">3</span>
                            Payment Options
                        </div>
                        <div className="p-6">
                            {/* COD Option */}
                            <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 border border-blue-100 rounded">
                                <input type="radio" name="payment" id="cod" defaultChecked className="mt-1" />
                                <label htmlFor="cod" className="cursor-pointer flex-1">
                                    <div className="font-medium text-gray-800">Cash on Delivery</div>
                                    <div className="text-[12px] text-gray-500">Pay cash at the time of delivery</div>
                                </label>
                            </div>

                            {/* Online Payment (Disabled) */}
                            <div className="flex items-start gap-3 mb-6 p-3 opacity-60">
                                <input type="radio" name="payment" id="online" disabled className="mt-1" />
                                <label htmlFor="online" className="cursor-not-allowed flex-1">
                                    <div className="font-medium text-gray-800">Ups/Credit/Debit/ATM Card</div>
                                    <div className="text-[12px] text-red-500 font-medium">Online payment will come soon</div>
                                </label>
                            </div>

                            <button onClick={handlePlaceOrder} className="bg-[#fb641b] text-white font-bold px-16 py-3 text-[16px] uppercase rounded-[2px] shadow hover:shadow-lg">
                                Confirm Order
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right Section: Price Details */}
                <div className="lg:w-[360px] h-fit sticky top-20">
                    <div className="bg-white shadow-sm min-h-[300px]">
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="text-[16px] font-medium text-gray-500 uppercase">Price Details</h3>
                        </div>
                        <div className="p-4 flex flex-col gap-4 text-[15px]">
                            <div className="flex justify-between">
                                <span>Price ({items.length} items)</span>
                                <span>₹{(totalAmount + totalDiscount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[#388e3c]">
                                <span>Discount</span>
                                <span>− ₹{totalDiscount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[#388e3c]">
                                <span>Delivery Charges</span>
                                <span>Free</span>
                            </div>

                            <div className="border-t border-dashed border-gray-300 my-2"></div>

                            <div className="flex justify-between font-semibold text-[18px]">
                                <span>Total Amount</span>
                                <span>₹{totalAmount.toLocaleString()}</span>
                            </div>

                            <div className="border-t border-dashed border-gray-300 my-2"></div>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex items-center gap-2 text-[12px] text-gray-500 font-medium">
                            <ShieldCheck className="w-6 h-6 text-gray-400" />
                            <span>Safe and Secure Payments. Easy returns. 100% Authentic products.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
