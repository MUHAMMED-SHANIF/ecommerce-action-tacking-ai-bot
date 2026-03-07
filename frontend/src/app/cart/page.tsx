"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CartPage() {
    const { user } = useAuth();
    const { items: cartItems, removeFromCart, updateCartItemQty, totalAmount, totalDiscount, totalOriginal } = useCart();
    const router = useRouter();
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
        } else {
            // Fetch Addresses
            fetch(`http://localhost:5001/api/address/${user.id}`, { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                    setAddresses(Array.isArray(data) ? data : []);
                })
                .catch(err => console.error(err));
        }
    }, [user, router]);

    const handleAddAddress = async () => {
        if (!user) return;
        const updatedList = [...addresses, newAddress];

        try {
            const res = await fetch(`http://localhost:5001/api/address/${user.id}`, {
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

    if (!user) return null;

    if (cartItems.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 bg-white max-w-[1248px] text-center shadow-sm mt-4">
                <img src="/empty_cart.png" alt="Empty Cart" className="w-64 mx-auto mb-6" />
                <h2 className="text-[24px] font-bold mb-2 text-[#065f46]">Your cart is empty!</h2>
                <p className="text-[14px] text-slate-500 mb-8 font-medium">Add items to it now.</p>
                <Link href="/">
                    <button className="bg-[#065f46] text-white px-16 py-3.5 font-bold shadow-md hover:shadow-lg text-[15px] hover:bg-[#047857] transition-all rounded-sm uppercase tracking-wide">
                        Shop Now
                    </button>
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full px-1 py-4 font-sans">
            <div className="flex flex-col lg:flex-row gap-4">

                {/* Left Section: Cart Items */}
                <div className="flex-1">
                    {/* Address Section */}
                    <div className="bg-white shadow-sm mb-4 p-4 border rounded-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-500 font-medium text-[16px]">Deliver to:</h3>
                            {!showAddressForm && (
                                <button
                                    onClick={() => setShowAddressForm(true)}
                                    className="text-[#2874f0] text-[14px] font-medium border border-[#e0e0e0] px-3 py-1 rounded hover:bg-gray-50"
                                >
                                    Change / Add Address
                                </button>
                            )}
                        </div>

                        {showAddressForm ? (
                            <div className="bg-gray-50 p-4 border border-gray-200 rounded">
                                <h3 className="font-medium text-sm mb-3">Add New Address</h3>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input placeholder="Name" className="p-2 border rounded text-sm" value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} />
                                    <input placeholder="Mobile" className="p-2 border rounded text-sm" value={newAddress.mobile} onChange={e => setNewAddress({ ...newAddress, mobile: e.target.value })} />
                                    <input placeholder="Pincode" className="p-2 border rounded text-sm" value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} />
                                    <input placeholder="City" className="p-2 border rounded text-sm" value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} />
                                    <input placeholder="Address (Area and Street)" className="col-span-2 p-2 border rounded text-sm" value={newAddress.addressLine} onChange={e => setNewAddress({ ...newAddress, addressLine: e.target.value })} />
                                    <input placeholder="State" className="p-2 border rounded text-sm" value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddAddress} className="bg-[#fb641b] text-white px-4 py-1.5 text-sm font-medium uppercase rounded-sm shadow-sm">Save Address</button>
                                    <button onClick={() => setShowAddressForm(false)} className="text-[#2874f0] text-sm font-medium uppercase px-2 py-1.5">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {addresses.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {addresses.map((addr, idx) => (
                                            <div key={idx} className={`p-3 border rounded cursor-pointer flex gap-3 items-start ${selectedAddressIndex === idx ? 'border-gray-400 bg-gray-50' : 'border-transparent hover:bg-gray-50'}`} onClick={() => setSelectedAddressIndex(idx)}>
                                                <input type="radio" checked={selectedAddressIndex === idx} readOnly className="mt-1" />
                                                <div className="text-[14px]">
                                                    <span className="font-semibold mr-2">{addr.name}</span>
                                                    <span className="bg-gray-200 text-gray-500 text-[10px] px-1.5 py-0.5 rounded mr-2">HOME</span>
                                                    <span className="font-bold mr-2">{addr.mobile}</span>
                                                    <p className="text-gray-600 mt-1">{addr.addressLine}, {addr.city}, {addr.state} - <span className="font-bold">{addr.pincode}</span></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No address saved. Please add one.</p>
                                )}
                            </div>
                        )}

                    </div>

                    <div className="bg-white shadow-sm mb-4">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-[18px] font-medium">My Cart ({cartItems.length})</h2>
                        </div>

                        {cartItems.map((item) => (
                            <div key={item.id} className="p-6 border-b border-gray-100 flex gap-6 relative">
                                <div className="w-28 h-28 relative flex-shrink-0">
                                    <Image src={item.image} alt={item.title} fill className="object-contain" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-[16px] text-gray-800 font-medium hover:text-[#2874f0] cursor-pointer line-clamp-2 mb-1">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-500 text-[12px] mb-3">Seller: SuperComNet</p>

                                    <div className="flex items-baseline gap-3 mb-4">
                                        <span className="text-[14px] text-gray-500 line-through">₹{item.originalPrice.toLocaleString()}</span>
                                        <span className="text-[18px] font-semibold text-black">₹{item.price.toLocaleString()}</span>
                                        <span className="text-[14px] text-[#388e3c] font-medium">{item.discount}% Off</span>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateCartItemQty(item.id, -1)}
                                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-xl font-medium leading-none"
                                                disabled={item.qty <= 1}
                                            >−</button>
                                            <input type="text" value={item.qty} readOnly className="w-10 text-center border border-gray-300 py-0.5 text-[14px]" />
                                            <button
                                                onClick={() => updateCartItemQty(item.id, 1)}
                                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-xl font-medium leading-none"
                                            >+</button>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="font-medium text-[14px] hover:text-[#2874f0] uppercase"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <div className="text-[12px] text-gray-600">
                                    Delivery by {item.deliveryDate || 'Sat Oct 28'} | <span className="text-[#388e3c] border-l border-gray-300 pl-1 ml-1">Free</span> <span className="line-through text-gray-400">₹40</span>
                                </div>
                            </div>
                        ))}

                        <div className="p-4 flex justify-end sticky bottom-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                            <Link href="/checkout">
                                <button className="bg-[#fb641b] text-white font-medium px-16 py-3 text-[16px] shadow-md uppercase tracking-wide hover:shadow-lg transition-shadow rounded-sm warning-button">
                                    Place Order
                                </button>
                                {/* Note: I used the requested yellow color #fb641b which is the standard Flipkart 'Place Order' Orange-Yellow. 
                                    The user asked for 'yellow that used early'. I assume this is the orange-yellow accent. 
                                    If they meant pure yellow, I could use #eab308 */}
                            </Link>
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
                                <span>Price ({cartItems.length} items)</span>
                                <span>₹{totalOriginal.toLocaleString()}</span>
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

                            <p className="text-[#388e3c] font-medium text-[14px] text-center">
                                You will save ₹{totalDiscount.toLocaleString()} on this order
                            </p>
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
