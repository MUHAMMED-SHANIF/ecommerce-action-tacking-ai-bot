"use client";

import { useState, useEffect } from "react";
import { MapPin, Plus, Edit2, Trash2 } from "lucide-react";

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

interface AddressBookProps {
    user: any;
    apiBase: string;
}

export default function AddressBook({ user, apiBase }: AddressBookProps) {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [newAddress, setNewAddress] = useState<Partial<Address>>({});

    useEffect(() => {
        if (user) {
            fetch(`${apiBase}/address/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setAddresses(data);
                })
                .catch(err => console.error("Failed to fetch addresses", err));
        }
    }, [user, apiBase]);

    const handleSaveAddress = async () => {
        let updatedAddresses = [...addresses];
        if (editingAddress) {
            updatedAddresses = addresses.map(addr => addr.id === editingAddress.id ? { ...addr, ...newAddress } as Address : addr);
        } else {
            const id = Math.random().toString(36).substr(2, 9);
            updatedAddresses.push({ ...newAddress, id } as Address);
        }

        setAddresses(updatedAddresses);

        try {
            await fetch(`${apiBase}/address/${user?.id}`, {
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
                await fetch(`${apiBase}/address/${user?.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ addresses: updatedAddresses })
                });
            } catch (err) {
                console.error("Failed to delete address", err);
            }
        }
    };

    const openEditAddress = (addr: Address) => {
        setEditingAddress(addr);
        setNewAddress(addr);
        setShowAddressModal(true);
    };

    return (
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
                    {addresses.map((addr, idx) => (
                        <div key={addr.id || idx} className="border border-slate-200 rounded-xl p-5 hover:border-emerald-500 hover:shadow-md transition-all relative group bg-slate-50/50">
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

                            <p className="font-bold text-slate-800 mb-2">{user.name}</p>
                            <div className="text-sm text-slate-600 space-y-1 font-medium">
                                <p>{addr.street}</p>
                                <p>{addr.city}, {addr.state} {addr.zip}</p>
                                <p>{addr.country}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
        </div>
    );
}
