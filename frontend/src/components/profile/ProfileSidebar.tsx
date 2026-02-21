"use client";

import { User, MapPin, Lock, Package, Heart } from "lucide-react";

interface ProfileSidebarProps {
    activeSection: string;
    setActiveSection: (section: string) => void;
}

export default function ProfileSidebar({ activeSection, setActiveSection }: ProfileSidebarProps) {
    const menuItems = [
        { id: "personal", label: "Personal Details", icon: User },
        { id: "addresses", label: "Addresses", icon: MapPin },
        { id: "password", label: "Change Password", icon: Lock },
        { id: "orders", label: "Recent Orders", icon: Package },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h2 className="font-bold text-slate-800">Account Settings</h2>
            </div>
            <nav className="p-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
