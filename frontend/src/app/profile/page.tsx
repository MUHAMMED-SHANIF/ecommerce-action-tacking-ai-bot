"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import PersonalDetails from "@/components/profile/PersonalDetails";
import AddressBook from "@/components/profile/AddressBook";
import ChangePassword from "@/components/profile/ChangePassword";
import RecentOrders from "@/components/profile/RecentOrders";
import WishlistSection from "@/components/profile/WishlistSection";

const API_BASE = "http://localhost:5001/api";

export default function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const searchParams = useSearchParams();
    const [activeSection, setActiveSection] = useState("personal");

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) {
            setActiveSection(tab);
        }
    }, [searchParams]);

    const handleSaveProfile = async (name: string, phone: string) => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE}/auth/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, name, phone })
            });

            const data = await res.json();
            if (res.ok) {
                // Update local state immediately
                updateProfile(name, phone);
                alert("Profile updated successfully!");
            } else {
                alert(`Failed to update profile: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Failed to update profile", err);
            alert("Error updating profile (Network/Server)");
        }
    };

    if (!user) {
        return <div className="p-8 text-center">Please login to view your profile.</div>;
    }

    const renderContent = () => {
        switch (activeSection) {
            case "personal":
                return <PersonalDetails user={user} onSave={handleSaveProfile} />;
            case "addresses":
                return <AddressBook user={user} apiBase={API_BASE} />;
            case "password":
                return <ChangePassword user={user} apiBase={API_BASE} />;
            case "orders":
                return <RecentOrders user={user} apiBase={API_BASE} />;
            case "wishlist":
                return <WishlistSection />;
            default:
                return <PersonalDetails user={user} onSave={handleSaveProfile} />;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">My Account</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar - 1/4 width */}
                <div className="lg:w-1/4">
                    <ProfileSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
                </div>

                {/* Content Area - 3/4 width */}
                <div className="lg:w-3/4">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
