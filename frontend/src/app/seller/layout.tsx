'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, LayoutDashboard, Package, ShoppingBag, PlusCircle, Globe, Settings, LogOut, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (pathname === '/seller/register') return; // Skip auth check on register page
        if (isLoading) return; // Wait for auth check

        if (!user) {
            router.push('/login');
            return;
        }

        if (user.role !== 'seller') {
            router.push('/');
        }
    }, [user, isLoading, router, pathname]);

    // Close sidebar on path change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    // Allow public access to register page
    if (pathname === '/seller/register') {
        return <>{children}</>;
    }

    if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!user || user.role !== 'seller') return null;

    const navItems = [
        { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/seller/products', label: 'My Products', icon: Package },
        { href: '/seller/orders', label: 'Orders', icon: ShoppingBag },
        { href: '/seller/requests', label: 'My Requests', icon: FileText },
        { href: '/seller/products/add', label: 'Add Product', icon: PlusCircle },
        { href: '/seller/category-request', label: 'Request Category', icon: Globe },
        { href: '/seller/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0 md:static border-r border-slate-100`}
            >
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                S
                            </div>
                            <span className="text-xl font-bold text-slate-800">Seller Hub</span>
                        </Link>
                        <span className="text-xs text-slate-500 mt-1 truncate max-w-[180px]">
                            {user?.name}
                        </span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <nav className="mt-6 px-3">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                            ? 'bg-violet-50 text-violet-700 font-semibold shadow-sm ring-1 ring-violet-200'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                    >
                                        <Icon size={20} className={isActive ? 'text-violet-600' : 'text-slate-400'} />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="absolute bottom-0 w-64 p-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => {
                            localStorage.removeItem('user');
                            router.push('/login');
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white shadow-sm border-b border-slate-200 p-4 flex items-center justify-between md:hidden">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 p-2 rounded-md hover:bg-slate-100">
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-slate-800">Seller Dashboard</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
