"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Store, User, Mail, Lock, Phone, ArrowRight, MapPin, Plus, Trash2, Building, Globe } from "lucide-react";

interface Address {
    building: string;
    street: string;
    city: string;
    zip: string;
    country: string;
}

export default function SellerRegister() {
    const router = useRouter();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    // Address state - Array of objects
    const [addresses, setAddresses] = useState<Address[]>([{
        building: "",
        street: "",
        city: "",
        zip: "",
        country: ""
    }]);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddressChange = (index: number, field: keyof Address, value: string) => {
        const newAddresses = [...addresses];
        newAddresses[index] = { ...newAddresses[index], [field]: value };
        setAddresses(newAddresses);
    };

    const addAddress = () => {
        setAddresses([...addresses, { building: "", street: "", city: "", zip: "", country: "" }]);
    };

    const removeAddress = (index: number) => {
        if (addresses.length > 1) {
            const newAddresses = addresses.filter((_, i) => i !== index);
            setAddresses(newAddresses);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        // Validate Addresses
        const validAddresses = addresses.filter(a => a.street && a.city && a.country);
        if (validAddresses.length === 0) {
            setError("Please provide at least one complete address (Street, City, Country required)");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/auth/register-seller`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    addresses: validAddresses.map(addr => ({
                        id: Date.now().toString() + Math.random(),
                        ...addr
                    }))
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registration failed");
            }

            // Perform login
            const loginSuccess = await login(formData.email, formData.password);

            if (loginSuccess) {
                setTimeout(() => {
                    router.push("/seller/dashboard");
                }, 100);
            } else {
                setError("Account created but auto-login failed. Please login manually.");
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex overflow-hidden">
                {/* Left Side - Banner */}
                <div className="hidden md:flex flex-col justify-center p-12 w-1/2 bg-gradient-to-br from-violet-600 to-indigo-700 text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="relative z-10">
                        <Store className="w-16 h-16 mb-6 text-yellow-300" />
                        <h2 className="text-4xl font-bold mb-6">Welcome to EMart Hub Seller Program</h2>
                        <p className="text-lg text-indigo-100 mb-8 leading-relaxed">
                            Join our vibrant community of sellers. Expand your reach, manage your products efficiently, and grow your business with our powerful tools.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full"><PackageIcon className="w-5 h-5" /></div>
                                <span>Easy Product Management</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full"><TrendingUpIcon className="w-5 h-5" /></div>
                                <span>Real-time Analytics</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full"><HeadphonesIcon className="w-5 h-5" /></div>
                                <span>24/7 Seller Support</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-slate-800">Become a Seller</h1>
                        <p className="text-slate-500 mt-2">Start your journey with us today</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm border border-red-100 flex items-center gap-2">
                            <span>•</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Business Name</label>
                            <div className="relative">
                                <Store className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none"
                                    placeholder="e.g. Tech World Supplies"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Email Address</label>
                            <div className="relative">
                                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Phone Number</label>
                            <div className="relative">
                                <Phone className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none"
                                    placeholder="+1 234 567 890"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Structured Address Section */}
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-slate-700 flex justify-between items-center">
                                Business Address(es)
                                <button type="button" onClick={addAddress} className="text-xs text-violet-600 font-bold hover:underline flex items-center gap-1">
                                    <Plus size={14} /> Add Another
                                </button>
                            </label>
                            {addresses.map((addr, index) => (
                                <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3 relative">
                                    {addresses.length > 1 && (
                                        <button type="button" onClick={() => removeAddress(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                                            <Trash2 size={16} />
                                        </button>
                                    )}

                                    {/* Building & Street relative to each other */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="relative">
                                            <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Build/Apt No."
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 outline-none"
                                                value={addr.building}
                                                onChange={(e) => handleAddressChange(index, 'building', e.target.value)}
                                            />
                                        </div>
                                        <div className="relative">
                                            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Street Address"
                                                required
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 outline-none"
                                                value={addr.street}
                                                onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* City, Zip, Country */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            placeholder="City"
                                            required
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 outline-none"
                                            value={addr.city}
                                            onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Zip"
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 outline-none"
                                            value={addr.zip}
                                            onChange={(e) => handleAddressChange(index, 'zip', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Country"
                                            required
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-violet-500 outline-none"
                                            value={addr.country}
                                            onChange={(e) => handleAddressChange(index, 'country', e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Password</label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Confirm</label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-violet-200 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <span className="animate-pulse">Creating Account...</span>
                            ) : (
                                <>
                                    Create Seller Account <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-slate-500">
                        Already have an account?{" "}
                        <Link href="/login" className="text-violet-600 font-bold hover:underline">
                            Login here
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PackageIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22v-9.3" />
        </svg>
    )
}

function TrendingUpIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    )
}

function HeadphonesIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 14v4c0 1.1.9 2 2 2h2v-8l-2-2Z" />
            <path d="M19 12l-2 2v8h2c1.1 0 2-.9 2-2v-4Z" />
            <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
        </svg>
    )
}
