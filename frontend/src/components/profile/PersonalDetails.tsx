"use client";

import { useState } from "react";
import { User, Mail, Check } from "lucide-react";

interface PersonalDetailsProps {
    user: any;
    onSave: (name: string, phone: string) => Promise<void>;
}

export default function PersonalDetails({ user, onSave }: PersonalDetailsProps) {
    const [name, setName] = useState(user?.name || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        await onSave(name, phone);
        setLoading(false);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <User className="w-5 h-5 text-emerald-600" />
                    Personal Details
                </h2>
            </div>

            <div className="space-y-6 max-w-lg">
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
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-[#0B3D2E] text-white font-bold py-3 rounded-md shadow-md hover:bg-[#145A3A] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                >
                    <Check className="w-4 h-4" />
                    {loading ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
