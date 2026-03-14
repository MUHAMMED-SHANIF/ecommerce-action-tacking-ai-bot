'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout, isLoading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        if (user.role !== 'admin') {
            router.push('/');
        }
    }, [user, isLoading, router]);

    // Close sidebar on path change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!user || user.role !== 'admin') return null;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar (Fixed / Off-canvas) */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md transform transition-transform duration-200 ease-in-out 
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                    md:translate-x-0`}
            >
                <div className="flex items-center justify-between p-6 border-b">
                    <h1 className="text-2xl font-bold text-blue-600">Admin Panel</h1>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-gray-700 md:hidden">
                        <X size={24} />
                    </button>
                </div>
                <nav className="mt-6 px-4">
                    <ul className="space-y-2">
                        <li>
                            <Link href="/admin/dashboard" className={`block px-4 py-2 rounded-lg ${pathname === '/admin/dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/adjust-home" className={`block px-4 py-2 rounded-lg ${pathname === '/admin/adjust-home' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Adjust Home
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/requests" className={`block px-4 py-2 rounded-lg ${pathname === '/admin/requests' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Requests
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/products" className={`block px-4 py-2 rounded-lg ${pathname.startsWith('/admin/products') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Products
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/categories" className={`block px-4 py-2 rounded-lg ${pathname.startsWith('/admin/categories') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Categories
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/suppliers" className={`block px-4 py-2 rounded-lg ${pathname.startsWith('/admin/suppliers') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Suppliers
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/users" className={`block px-4 py-2 rounded-lg ${pathname.startsWith('/admin/users') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Users
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/orders" className={`block px-4 py-2 rounded-lg ${pathname.startsWith('/admin/orders') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Orders
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/banners" className={`block px-4 py-2 rounded-lg ${pathname.startsWith('/admin/banners') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                                Banners
                            </Link>
                        </li>
                    </ul>
                </nav>
                <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
                    <button
                        onClick={() => {
                            logout();
                        }}
                        className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-left font-medium"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Overlay for sidebar (Visible on mobile/tablet when open, HIDDEN on desktop) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-64 transition-all duration-200">
                {/* Top Bar with Burger Button (Visible on ALL screens? No, hide on desktop now that sidebar is perm) */}
                <header className="bg-white shadow-sm border-b p-4 flex items-center md:hidden">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-gray-700 p-2 rounded-md hover:bg-gray-100">
                        <Menu size={24} />
                    </button>
                    <span className="ml-4 font-bold text-gray-700 text-lg">Admin Dashboard</span>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
