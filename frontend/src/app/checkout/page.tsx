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

        const outOfStockItems = orderItems.filter(item => item.countInStock <= 0);
        if (outOfStockItems.length > 0) {
            alert(`The following item(s) are out of stock: ${outOfStockItems.map(i => i.title).join(', ')}. Please remove them to place your order.`);
            return;
        }

        const selectedAddress = addresses[selectedAddressIndex];

        const orderData = {
            user: { id: user.id, name: user.name, email: user.email },
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
                        <div className="bg-[#2874f0] p-4 text-white font-medium text-[14px] uppercase flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="bg-white text-[#2874f0] px-2 text-[12px] font-bold">2</span>
                                Delivery Address
                            </div>
                            {!showAddressForm && (
                                <button
                                    onClick={() => setShowAddressForm(true)}
                                    className="text-white text-[12px] font-medium border border-white px-3 py-1 rounded hover:bg-blue-600"
                                >
                                    Change / Add
                                </button>
                            )}
                        </div>
                        <div className="p-6">
                            {showAddressForm ? (
                                <div className="bg-gray-50 p-4 border border-gray-200 rounded">
                                    <h3 className="font-medium text-sm mb-3">Add New Address</h3>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <input placeholder="Name" className="p-2 border rounded text-sm w-full" value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} />
                                        <input placeholder="Mobile" className="p-2 border rounded text-sm w-full" value={newAddress.mobile} onChange={e => setNewAddress({ ...newAddress, mobile: e.target.value })} />
                                        <input placeholder="Pincode" className="p-2 border rounded text-sm w-full" value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} />
                                        <input placeholder="City" className="p-2 border rounded text-sm w-full" value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} />
                                        <input placeholder="Address (Area and Street)" className="col-span-2 p-2 border rounded text-sm w-full" value={newAddress.addressLine} onChange={e => setNewAddress({ ...newAddress, addressLine: e.target.value })} />
                                        <input placeholder="State" className="p-2 border rounded text-sm w-full" value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddAddress} className="bg-[#cddc39] text-gray-900 px-4 py-1.5 text-sm font-medium uppercase rounded-sm shadow-sm">Save Address</button>
                                        <button onClick={() => setShowAddressForm(false)} className="text-[#2874f0] text-sm font-medium uppercase px-2 py-1.5">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {addresses.length > 0 ? (
                                        <div className="flex flex-col gap-3">
                                            {addresses.map((addr, idx) => (
                                                <div key={idx} className={`p-4 border rounded cursor-pointer flex gap-3 items-start ${selectedAddressIndex === idx ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setSelectedAddressIndex(idx)}>
                                                    <input type="radio" checked={selectedAddressIndex === idx} readOnly className="mt-1" />
                                                    <div className="text-[14px]">
                                                        <span className="font-semibold mr-2">{addr.name}</span>
                                                        <span className="bg-gray-200 text-gray-500 text-[10px] px-1.5 py-0.5 rounded mr-2">HOME</span>
                                                        <span className="font-bold mr-2">{addr.mobile}</span>
                                                        <p className="text-gray-600 mt-1">{addr.addressLine}, {addr.city}, {addr.state} - <span className="font-bold">{addr.pincode}</span></p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="mt-2 text-right">
                                                <span className="text-sm text-gray-500">Selected Address will be used for delivery.</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-gray-500 mb-4">No address saved. Please add one to continue.</p>
                                            <button onClick={() => setShowAddressForm(true)} className="bg-[#cddc39] text-gray-900 font-bold px-8 py-3 text-[14px] uppercase rounded-[2px] shadow">
                                                Add Delivery Address
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Order Summary (Quantity edits here) */}
                    <div className="bg-white shadow-sm mb-4">
                        <div className="bg-[#2874f0] p-4 text-white font-medium text-[14px] uppercase flex items-center gap-3">
                            <span className="bg-white text-[#2874f0] px-2 text-[12px] font-bold">3</span>
                            Order Summary
                        </div>
                        <div className="p-0">
                            {orderItems.map((item) => (
                                <div key={item.id} className="p-6 border-b border-gray-100 flex gap-6 relative">
                                    <div className="w-24 h-24 relative flex-shrink-0">
                                        <Image src={item.image} alt={item.title} fill className="object-contain" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-[15px] text-gray-800 font-medium line-clamp-2 mb-1">
                                            {item.title}
                                        </h3>

                                        <div className="flex items-baseline gap-3 mb-4">
                                            <span className="text-[14px] text-gray-500 line-through">₹{(item.originalPrice * item.qty).toLocaleString()}</span>
                                            <span className="text-[18px] font-semibold text-black">₹{(item.price * item.qty).toLocaleString()}</span>
                                            <span className="text-[14px] text-[#388e3c] font-medium">{item.discount}% Off</span>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-xl font-medium leading-none" disabled={item.qty <= 1}>−</button>
                                                <div className="w-12 text-center border border-gray-300 py-1 text-[14px] font-semibold">{item.qty}</div>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-xl font-medium leading-none">+</button>
                                            </div>
                                            {/* 'Save for later' removed here entirely */}
                                        </div>
                                    </div>
                                    <div className="text-[12px] text-gray-600 self-start text-right">
                                        Delivery by {item.deliveryDate || 'Sat Oct 28'}<br />
                                        <span className="text-[#388e3c]">Free Subtotal</span> <span className="line-through text-gray-400">₹40</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 4: Payment */}
                    <div className="bg-white shadow-sm mb-4">
                        <div className="bg-gray-200 p-4 text-gray-500 font-medium text-[14px] uppercase flex items-center gap-3">
                            <span className="bg-white text-gray-500 px-2 text-[12px] font-bold">4</span>
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

                            <button onClick={handlePlaceOrder} className="bg-[#cddc39] text-gray-900 font-bold px-16 py-3 text-[16px] uppercase rounded-[2px] shadow hover:shadow-lg">
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
                            <div className="flex justify-between text-[#388e3c]">
                                <span>Discount</span>
                                <span>− ₹{calculatedDiscount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[#388e3c]">
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
