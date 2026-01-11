"use client";

import { useState, useEffect } from "react";
import { User, MapPin, Plus, Trash2, Edit2, Check, Phone, Mail, Lock, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Address {
    id: string;
    label: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    isDefault?: boolean;
}

interface Order {
    id: string;
    items: any[];
    total: number;
    status: string;
    createdAt: string;
}

const API_BASE = "http://localhost:5001/api";

export default function ProfilePage() {
    const { user } = useAuth();
    const [name, setName] = useState(user?.name || "");
    const [phone, setPhone] = useState("");
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Addresses
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [newAddress, setNewAddress] = useState<Partial<Address>>({});

    // Change Password
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");

    // Orders
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (user) {
            setName(user.name || user.email.split('@')[0]);

            // Fetch Addresses
            fetch(`${API_BASE}/address/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setAddresses(data);
                })
                .catch(err => console.error("Failed to fetch addresses", err));

            // Fetch Orders
            fetch(`${API_BASE}/orders/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setOrders(data);
                })
                .catch(err => console.error("Failed to fetch orders", err));
        }
    }, [user]);

    const handleSaveProfile = async () => {
        if (!user) {
            alert("No user found. Please login.");
            return;
        }
        console.log("Saving profile for:", user.id, { name, phone });
        try {
            const res = await fetch(`${API_BASE}/auth/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, name, phone })
            });

            const data = await res.json();
            if (res.ok) {
                setIsEditingProfile(false);
                alert("Profile updated successfully!");
            } else {
                console.error("Profile update failed:", data);
                alert(`Failed to update profile: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Failed to update profile", err);
            alert("Error updating profile (Network/Server)");
        }
    };

    const handleSaveAddress = async () => {
        let updatedAddresses = [...addresses];
        if (editingAddress) {
            updatedAddresses = addresses.map(addr => addr.id === editingAddress.id ? { ...addr, ...newAddress } as Address : addr);
        } else {
            const id = Math.random().toString(36).substr(2, 9);
            updatedAddresses.push({ ...newAddress, id } as Address);
        }

        // Optimistic update
        setAddresses(updatedAddresses);

        // Persist
        try {
            await fetch(`${API_BASE}/address/${user?.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addresses: updatedAddresses })
            });
        } catch (err) {
            console.error("Failed to save address", err);
        }

        setShowAddressModal(false);
        setEditingAddress(null);
        setNewAddress({});
    };

    const handleDeleteAddress = async (id: string) => {
        if (confirm("Are you sure you want to delete this address?")) {
            const updatedAddresses = addresses.filter(addr => addr.id !== id);
            setAddresses(updatedAddresses);
            try {
                await fetch(`${API_BASE}/address/${user?.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ addresses: updatedAddresses })
                });
            } catch (err) {
                console.error("Failed to delete address", err);
            }
        }
    };

    const handleChangePassword = async () => {
        if (newPass !== confirmPass) {
            alert("New passwords do not match");
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, oldPassword, newPassword: newPass })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Password changed successfully");
                setShowPasswordModal(false);
                setOldPassword("");
                setNewPass("");
                setConfirmPass("");
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Failed to change password");
        }
    };

    const openEditAddress = (addr: Address) => {
        setEditingAddress(addr);
        setNewAddress(addr);
        setShowAddressModal(true);
    };

    return (
        <div className="w-full px-1 py-8">
            <div className="flex justify-between items-center mb-8 px-4">
                <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
                <button
                    onClick={() => setShowPasswordModal(true)}
                    className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 font-medium transition-colors"
                >
                    <Lock className="w-4 h-4" />
                    Change Password
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Personal Information */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <User className="w-5 h-5 text-emerald-600" />
                                Personal Details
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-md text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-slate-800 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Email Address</label>
                                <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm truncate font-medium">{user?.email}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 234 567 890"
                                    className="w-full p-3 border border-slate-300 rounded-md text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-slate-800 font-medium"
                                />
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                className="w-full bg-[#065f46] text-white font-bold py-3 rounded-md shadow-md hover:bg-[#047857] transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Check className="w-4 h-4" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Addresses & Orders */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Addresses */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <MapPin className="w-5 h-5 text-emerald-600" />
                                Address Book
                            </h2>
                            <button
                                onClick={() => {
                                    setEditingAddress(null);
                                    setNewAddress({});
                                    setShowAddressModal(true);
                                }}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md"
                            >
                                <Plus className="w-4 h-4" />
                                Add New Address
                            </button>
                        </div>

                        {addresses.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">No addresses saved yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {addresses.map((addr) => (
                                    <div key={addr.id} className="border border-slate-200 rounded-xl p-5 hover:border-emerald-500 hover:shadow-md transition-all relative group bg-slate-50/50">
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditAddress(addr)} className="text-slate-400 hover:text-emerald-600 p-1 hover:bg-white rounded transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteAddress(addr.id)} className="text-slate-400 hover:text-red-600 p-1 hover:bg-white rounded transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${addr.label === 'Home' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {addr.label}
                                            </span>
                                            {addr.isDefault && (
                                                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full">Default</span>
                                            )}
                                        </div>

                                        <p className="font-bold text-slate-800 mb-2">{name}</p>
                                        <div className="text-sm text-slate-600 space-y-1 font-medium">
                                            <p>{addr.street}</p>
                                            <p>{addr.city}, {addr.state} {addr.zip}</p>
                                            <p>{addr.country}</p>
                                            {phone && <p className="mt-3 text-slate-500 pt-2 border-t border-slate-200">Phone: {phone}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Orders */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <Package className="w-5 h-5 text-emerald-600" />
                                Recent Orders
                            </h2>
                        </div>
                        {orders.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">No recent orders found.</div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <div key={order.id} className="border border-slate-100 p-4 rounded-lg flex justify-between items-center group hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">Order #{order.id}</p>
                                            <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">{order.status}</span>
                                        </div>
                                        <div className="text-sm font-bold text-slate-800">
                                            ₹{order.total}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Address Modal */}
            {showAddressModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl p-8 w-full max-w-lg mx-4 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">{editingAddress ? "Edit Address" : "Add New Address"}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Label (e.g. Home, Work)</label>
                                <input
                                    type="text"
                                    value={newAddress.label || ""}
                                    onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Street Address</label>
                                <input
                                    type="text"
                                    value={newAddress.street || ""}
                                    onChange={(e) => setNewAddress(prev => ({ ...prev, street: e.target.value }))}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">City</label>
                                    <input
                                        type="text"
                                        value={newAddress.city || ""}
                                        onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">State</label>
                                    <input
                                        type="text"
                                        value={newAddress.state || ""}
                                        onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">ZIP Code</label>
                                    <input
                                        type="text"
                                        value={newAddress.zip || ""}
                                        onChange={(e) => setNewAddress(prev => ({ ...prev, zip: e.target.value }))}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Country</label>
                                    <input
                                        type="text"
                                        value={newAddress.country || ""}
                                        onChange={(e) => setNewAddress(prev => ({ ...prev, country: e.target.value }))}
                                        className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowAddressModal(false)}
                                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAddress}
                                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all"
                            >
                                Save Address
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">Change Password</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Old Password</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">New Password</label>
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all"
                            >
                                Update Password
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
