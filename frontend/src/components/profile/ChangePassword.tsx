"use client";

import { useState } from "react";
import { Lock, Check } from "lucide-react";

interface ChangePasswordProps {
    user: any;
    apiBase: string;
}

export default function ChangePassword({ user, apiBase }: ChangePasswordProps) {
    const [oldPassword, setOldPassword] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (newPass !== confirmPass) {
            alert("New passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, oldPassword, newPassword: newPass })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Password changed successfully");
                setOldPassword("");
                setNewPass("");
                setConfirmPass("");
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <Lock className="w-5 h-5 text-emerald-600" />
                    Change Password
                </h2>
            </div>

            <div className="space-y-4 max-w-lg">
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Current Password</label>
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

                <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="w-full bg-[#1b5e20] text-white font-bold py-3 rounded-md shadow-md hover:bg-[#144216] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                >
                    <Check className="w-4 h-4" />
                    {loading ? "Updating..." : "Update Password"}
                </button>
            </div>
        </div>
    );
}
