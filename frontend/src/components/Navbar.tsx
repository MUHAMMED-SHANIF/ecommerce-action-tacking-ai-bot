"use client";

import Link from "next/link";
import { Search, ShoppingCart, ChevronDown, User, Store, LogOut, Heart, MoreVertical, MessageSquare, Settings, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

export default function Navbar() {
    const [searchTerm, setSearchTerm] = useState("");
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { isDark, toggleTheme } = useTheme();

    // Use useEffect to handle visibility to avoid hydration mismatch
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/seller'))) {
            setIsVisible(false);
        } else {
            setIsVisible(true);
        }
    }, [pathname]);

    if (!isVisible) return null;

    const handleSearch = () => {
        if (searchTerm.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
        }
    };

    return (
        <nav className="sticky top-0 z-50 bg-[#1b5e20] text-white shadow-lg">
            <div className="container mx-auto px-4 max-w-[1248px]">
                <div className="flex items-center gap-8 h-16">
                    {/* Left: Logo & Home Button */}
                    <div className="flex items-center gap-6">
                        {/* Logo */}
                        <Link href="/" className="flex flex-col items-start gap-0.5 group">
                            <div className="flex items-baseline">
                                <span className="text-[22px] font-bold italic tracking-wide text-white">EMart</span>
                                <span className="text-[22px] font-bold italic tracking-wide text-yellow-300">Hub</span>
                            </div>
                        </Link>

                        {/* Home Button */}
                        <Link href="/" className="bg-[#059669] hover:bg-[#144216] p-2 rounded-full transition-colors group" title="Home">
                            <Store className="w-5 h-5 text-white group-hover:text-yellow-200" />
                        </Link>
                    </div>

                    {/* Search Bar (Maximum Width) */}
                    {pathname !== '/search' ? (
                        <div className="flex-1 shadow-md">
                            <div className="relative flex items-center w-full bg-white rounded-md overflow-hidden">
                                <input
                                    type="text"
                                    name="search-query"
                                    autoComplete="off"
                                    placeholder="Search for products, brands and more"
                                    className="w-full py-2.5 px-4 text-sm text-slate-700 focus:outline-none placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={handleSearch}
                                    className="px-5 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center h-full border-l border-slate-100"
                                >
                                    <Search className="w-5 h-5 text-yellow-500" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1"></div>
                    )}

                    {/* Right Section */}
                    <div className="flex items-center gap-8 font-medium text-[15px]">
                        {/* Login/User Button */}
                        <div className="relative group">
                            {user ? (
                                <div className="flex items-center gap-2 cursor-pointer py-2 hover:text-yellow-200 transition-colors">
                                    <div className="flex items-center gap-2 group">
                                        <User className="w-5 h-5" />
                                        <span className="font-semibold max-w-[100px] truncate">
                                            {user.name || user.email?.split('@')[0] || 'User'}
                                        </span>
                                        <ChevronDown className="w-4 h-4 ml-1 group-hover:rotate-180 transition-transform" />
                                    </div>

                                    <div className="hidden group-hover:block absolute top-[100%] right-0 pt-2 z-50">
                                        <div className="bg-white text-slate-800 shadow-xl rounded-md overflow-hidden min-w-[200px] border border-slate-100 ring-1 ring-black/5">
                                            <Link href="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-left transition-colors text-slate-600 hover:text-emerald-700 border-b border-slate-50">
                                                <User className="w-4 h-4" />
                                                My Profile
                                            </Link>

                                            <Link href="/profile?tab=orders" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-left transition-colors text-slate-600 hover:text-emerald-700">
                                                <Store className="w-4 h-4" />
                                                Recent Orders
                                            </Link>

                                            <Link href="/wishlist" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-left transition-colors text-slate-600 hover:text-emerald-700">
                                                <Heart className="w-4 h-4" />
                                                Wishlist
                                            </Link>

                                            <Link href="/profile?tab=password" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-left transition-colors text-slate-600 hover:text-emerald-700 border-b border-slate-50">
                                                <Settings className="w-4 h-4" />
                                                Change Password
                                            </Link>

                                            <button
                                                onClick={() => {
                                                    logout();
                                                }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 w-full text-left text-red-600 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Link href="/login">
                                    <button className="bg-white text-[#1b5e20] px-8 py-1.5 font-bold rounded-sm hover:bg-gray-100 transition-colors shadow-sm whitespace-nowrap">
                                        Login
                                    </button>
                                </Link>
                            )}
                        </div>

                        {/* Wishlist */}
                        <Link href="/wishlist" className="flex items-center gap-2 hover:text-yellow-200 transition-colors">
                            <Heart className="w-5 h-5" />
                            <span>Wishlist</span>
                        </Link>

                        {/* Cart */}
                        <CartLink />

                        {/* Chatbot Icon */}
                        <Link href="/chatbot" className="flex items-center gap-2 hover:text-yellow-200 transition-colors" title="AI Chatbot">
                            <MessageSquare className="w-5 h-5" />
                        </Link>

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors" 
                            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Three Dots Menu for Settings */}
                        <div className="relative group cursor-pointer">
                            <MoreVertical className="w-5 h-5 hover:text-yellow-200 transition-colors" />
                            <div className="hidden group-hover:block absolute top-[100%] right-0 pt-2 z-50">
                                <div className="bg-white text-slate-800 shadow-xl rounded-md overflow-hidden min-w-[200px] border border-slate-100 ring-1 ring-black/5">
                                    <Link href="/seller/register" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-left transition-colors text-slate-600 hover:text-emerald-700 border-b border-slate-50">
                                        <Store className="w-4 h-4" />
                                        Become a Seller
                                    </Link>
                                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 w-full text-left transition-colors text-slate-600 hover:text-emerald-700">
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </Link>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </nav>
    );
}

function CartLink() {
    const { items } = useCart();
    return (
        <Link href="/cart" className="flex items-center gap-2 hover:text-yellow-200 transition-colors">
            <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                {items.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 rounded-full border border-white">
                        {items.length}
                    </span>
                )}
            </div>
            <span>Cart</span>
        </Link>
    );
}
