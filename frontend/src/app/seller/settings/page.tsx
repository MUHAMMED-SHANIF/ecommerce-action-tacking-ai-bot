'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Phone, MapPin, Plus, Trash2, Save, Lock } from 'lucide-react';

export default function SellerSettings() {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [addresses, setAddresses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setPhone(user.phone || '');
            fetchAddresses();
        }
    }, [user]);

    const fetchAddresses = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/address/${user?.id}`, { cache: 'no-store' });
            const data = await res.json();
            if (Array.isArray(data)) {
                setAddresses(data);
            }
        } catch (error) {
            console.error('Failed to fetch addresses', error);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/auth/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, name, phone })
            });

            if (res.ok) {
                setMessage('Profile updated successfully');
                // Optimistically update local user data if stored in context/localstorage
                // For now, we rely on page reload or context refresh if implemented
            } else {
                setMessage('Failed to update profile');
            }
        } catch (error) {
            setMessage('Error updating profile');
        } finally {
            setLoading(false);
        }
    };

    const handleAddressChange = (index: number, field: string, value: string) => {
        const newAddresses = [...addresses];
        newAddresses[index] = { ...newAddresses[index], [field]: value };
        setAddresses(newAddresses);
    };

    const addAddress = () => {
        setAddresses([...addresses, { id: Date.now().toString(), street: '', city: '', state: '', zip: '', country: '' }]);
    };

    const removeAddress = (index: number) => {
        const newAddresses = addresses.filter((_, i) => i !== index);
        setAddresses(newAddresses);
    };

    const saveAddresses = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/address/${user?.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addresses })
            });
            if (res.ok) {
                setMessage('Addresses saved successfully');
            } else {
                setMessage('Failed to save addresses');
            }
        } catch (error) {
            setMessage('Error saving addresses');
        } finally {
            setLoading(false);
        }
    };

    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage('New passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, oldPassword: currentPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage('Password changed successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setMessage(data.error || 'Failed to change password');
            }
        } catch (error) {
            setMessage('Error changing password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

            {message && (
                <div className={`p-4 rounded-lg ${message.toLowerCase().includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            {/* Profile Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="text-violet-600" /> Profile Information
                </h2>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full border px-3 py-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full border px-3 py-2 rounded-lg"
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors">
                        Update Profile
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock className="text-violet-600" /> Change Password
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full border px-3 py-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full border px-3 py-2 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full border px-3 py-2 rounded-lg"
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors">
                        Change Password
                    </button>
                </form>
            </div>

            {/* Address Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="text-violet-600" /> Manage Addresses
                    </h2>
                    <button onClick={addAddress} className="text-sm text-violet-600 font-bold hover:underline flex items-center gap-1">
                        <Plus size={16} /> Add New Address
                    </button>
                </div>

                <div className="space-y-4">
                    {addresses.map((addr, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-slate-50 relative group">
                            <button
                                onClick={() => removeAddress(index)}
                                className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={18} />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    placeholder="Street Address"
                                    value={addr.street}
                                    onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                                    className="border px-3 py-2 rounded"
                                />
                                <input
                                    placeholder="City"
                                    value={addr.city}
                                    onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                                    className="border px-3 py-2 rounded"
                                />
                                <input
                                    placeholder="State"
                                    value={addr.state}
                                    onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                                    className="border px-3 py-2 rounded"
                                />
                                <input
                                    placeholder="ZIP Code"
                                    value={addr.zip}
                                    onChange={(e) => handleAddressChange(index, 'zip', e.target.value)}
                                    className="border px-3 py-2 rounded"
                                />
                                <input
                                    placeholder="Country"
                                    value={addr.country}
                                    onChange={(e) => handleAddressChange(index, 'country', e.target.value)}
                                    className="border px-3 py-2 rounded"
                                />
                            </div>
                        </div>
                    ))}

                    {addresses.length === 0 && (
                        <p className="text-slate-500 italic">No addresses added yet.</p>
                    )}

                    <button onClick={saveAddresses} disabled={loading} className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                        <Save size={18} /> Save Addresses
                    </button>
                </div>
            </div>
        </div>
    );
}
