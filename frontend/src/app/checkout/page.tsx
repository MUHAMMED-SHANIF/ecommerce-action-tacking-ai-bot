"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ShieldCheck, Truck } from "lucide-react";

import { useCart } from "@/context/CartContext";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";

function CheckoutContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const isBuyNow = searchParams.get("buyNow") === "true";
    const productId = searchParams.get("productId");

    const [orderPlaced, setOrderPlaced] = useState(false);
    const { items: cartItems, clearCart } = useCart();
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [addresses, setAddresses] = useState<any[]>([]);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        name: "",
        mobile: "",
        pincode: "",
        addressLine: "",
        city: "",
        state: ""
    });

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        // Fetch Addresses
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/address/${user.id}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                setAddresses(Array.isArray(data) ? data : []);
            })
            .catch(err => console.error(err));

        const fetchSingleProduct = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products/${productId}`);
                if (res.ok) {
                    const product = await res.json();
                    setOrderItems([{
                        ...product,
                        qty: 1,
                        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image
                    }]);
                }
            } catch (err) {
                console.error("Failed to load product", err);
            } finally {
                setLoading(false);
            }
        };

        if (isBuyNow && productId) {
            fetchSingleProduct();
        } else {
            setOrderItems(JSON.parse(JSON.stringify(cartItems))); // Deep copy to adjust independently
            setLoading(false);
        }
    }, [user, router, isBuyNow, productId, cartItems]);

    // Quantities and totals
    const updateQuantity = (id: string, delta: number) => {
        setOrderItems(prev => prev.map(item => {
            if (String(item.id) === String(id)) {
                const newQty = Math.max(1, item.qty + delta);
                // Can also validate countInStock here if requested, but at least 1
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const calculatedTotal = orderItems.reduce((acc, item) => acc + (item.price || 0) * (item.qty || 1), 0);
    const calculatedOriginal = orderItems.reduce((acc, item) => acc + (item.originalPrice || 0) * (item.qty || 1), 0);
    const calculatedDiscount = calculatedOriginal - calculatedTotal;

    const handleAddAddress = async () => {
        if (!user) return;
        if (!newAddress.name || !newAddress.mobile || !newAddress.pincode || !newAddress.city || !newAddress.addressLine || !newAddress.state) {
            alert("Please fill all fields");
            return;
        }

        // Phone number validation
        if (!/^\d+$/.test(newAddress.mobile)) {
            alert("Phone number must contain only digits.");
            return;
        }

        const updatedList = [...addresses, newAddress];

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/address/${user.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addresses: updatedList })
            });
            if (res.ok) {
                setAddresses(updatedList);
                setShowAddressForm(false);
                setNewAddress({ name: "", mobile: "", pincode: "", addressLine: "", city: "", state: "" });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handlePlaceOrder = async () => {
        if (!user) return;

        if (addresses.length === 0 || selectedAddressIndex < 0 || selectedAddressIndex >= addresses.length) {
            alert("Please select or add a delivery address.");
            return;
        }

        const selectedAddress = addresses[selectedAddressIndex];
        const userPhone = user?.phone || "";
        const addressPhone = selectedAddress.mobile || selectedAddress.phone || "";

        // 1. Stock Validation
        for (const item of orderItems) {
            if (item.qty > (item.countInStock || 0)) {
                alert(`Sorry, "${item.title || item.name}" has only ${item.countInStock} units in stock. Please reduce your quantity.`);
                return;
            }
        }

        // 2. Phone Validation (Must have at least one)
        if (!userPhone && !addressPhone) {
            alert("A valid phone number is required to place an order. Please add one to your address or profile.");
            return;
        }

        const orderData = {
            user: { id: user.id, name: user.name, email: user.email, phone: userPhone },
            orderItems: orderItems,
            shippingAddress: {
                address: selectedAddress.addressLine,
                city: selectedAddress.city,
                postalCode: selectedAddress.pincode,
                state: selectedAddress.state,
                country: "India",
                mobile: selectedAddress.mobile,
                name: selectedAddress.name
            },
            paymentMethod: "COD",
            itemsPrice: calculatedTotal,
            taxPrice: 0,
            shippingPrice: 0,
            totalPrice: calculatedTotal
        };

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                setOrderPlaced(true);
                if (!isBuyNow) {
                    clearCart();
                }
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
            <div className="min-h-screen bg-[#F5EFE6] flex flex-col items-center justify-center p-4">
                <div className="bg-white p-10 rounded shadow-md text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-[#F59E0B] rounded-full flex items-center justify-center mx-auto mb-4">
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

                    {/* Step 2: Address */}
                    <div className="bg-white shadow-sm mb-4 border border-slate-100 rounded-lg overflow-hidden">
                        <div className="bg-[#0B3D2E] p-4 text-white font-medium text-[14px] uppercase flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="bg-[#F59E0B] text-black px-2 text-[12px] font-bold rounded-sm">1</span>
                                Delivery Address
                            </div>
                            {!showAddressForm && (
                                <button
                                    onClick={() => setShowAddressForm(true)}
                                    className="text-white text-[12px] font-medium border border-white/30 px-3 py-1 rounded hover:bg-white/10 transition-colors"
                                >
                                    Change / Add
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            {showAddressForm ? (
                                <div className="bg-slate-50 p-6 border border-slate-200 rounded-xl">
                                    <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-tight">Add New Address</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <input placeholder="Name" className="p-3 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none" value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} />
                                        <input placeholder="Mobile" type="tel" className="p-3 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none" value={newAddress.mobile} onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setNewAddress({ ...newAddress, mobile: val });
                                        }} />
                                        <input placeholder="Pincode" className="p-3 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none" value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} />
                                        <input placeholder="City" className="p-3 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none" value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} />
                                        <input placeholder="Address (Area and Street)" className="md:col-span-2 p-3 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none" value={newAddress.addressLine} onChange={e => setNewAddress({ ...newAddress, addressLine: e.target.value })} />
                                        <input placeholder="State" className="p-3 border border-slate-200 rounded-lg text-sm w-full focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none" value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleAddAddress} className="bg-[#0B3D2E] text-white px-6 py-2.5 text-sm font-bold uppercase rounded-lg shadow-md hover:bg-[#145A3A] transition-colors">Save Address</button>
                                        <button onClick={() => setShowAddressForm(false)} className="text-slate-500 hover:text-slate-800 text-sm font-bold uppercase px-4 py-2.5 transition-colors">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {addresses.length > 0 ? (
                                        <div className="flex flex-col gap-4">
                                            {addresses.map((addr, idx) => (
                                                <div key={idx} className={`p-5 border-2 rounded-xl cursor-pointer flex gap-4 items-start transition-all ${selectedAddressIndex === idx ? 'border-[#F59E0B] bg-amber-50 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`} onClick={() => setSelectedAddressIndex(idx)}>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center ${selectedAddressIndex === idx ? 'border-[#F59E0B]' : 'border-slate-300'}`}>
                                                        {selectedAddressIndex === idx && <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />}
                                                    </div>
                                                    <div className="text-[14px]">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-slate-900">{addr.name}</span>
                                                            <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tight">HOME</span>
                                                            <span className="font-bold text-slate-700 ml-1">{addr.mobile}</span>
                                                        </div>
                                                        <p className="text-slate-600 leading-relaxed">{addr.addressLine}, {addr.city}, {addr.state} - <span className="font-bold text-slate-800">{addr.pincode}</span></p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="mt-2 text-right">
                                                <span className="text-xs text-slate-400 italic">Selected Address will be used for delivery.</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-slate-500 mb-6">No address saved. Please add one to continue.</p>
                                            <button onClick={() => setShowAddressForm(true)} className="bg-[#F59E0B] text-black font-black px-10 py-4 text-[15px] uppercase rounded-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                                                Add Delivery Address
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Order Summary (Quantity edits here) */}
                    <div className="bg-white shadow-sm mb-4 border border-slate-100 rounded-lg overflow-hidden">
                        <div className="bg-[#0B3D2E] p-4 text-white font-medium text-[14px] uppercase flex items-center gap-3">
                            <span className="bg-[#F59E0B] text-black px-2 text-[12px] font-bold rounded-sm">2</span>
                            Order Summary
                        </div>
                        <div className="p-0">
                            {orderItems.map((item) => (
                                <div key={item.id} className="p-6 border-b border-slate-100 flex gap-6 relative last:border-0 hover:bg-slate-50 transition-colors">
                                    <div className="w-28 h-28 relative flex-shrink-0 bg-white rounded-lg border border-slate-100 p-2">
                                        <Image src={item.image} alt={item.title} fill className="object-contain" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-[16px] text-slate-800 font-bold line-clamp-2 mb-2 leading-snug">
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="text-[14px] text-slate-400 line-through">₹{(item.originalPrice * item.qty).toLocaleString()}</span>
                                                <span className="text-[20px] font-black text-slate-900">₹{(item.price * item.qty).toLocaleString()}</span>
                                                <span className="text-[13px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">{item.discount}% Off</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-full">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 text-xl font-bold leading-none text-slate-600 transition-colors" disabled={item.qty <= 1}>−</button>
                                                <div className="w-10 text-center text-[15px] font-black text-slate-800">{item.qty}</div>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 text-xl font-bold leading-none text-slate-600 transition-colors">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[12px] text-slate-500 self-start text-right hidden sm:block">
                                        Delivery by {item.deliveryDate || 'Sat Oct 28'}<br />
                                        <span className="text-emerald-600 font-bold">Free Shipping</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 4: Payment */}
                    <div className="bg-white shadow-sm mb-4 border border-slate-100 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 p-4 text-slate-600 font-bold text-[14px] uppercase flex items-center gap-3">
                            <span className="bg-white text-slate-400 px-2 text-[12px] font-bold rounded-sm border border-slate-200">3</span>
                            Payment Options
                        </div>
                        <div className="p-8">
                            {/* COD Option */}
                            <div className="flex items-start gap-4 mb-6 p-5 bg-amber-50 border-2 border-[#F59E0B] rounded-xl shadow-sm">
                                <div className="w-5 h-5 rounded-full border-2 border-[#F59E0B] flex items-center justify-center mt-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                                </div>
                                <label htmlFor="cod" className="cursor-pointer flex-1">
                                    <div className="font-black text-slate-900 text-lg">Cash on Delivery</div>
                                    <div className="text-[13px] text-slate-500">Pay securely with cash at the time of delivery.</div>
                                </label>
                            </div>

                            {/* Online Payment (Disabled) */}
                            <div className="flex items-start gap-4 mb-10 p-5 opacity-40 grayscale border-2 border-dashed border-slate-200 rounded-xl">
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 mt-1" />
                                <label className="flex-1">
                                    <div className="font-bold text-slate-800">Online Payment</div>
                                    <div className="text-[12px] text-red-500 font-bold uppercase tracking-tighter">Coming Soon</div>
                                </label>
                            </div>

                            <button onClick={handlePlaceOrder} className="w-full sm:w-auto bg-[#F59E0B] text-black font-black px-16 py-4 text-[18px] uppercase rounded-xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 active:scale-95">
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
                                <span>Price ({orderItems.length} items)</span>
                                <span>₹{(calculatedTotal + calculatedDiscount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[#0B3D2E]">
                                <span>Discount</span>
                                <span>− ₹{calculatedDiscount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[#0B3D2E]">
                                <span>Delivery Charges</span>
                                <span>Free</span>
                            </div>

                            <div className="border-t border-dashed border-gray-300 my-2"></div>

                            <div className="flex justify-between font-semibold text-[18px]">
                                <span>Total Amount</span>
                                <span>₹{calculatedTotal.toLocaleString()}</span>
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

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="container mx-auto p-8 text-center">Loading checkout...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}
